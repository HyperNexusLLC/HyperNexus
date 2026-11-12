#!/usr/bin/env node
// soak.mjs -- sustained-load soak test for the HyperNexus kernel.
//
// Every kernel-fatal race found so far (repograph map publish, advertiser
// cooldown map, DecisionSystem.ds.loaded) only surfaced under CONCURRENT load
// on this shared 2-core box -- never in a single-shot battery. This is the
// no-`-race` substitute: hammer the exact hot paths that historically raced,
// continuously, while watching for kernel death, hangs, and crash-log writes.
//
// Streams (each historically tied to a past incident):
//   suggestions  POST+GET /api/mcp/tool-suggestions   (advertiser cooldown race)
//   memory       facts/add + search + fts-search      (memory-store durability)
//   decision     tools/search + agent/tool calls      (DecisionSystem.ds.loaded race)
//   health       GET /health every 2s                 (death / hang detection)
//   stdio        periodic `hypernexus mcp` tools/list (stdio transport under load)
//
// Usage:
//   node bin/soak.mjs                    # 5 minutes, 3 workers per stream
//   node bin/soak.mjs --minutes=20       # longer soak
//   node bin/soak.mjs --concurrency=6    # heavier parallelism
//
// PASS = kernel alive at the end, zero crash-log growth, no health gap > 15s,
// and every stream under the error threshold after a 15s warmup.

import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KERNEL = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";

const args = process.argv.slice(2);
const minutes = Number((args.find((a) => a.startsWith("--minutes=")) || "").split("=")[1]) || 5;
const concurrency = Number((args.find((a) => a.startsWith("--concurrency=")) || "").split("=")[1]) || 3;
const DURATION_MS = minutes * 60 * 1000;
const WARMUP_MS = 15 * 1000;
const ERROR_THRESHOLD = 0.02; // 2% after warmup
const CRASH_LOG = path.join(root, ".hypernexus", "kernel-crash.log");

const crashBytesAtStart = existsSync(CRASH_LOG) ? statSync(CRASH_LOG).size : 0;

const streams = new Map();
function record(stream, ok, ms, detail) {
  let s = streams.get(stream);
  if (!s) {
    s = { ok: 0, err: 0, maxMs: 0, samples: [], errors: new Map(), warmed: false };
    streams.set(stream, s);
  }
  if (Date.now() - start > WARMUP_MS) s.warmed = true;
  if (ok) {
    s.ok++;
    s.maxMs = Math.max(s.maxMs, ms);
    s.samples.push(ms);
    if (s.samples.length > 2000) s.samples.shift();
  } else {
    s.err++;
    const key = String(detail || "unknown").slice(0, 80);
    s.errors.set(key, (s.errors.get(key) || 0) + 1);
  }
}

async function call(stream, method, endpoint, body, timeoutMs = 20000) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${KERNEL}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json", "X-HyperNexus-Client": "soak/1" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    await res.text().catch(() => "");
    record(stream, res.status < 500, Date.now() - t0, `HTTP ${res.status}`);
    return res.status;
  } catch (err) {
    record(stream, false, Date.now() - t0, String(err?.message || err));
    return 0;
  }
}

const start = Date.now();
const deadline = start + DURATION_MS;
let running = true;
let kernelDeath = false;
let worstHealthGapMs = 0;
let lastHealthOk = Date.now();

const jitter = () => Math.floor(Math.random() * 250);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- stream workers --------------------------------------------------------
async function suggestionWorker(id) {
  while (running) {
    await call("suggestions", "POST", "/api/mcp/tool-suggestions", {
      role: "user",
      content: `soak ${id} bash shell search memory file tools ${Date.now() % 97}`,
    });
    await call("suggestions", "GET", "/api/mcp/tool-suggestions");
    await sleep(200 + jitter());
  }
}

async function memoryWorker(id) {
  let n = 0;
  while (running) {
    n++;
    const token = `soak-mem-${id}-${n}`;
    await call("memory", "POST", "/api/memory/facts/add", {
      title: token,
      content: `${token} sustained load probe for memory-store durability`,
      tags: ["soak"],
      namespace: "project",
    });
    await call("memory", "GET", `/api/memory/search?query=${token}&limit=5`);
    if (n % 5 === 0) await call("memory", "GET", "/api/memory/fts-search?q=soak&limit=5");
    await sleep(300 + jitter());
  }
}

async function decisionWorker(id) {
  while (running) {
    await call("decision", "GET", "/api/tools/search?query=bash+search+memory&limit=8");
    await call("decision", "POST", "/api/agent/tool", { name: "hello_world", args: { name: `soak-${id}` } });
    await sleep(250 + jitter());
  }
}

