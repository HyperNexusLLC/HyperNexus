#!/usr/bin/env node
/**
 * swarm.mjs -- HyperNexus swarm bus for Codex GUI sessions.
 * ==========================================================
 * Direct session-driving API where the app offers no thread API: the LEADER
 * assigns subtasks and workers report back through kernel memory facts, so any
 * session (leader or worker) can dispatch/collect programmatically instead of
 * relying solely on in-thread messages.
 *
 *   node swarm.mjs assign --worker <thread-id> --goal "..." [--files "..."] [--criteria "..."]
 *   node swarm.mjs inbox --worker <thread-id>            # pending tasks for one worker
 *   node swarm.mjs report --worker <thread-id> --task <task-id> --status DONE|BLOCKED [--summary "..."] [--files "..."]
 *   node swarm.mjs roster [--worker <thread-id>]         # leader collect view
 *   node swarm.mjs watch --task <task-id> [--worker <thread-id>] [--timeout-ms 120000]
 *
 * Conventions: task facts titled `[swarm-task] <taskId> -> <workerId>`,
 * reports titled `[swarm-report] <taskId> <STATUS>`; tags always include
 * `swarm,codex-gui` plus `swarm-task|swarm-report`. Facts are append-only
 * (no kernel update/delete for facts) -- a report supersedes its task.
 * Shell-equivalent work stays on parity tools (Meta 403 guard); this driver
 * defines no shell tool names or descriptions.
 *
 * Env: HYPERNEXUS_URL (default http://127.0.0.1:7778), HN_TIMEOUT_MS (default 45000).
 * Node stdlib only. Prints JSON to stdout; errors to stderr with exit 1.
 */
const BASE = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/$/, "");
const TIMEOUT = Number(process.env.HN_TIMEOUT_MS || 45000);
const TAGS = ["swarm", "codex-gui"];

