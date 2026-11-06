#!/usr/bin/env node
// test-session-bus.mjs -- session-bus + cdp-bridge battery: hermetic checks
// always run; the live kernel round-trip runs only when /health answers, and
// is reported as SKIP-LIVE (not a pass) when the kernel is saturated/down.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "..");
const BUS = path.join(SHARED, "session-bus.mjs");
const CDP = path.join(SHARED, "cdp-bridge.mjs");
let passed = 0;
function check(name, run) { run(); passed += 1; process.stdout.write(`PASS ${name}\n`); }
function run(script, args, env) {
  // Bus ops retry twice at HN_TIMEOUT_MS each; the spawn budget must cover
  // both tries plus search latency on a saturated box.
  const spawnTimeout = Number(process.env.HN_TIMEOUT_MS || 45000) * 4 + 300000;
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: spawnTimeout, env: { ...process.env, ...(env || {}) } });
}
const src = (p) => fs.readFileSync(p, "utf8");

check("bus prints usage without args", () => {
  const r = run(BUS, []);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /session-bus\.mjs register/);
});
check("bus validates required flags", () => {
  assert.match(run(BUS, ["register", "--id", "s1"]).stderr, /--harness/);
  assert.match(run(BUS, ["send", "--from", "a", "--to", "b"]).stderr, /--text/);
  assert.match(run(BUS, ["inbox"]).stderr, /--id/);
  assert.match(run(BUS, ["reply", "--from", "a", "--to", "b", "--text", "x", "--status", "MAYBE"]).stderr, /DONE\|BLOCKED\|INFO/);
});
check("bus defaults to scratchpad transport with watcher", () => {
  const body = src(BUS);
  assert.match(body, /\/api\/memory\/scratchpad\/set/);
  assert.match(body, /\/api\/memory\/scratchpad\/get/);
  assert.match(body, /bus:msg:/);
  assert.match(body, /bus:out:/);
  assert.match(body, /bus:reg:/);
  assert.match(body, /cmdWatch/);
});
check("bus uses kernel memory facts transport", () => {
  const body = src(BUS);
  assert.match(body, /\/api\/memory\/facts\/add/);
  assert.match(body, /\/api\/memory\/search/);
  assert.match(body, /\[bus-msg\]/);
  assert.match(body, /\[bus-out\]/);
  assert.match(body, /\[session-bus\] register/);
});
check("cdp-bridge prints usage without args", () => {
  const r = run(CDP, []);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /cdp-bridge\.mjs tabs/);
});
check("cdp-bridge validates target", () => {
  assert.match(run(CDP, ["read"]).stderr, /--target/);
  assert.match(run(CDP, ["send", "--target", "other", "--text", "x"]).stderr, /muse\|gemini/);
});
check("neither driver defines shell tool names or descriptions", () => {
  assert.doesNotMatch(src(BUS), /"name"\s*:\s*"(bash|powershell)"/);
  assert.doesNotMatch(src(CDP), /"name"\s*:\s*"(bash|powershell)"/);
});

async function kernelHealthy() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch((process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778") + "/health", { signal: ctrl.signal });
    clearTimeout(t);
    return r.status === 200;
  } catch { return false; }
}

if (!(await kernelHealthy())) {
  process.stdout.write("SKIP-LIVE kernel /health not answering (saturated or down); live round-trip not run\n");
} else {
  const me = "bus-selftest-" + Date.now().toString(36);
  const peer = me + "-peer";
  let r = run(BUS, ["register", "--id", me, "--harness", "test", "--transport", "bus"]);
  assert.equal(r.status, 0, r.stderr);
  r = run(BUS, ["send", "--from", peer, "--to", me, "--text", "bus self-test ping"]);
  assert.equal(r.status, 0, r.stderr);
  const msg = JSON.parse(r.stdout).msg;
  process.stdout.write(`  info sent ${msg}\n`);
  r = run(BUS, ["inbox", "--id", me]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).messages.some((m) => m.msg === msg), "ping not in inbox");
  passed += 1; process.stdout.write("PASS live send -> inbox\n");
  r = run(BUS, ["reply", "--from", me, "--to", peer, "--in-reply-to", msg, "--text", "pong", "--status", "DONE"]);
  assert.equal(r.status, 0, r.stderr);
  r = run(BUS, ["inbox", "--id", me]);
  assert.ok(!JSON.parse(r.stdout).messages.some((m) => m.msg === msg), "ping still pending after reply");
  passed += 1; process.stdout.write("PASS live reply clears inbox\n");
  r = run(BUS, ["thread", "--id", me]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).entries >= 2, "thread missing entries");
  passed += 1; process.stdout.write("PASS live thread shows in+out\n");
  r = run(BUS, ["sessions"]);
  assert.ok(JSON.parse(r.stdout).sessions.some((s) => s.id === me), "session not registered");
  passed += 1; process.stdout.write("PASS live sessions lists registry\n");
}

process.stdout.write(`\n${passed} hermetic+live checks passed\n`);
