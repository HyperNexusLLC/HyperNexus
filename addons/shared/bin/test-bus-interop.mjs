#!/usr/bin/env node
// test-bus-interop.mjs -- cross-driver interop: codex-gui swarm.mjs (assign/
// report) and shared session-bus.mjs (register/send/reply) share one kernel
// memory substrate (facts + scratchpad). This battery drives ONE worker id
// through both drivers and asserts each side's records are visible on the
// shared store the other driver reads from. Live-only: needs kernel :7778.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SWARM = path.join(HERE, "..", "..", "codex-gui", "swarm.mjs");
const BUS = path.join(HERE, "..", "session-bus.mjs");
const BASE = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
const TOKEN = "XOP-" + Date.now().toString(36);
const WORKER = "xop-worker-" + TOKEN.slice(4);
const LEADER = "xop-leader-" + TOKEN.slice(4);
let passed = 0, failed = 0;
const check = (name, fn) => { try { fn(); passed++; console.log("ok -", name); } catch (e) { failed++; console.log("FAIL -", name, "-", e.message); } };
const assert = (c, m) => { if (!c) throw new Error(m || "assert"); };
function run(file, args) {
  try { return { status: 0, out: execFileSync("node", [file, ...args], { encoding: "utf8", timeout: 120000 }) }; }
  catch (e) { return { status: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
}
async function fts(q) {
  const r = await fetch(BASE + "/api/memory/fts-search?q=" + encodeURIComponent(q) + "&limit=10");
  assert(r.ok, "fts " + r.status);
  return JSON.stringify(await r.json());
}

const health = await fetch(BASE + "/health").then((r) => r.ok).catch(() => false);
assert(health, "kernel not reachable at " + BASE);

check("session-bus register worker + leader", () => {
  assert(run(BUS, ["register", "--id", WORKER, "--harness", "interop-test"]).status === 0, "worker register");
  assert(run(BUS, ["register", "--id", LEADER, "--harness", "interop-test"]).status === 0, "leader register");
});
let taskId = null;
check("swarm assign to bus-registered worker", () => {
  const r = run(SWARM, ["assign", "--worker", WORKER, "--goal", TOKEN + " cross-driver probe"]);
  assert(r.status === 0, r.out.slice(0, 200));
  const m = r.out.match(/task[^a-z0-9]*([a-z0-9-]{6,})/i);
  taskId = m ? m[1] : null;
});
check("swarm inbox sees the assignment", () => {
  const r = run(SWARM, ["inbox", "--worker", WORKER]);
  assert(r.status === 0 && r.out.includes(TOKEN), r.out.slice(0, 200));
});
check("session-bus send leader->worker, bus inbox sees it", () => {
  assert(run(BUS, ["send", "--from", LEADER, "--to", WORKER, "--text", TOKEN + " bus hello"]).status === 0, "send");
  const r = run(BUS, ["inbox", "--id", WORKER]);
  assert(r.status === 0 && r.out.includes(TOKEN), r.out.slice(0, 200));
});
// async checks run after sync ones (FTS uses the token alone: brackets are
// query syntax, not literal text, in the kernel FTS index)
const a = await fts(TOKEN.split("-").pop()).catch(() => "");
check("cross: swarm record findable via shared FTS (bus read path)", () => assert(a.includes("[swarm-task]") || a.includes("[swarm-report]"), "swarm record not in FTS"));
const scratch = await fetch(BASE + "/api/memory/scratchpad/get").then((r) => r.json()).then((j) => JSON.stringify(j)).catch(() => "");
check("cross: bus-msg on shared scratchpad store (swarm report read path)", () => assert(scratch.includes("bus:msg:") && scratch.includes(TOKEN), "bus msg not in scratchpad"));
check("swarm report DONE from worker", () => {
  assert(taskId, "no task id from assign");
  const r = run(SWARM, ["report", "--worker", WORKER, "--task", taskId, "--status", "DONE", "--summary", TOKEN + " done"]);
  assert(r.status === 0, r.out.slice(0, 200));
});
console.log(`\nbus-interop: ${passed} passed, ${failed} failed (token ${TOKEN})`);
process.exit(failed ? 1 : 0);