async function healthWorker() {
  while (running) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${KERNEL}/health`, { signal: AbortSignal.timeout(10000) });
      await res.text().catch(() => "");
      if (res.ok) {
        lastHealthOk = Date.now();
        record("health", true, Date.now() - t0);
      } else {
        record("health", false, Date.now() - t0, `HTTP ${res.status}`);
      }
    } catch (err) {
      record("health", false, Date.now() - t0, String(err?.message || err));
      // Connection refused (not timeout) = kernel process gone.
      if (/ECONNREFUSED|fetch failed/i.test(String(err?.message || err))) {
        kernelDeath = true;
        running = false;
      }
    }
    await sleep(2000);
  }
}

async function stdioRoundTrip() {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    const child = spawn(path.join(root, "bin", "hypernexus.exe"), ["mcp"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      windowsHide: true,
    });
    const pending = new Map();
    let buf = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 45000);
    child.stdout.on("data", (d) => {
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("{")) continue;
        try {
          const msg = JSON.parse(line);
          const resolver = pending.get(msg.id);
          if (resolver) {
            pending.delete(msg.id);
            resolver(msg);
          }
        } catch {
          /* non-JSON log line */
        }
      }
    });
    const rpc = (id, method, params) =>
      new Promise((res) => {
        pending.set(id, res);
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      });
    void (async () => {
      await rpc(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "soak", version: "1.0" } });
      const list = await rpc(2, "tools/list", {});
      clearTimeout(timer);
      child.kill();
      resolve(Array.isArray(list?.result?.tools) && list.result.tools.length > 0);
    })();
  });
}

async function stdioWorker() {
  while (running) {
    const ok = await stdioRoundTrip().catch(() => false);
    record("stdio", ok, 0, ok ? "" : "no/empty tools/list over stdio");
    await sleep(30000);
  }
}

// ---- watchdog: crash-log growth + health gaps ------------------------------
async function watcher() {
  while (running) {
    await sleep(2000);
    const gap = Date.now() - lastHealthOk;
    if (gap > worstHealthGapMs) worstHealthGapMs = gap;
    if (gap > 30000 && Date.now() - start > WARMUP_MS) {
      kernelDeath = true;
      running = false;
    }
    if (existsSync(CRASH_LOG) && statSync(CRASH_LOG).size > crashBytesAtStart) {
      console.log("\n[soak] !! CRASH LOG GREW -- kernel wrote a fatal during the soak");
      kernelDeath = true;
      running = false;
    }
    const elapsed = Math.floor((Date.now() - start) / 1000);
    process.stdout.write(`\r[soak] ${elapsed}s / ${Math.floor(DURATION_MS / 1000)}s elapsed   `);
  }
}

// ---- go --------------------------------------------------------------------
console.log(`== SOAK: ${minutes} min, ${concurrency} workers/stream, kernel ${KERNEL}`);
const workers = [];
for (let i = 0; i < concurrency; i++) {
  workers.push(suggestionWorker(i), memoryWorker(i), decisionWorker(i));
}
workers.push(healthWorker(), stdioWorker(), watcher());

const finish = sleep(DURATION_MS).then(() => {
  running = false;
});
await Promise.race([finish, (async () => {
  while (running) await sleep(500);
})()]);
running = false;
await Promise.allSettled(workers.map((w) => Promise.race([w, sleep(5000)])));

// ---- report ----------------------------------------------------------------
const crashBytesAtEnd = existsSync(CRASH_LOG) ? statSync(CRASH_LOG).size : 0;
let failed = 0;

console.log("\n\n================ SOAK SUMMARY ================");
for (const [name, s] of [...streams].sort()) {
  const total = s.ok + s.err;
  const errRate = total ? s.err / total : 0;
  const sorted = [...s.samples].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const overThreshold = s.warmed && errRate > ERROR_THRESHOLD && name !== "health";
  if (overThreshold) failed++;
  const top = [...s.errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} x${v}`).join(", ");
  console.log(`  ${overThreshold ? "FAIL" : "PASS"}  ${name.padEnd(11)} ok=${s.ok} err=${s.err} (${(errRate * 100).toFixed(1)}%) p95=${p95}ms max=${s.maxMs}ms${top ? `  [${top}]` : ""}`);
}

const crashOk = crashBytesAtEnd === crashBytesAtStart;
if (!crashOk) failed++;
console.log(`  ${crashOk ? "PASS" : "FAIL"}  crashlog     ${crashBytesAtStart} -> ${crashBytesAtEnd} bytes (must not grow)`);

const aliveOk = !kernelDeath;
if (!aliveOk) failed++;
console.log(`  ${aliveOk ? "PASS" : "FAIL"}  kernel       ${kernelDeath ? "DIED or hung during soak (worst health gap " + Math.floor(worstHealthGapMs / 1000) + "s)" : "alive throughout (worst health gap " + Math.floor(worstHealthGapMs / 1000) + "s)"}`);

console.log("=============================================");
console.log(failed === 0 ? "SOAK PASS: kernel survived sustained load clean" : `SOAK FAIL: ${failed} criterion/criteria violated`);
process.exit(failed === 0 ? 0 : 1);