function usage() {
  return [
    "usage:",
    "  node swarm.mjs assign --worker <thread-id> --goal \"...\" [--files \"...\"] [--criteria \"...\"]",
    "  node swarm.mjs inbox --worker <thread-id>",
    "  node swarm.mjs report --worker <thread-id> --task <task-id> --status DONE|BLOCKED [--summary \"...\"] [--files \"...\"]",
    "  node swarm.mjs roster [--worker <thread-id>]",
    "  node swarm.mjs watch --task <task-id> [--worker <thread-id>] [--timeout-ms 120000]",
  ].join("\n");
}
function fail(msg) { process.stderr.write(`[swarm] FAIL: ${msg}\n`); process.exit(1); }
function out(obj) { process.stdout.write(JSON.stringify(obj, null, 2) + "\n"); }
function opt(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
async function req(method, path, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(BASE + path, {
      method, signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
    return { status: r.status, data };
  } catch (e) {
    return { status: 0, data: { error: `kernel unreachable: ${e.message}` } };
  } finally { clearTimeout(t); }
}
function itemsOf(payload) {
  if (!payload || typeof payload !== "object") return [];
  const d = payload.data !== undefined ? payload.data : payload;
  for (const k of ["results", "facts", "memories", "items", "data","hits"]) {
    if (Array.isArray(d?.[k])) return d[k];
  }
  if (Array.isArray(d)) return d;
  return [];
}
function strOf(f, keys) {
  for (const k of keys) {
    const v = f?.[k];
    if (typeof v === "string" && v) return v;
  }
  return "";
}
function isTask(f) { return strOf(f, ["title", "name"]).startsWith("[swarm-task]"); }
function isReport(f) { return strOf(f, ["title", "name"]).startsWith("[swarm-report]"); }
function taskIdOf(f) {
  const m = /^\[swarm-(?:task|report)\]\s+(\S+)/.exec(strOf(f, ["title", "name"]));
  return m ? m[1] : null;
}
function ftsTitle(tags) {
  const m = /title=(.*?)(?:\s+\w+=|$)/.exec(tags || "");
  return m ? m[1].trim() : "";
}
function normalizeFts(items) {
  return (items || []).map(function (h) {
    if (h && h.record) {
      return { title: ftsTitle(h.record.tags), content: h.record.content, id: h.record.id, tags: h.record.tags, score: h.score };
    }
    return h;
  });
}
async function search(q, limit) {
  const simple = q.replace(/[^a-zA-Z0-9 _-]/g, " ").replace(/\s+/g, " ").trim();
  const f = await req("GET", "/api/memory/fts-search?q=" + encodeURIComponent(simple) + "&limit=" + (limit || 50));
  let ftsHits = [];
  if (f.status === 200) ftsHits = normalizeFts(itemsOf(f)).filter(function (x) { return isTask(x) || isReport(x); });
  let last = null;
  let semHits = [];
  for (let n = 0; n < 3; n++) {
    const r = await req("GET", "/api/memory/search?q=" + encodeURIComponent(simple) + "&limit=" + (limit || 50));
    if (r.status === 200) { semHits = itemsOf(r); break; }
    last = r;
    await new Promise(function (s) { setTimeout(s, 2000 * (n + 1)); });
  }
  if (!ftsHits.length && !semHits.length) fail("memory search failed after 3 tries (HTTP " + (last ? last.status : "n/a") + "): " + JSON.stringify(last ? last.data : null).slice(0, 200));
  const seen = new Set();
  return ftsHits.concat(semHits).filter(function (x) { const k = taskIdOf(x) || JSON.stringify(x).slice(0, 120); if (seen.has(k)) return false; seen.add(k); return true; });
}
async function storeFact(body, what) {
  let last = null;
  for (let n = 0; n < 2; n++) {
    const r = await req("POST", "/api/memory/facts/add", body);
    if (r.status === 200 || r.status === 201) return r;
    last = r;
    await new Promise(function (s) { setTimeout(s, 3000); });
  }
  // Slow-box tolerance (shared-bus pattern): a timed-out write may still
  // land server-side — verify by exact title before failing.
  const title = body && body.title;
  if (title) {
    for (let n = 0; n < 3; n++) {
      await new Promise(function (s) { setTimeout(s, 15000); });
      const v = await req("GET", "/api/memory/search?q=" + encodeURIComponent(title) + "&limit=5");
      const items = itemsOf(v.data);
      if (items.some((f) => strOf(f, ["title", "name"]) === title)) return { status: 200, data: { verified: "landing" } };
    }
  }
  fail(what + " store failed after 2 tries (HTTP " + last.status + "): " + JSON.stringify(last.data).slice(0, 200));
}
async function cmdAssign() {
  const worker = opt("--worker");
  const goal = opt("--goal");
  if (!worker) fail("assign needs --worker <thread-id>");
  if (!goal) fail("assign needs --goal \"...\"");
  const taskId = "sw-" + Date.now().toString(36);
  const content = [
    `worker: ${worker}`, `task: ${taskId}`, "status: assigned",
    `goal: ${goal}`, `files: ${opt("--files") || "(none)"}`,
    `criteria: ${opt("--criteria") || "report STATUS: DONE with changed files + verification"}`,
  ].join("\n");
  await storeFact({
    title: `[swarm-task] ${taskId} -> ${worker}`, content,
    tags: [...TAGS, "swarm-task"], category: "swarm-task",
  }, "assign");
  out({ ok: true, task: taskId, worker, goal });
}
async function pendingFor(workerShort) {
  const [tasks, reports] = await Promise.all([
    search(`[swarm-task] ${workerShort}`, 50), search(`[swarm-report] ${workerShort}`, 50),
  ]);
  const reported = new Set(reports.filter(isReport).map(taskIdOf).filter(Boolean));
  return tasks.filter(isTask).filter((t) => !reported.has(taskIdOf(t)));
}
async function cmdInbox() {
  const worker = opt("--worker");
  if (!worker) fail("inbox needs --worker <thread-id>");
  const pending = await pendingFor(worker.slice(0, 8));
  out({
    ok: true, worker, pending: pending.length,
    tasks: pending.map((t) => ({ task: taskIdOf(t), title: strOf(t, ["title", "name"]), content: strOf(t, ["content", "text", "snippet"]) })),
  });
}
async function cmdReport() {
  const worker = opt("--worker");
  const task = opt("--task");
  const status = opt("--status");
  if (!worker) fail("report needs --worker <thread-id>");
  if (!task) fail("report needs --task <task-id>");
  if (status !== "DONE" && status !== "BLOCKED") fail("report needs --status DONE|BLOCKED");
  const content = [
    `worker: ${worker}`, `task: ${task}`, `status: ${status}`,
    `summary: ${opt("--summary") || "(none)"}`, `files: ${opt("--files") || "(none)"}`,
  ].join("\n");
  await storeFact({
    title: `[swarm-report] ${task} ${status}`, content,
    tags: [...TAGS, "swarm-report"], category: "swarm-report",
  }, "report");
  out({ ok: true, task, worker, status });
}
async function cmdRoster() {
  const worker = opt("--worker");
  const q = worker ? `[swarm-task] ${worker.slice(0, 8)}` : "[swarm-task]";
  const [tasks, reports] = await Promise.all([search(q, 50), search(worker ? `[swarm-report] ${worker.slice(0, 8)}` : "[swarm-report]", 50)]);
  const byTask = new Map();
  for (const r of reports.filter(isReport)) {
    const id = taskIdOf(r);
    if (id && !byTask.has(id)) byTask.set(id, r);
  }
  out({
    ok: true, open: tasks.filter(isTask).filter((t) => !byTask.has(taskIdOf(t))).length,
    roster: tasks.filter(isTask).map((t) => {
      const id = taskIdOf(t);
      const rep = byTask.get(id);
      const title = strOf(t, ["title", "name"]);
      const w = /->\s*(\S+)/.exec(title);
      return {
        task: id, worker: w ? w[1] : "?",
        status: rep ? /\[swarm-report\]\s+\S+\s+(\S+)/.exec(strOf(rep, ["title", "name"]))?.[1] || "REPORTED" : "ASSIGNED",
        report: rep ? strOf(rep, ["content", "text", "snippet"]).slice(0, 300) : null,
      };
    }),
  });
}
async function cmdWatch() {
  const task = opt("--task");
  if (!task) fail("watch needs --task <task-id>");
  const worker = opt("--worker");
  const timeoutMs = Math.max(5000, Number(opt("--timeout-ms") || 120000));
  const pollMs = 10000;
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const q = worker ? `[swarm-report] ${worker.slice(0, 8)}` : "[swarm-report]";
    const reports = await search(q, 50);
    const hit = reports.filter(isReport).find((r) => taskIdOf(r) === task);
    if (hit) {
      const m = /\[swarm-report\]\s+\S+\s+(\S+)/.exec(strOf(hit, ["title", "name"]));
      out({ ok: true, task, status: m ? m[1] : "REPORTED", report: strOf(hit, ["content", "text", "snippet"]).slice(0, 500) });
      return;
    }
    if (Date.now() >= deadline) {
      process.stderr.write(`[swarm] TIMEOUT: no report for ${task} after ${timeoutMs}ms` + "\n");
      process.exit(2);
    }
    await new Promise(function (s) { setTimeout(s, pollMs); });
  }
}
async function main() {
  const cmd = process.argv[2];
  if (cmd === "assign") return cmdAssign();
  if (cmd === "inbox") return cmdInbox();
  if (cmd === "report") return cmdReport();
  if (cmd === "roster") return cmdRoster();
  if (cmd === "watch") return cmdWatch();
  process.stderr.write(usage() + "\n");
  process.exit(cmd === "--help" || cmd === "-h" ? 0 : 1);
}
main().catch((e) => fail(e.message || String(e)));