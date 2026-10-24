#!/usr/bin/env node
// verify-all.mjs -- the one-command gauntlet for the shared branch.
//
// Runs the complete verification surface that every session relies on:
//   - 7 Node batteries (plugin, e2e, mcp sweep, mcp tools, core-noext, mimo ext, tui)
//   - 5 Go suites (httpapi, tools, memorystore, repograph, mcp)
//   - kernel crash-log check (must be empty)
//
// Any harness agent on this branch should be able to run `node bin/verify-all.mjs`
// and get one authoritative PASS/FAIL summary. Exit code 0 = everything green.
//
// Usage:
//   node bin/verify-all.mjs              # full gauntlet (slow: httpapi suite ~15m under load)
//   node bin/verify-all.mjs --fast       # skip Go suites and the e2e battery
//   node bin/verify-all.mjs --only=batteries

import { spawnSync } from "node:child_process";
import { existsSync, statSync, mkdirSync, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const fast = args.includes("--fast");
const only = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "";

const LOG_DIR = path.join(root, "bin", "_verify-logs");
mkdirSync(LOG_DIR, { recursive: true });

const batteries = [
  { id: "ext", cmd: "node", args: ["bin/test-opencode-ext.mjs"] },
  { id: "e2e", cmd: "node", args: ["bin/test-opencode-e2e.mjs"], slow: true },
  { id: "reality", cmd: "node", args: ["bin/test-reality.mjs"] },
  { id: "sweep", cmd: "node", args: ["bin/test-mcp-sweep.mjs"] },
  { id: "mcp", cmd: "node", args: ["bin/test-mcp-tools.mjs"] },
  { id: "core", cmd: "node", args: ["bin/test-core-noext.mjs"] },
  { id: "mimo", cmd: "node", args: ["bin/test-extensions.mjs"] },
  { id: "tui", cmd: "node", args: ["bin/test-tui.mjs"] },
  { id: "drift", cmd: "node", args: ["bin/test-drift.mjs"] },
];

const goSuites = [
  // httpapi needs 30m: each test spins a full kernel whose background services
  // (mesh/gossip/A2A/supervisor loops) are never stopped, ~45k goroutines
  // accumulate per run (lesson from the sibling agent, 2026-10-21).
  { id: "go-all", cmd: "go", args: ["test", "-timeout", "30m", "./internal/httpapi/", "./internal/tools/", "./internal/memorystore/", "./internal/repograph/", "./internal/mcp/"], cwd: path.join(root, "go") },
];

function run(step) {
  const logFile = path.join(LOG_DIR, `${step.id}.log`);
  const out = createWriteStream(logFile);
  process.stdout.write(`\n=== ${step.id} (${step.cmd} ${step.args.join(" ")}) ===\n`);
  const started = Date.now();
  const res = spawnSync(step.cmd, step.args, {
    cwd: step.cwd || root,
    encoding: "utf8",
    shell: process.platform === "win32", // go/node shims on Windows
    maxBuffer: 64 * 1024 * 1024,
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(0);
  const text = `${res.stdout || ""}${res.stderr || ""}`;
  out.write(text);
  out.end();
  // Surface only the summary lines to the console -- keep output compact.
  const summaryLines = text
    .split(/\r?\n/)
    .filter((l) => /SUMMARY|FAIL|--- FAIL|^ok\s|panic:|fatal error/.test(l))
    .slice(0, 12);
  for (const l of summaryLines) process.stdout.write(`  ${l.trim()}\n`);
  return { id: step.id, code: res.status ?? 1, elapsed, log: logFile, summaryLines };
}

const results = [];

const runBatteries = only !== "go" && (!only || only === "batteries");
const runGo = !fast && only !== "batteries";

if (runBatteries) {
  for (const b of batteries) {
    if (fast && b.slow) {
      process.stdout.write(`\n=== ${b.id} (skipped: --fast) ===\n`);
      continue;
    }
    results.push(run(b));
  }
}

if (runGo) {
  for (const g of goSuites) results.push(run(g));
}

// Crash log must be empty (any content = a kernel fatal was captured).
const crashPath = path.join(root, ".hypernexus", "kernel-crash.log");
const crashBytes = existsSync(crashPath) ? statSync(crashPath).size : 0;
const crashOk = crashBytes === 0;

process.stdout.write("\n================ VERIFICATION SUMMARY ================\n");
let failed = 0;
for (const r of results) {
  const ok = r.code === 0;
  if (!ok) failed++;
  process.stdout.write(`  ${ok ? "PASS" : "FAIL"}  ${r.id.padEnd(8)} exit=${r.code} (${r.elapsed}s)  log=${path.relative(root, r.log)}\n`);
}
process.stdout.write(`  ${crashOk ? "PASS" : "FAIL"}  crashlog   ${crashBytes} bytes (must be 0)\n`);
if (!crashOk) failed++;

const total = results.length + 1;
process.stdout.write(`=====================================================\n`);
process.stdout.write(failed === 0 ? `ALL GREEN: ${total}/${total} steps\n` : `${failed} of ${total} steps FAILED\n`);
process.exit(failed === 0 ? 0 : 1);
