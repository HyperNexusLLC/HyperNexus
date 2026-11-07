#!/usr/bin/env node
/**
 * session-bus.mjs -- HyperNexus cross-session bus (all harnesses/threads).
 * ======================================================================
 * Generalizes the codex-gui swarm bus (addons/codex-gui/swarm.mjs) to every
 * session and thread, whatever harness it runs in. Transport is kernel
 * memory facts (the control plane that works today; native cross-session
 * execution /api/agent/orchestrate is still 404 and supervisor sessions are
 * kernel-owned, so external sessions meet here instead).
 *
 *   node session-bus.mjs register --id <session-id> --harness <name> [--thread <id>] [--transport bus|cdp|supervisor|transcript]
 *   node session-bus.mjs sessions
 *   node session-bus.mjs send --from <id> --to <id|*> --text "..."
 *   node session-bus.mjs inbox --id <session-id>
 *   node session-bus.mjs reply --from <id> --to <id> --in-reply-to <msg-id> --text "..." [--status DONE|BLOCKED|INFO]
 *   node session-bus.mjs thread --id <session-id>
 *
 * INPUT  = a [bus-msg] fact addressed to a session (its inbox).
 * OUTPUT = a [bus-out] fact a session posts back (replies thread by msg id).
 * Facts are append-only; a reply supersedes its message in inbox views.
 * Web threads (muse.ai / Gemini) do not poll: drive them directly with
 * addons/shared/cdp-bridge.mjs, then mirror the exchange here with send/reply
 * so every other session can read it.
 *
 * Env: HYPERNEXUS_URL (default http://127.0.0.1:7778), HN_TIMEOUT_MS (45000).
 * Node stdlib only. JSON on stdout; errors to stderr with exit 1.
 * This driver defines no shell tool names or descriptions (Meta 403 guard).
 */
const BASE = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/$/, "");
const TIMEOUT = Number(process.env.HN_TIMEOUT_MS || 45000);
const TAGS = ["session-bus"];
// Default transport is the kernel scratchpad (SQLite, ~50ms writes).
// Memory-facts writes rewrite the whole 24MB memories.json per write
// (minutes under load); keep them as an opt-in durable archive transport.
const VIA = (process.env.HN_BUS_VIA || "scratch").toLowerCase();

function usage() {
  return [
    "usage:",
    "  node session-bus.mjs register --id <session-id> --harness <name> [--thread <id>] [--transport <kind>]",
    "  node session-bus.mjs sessions",
    "  node session-bus.mjs send --from <id> --to <id|*> --text \"...\"",
    "  node session-bus.mjs inbox --id <session-id>",
    "  node session-bus.mjs reply --from <id> --to <id> --in-reply-to <msg-id> --text \"...\" [--status DONE|BLOCKED|INFO]",
    "  node session-bus.mjs thread --id <session-id>",
    "  node session-bus.mjs watch --id <session-id> [--interval ms] [--ack] [--once]",
  ].join("\n");
}
function fail(msg) { process.stderr.write(`[session-bus] FAIL: ${msg}\n`); process.exit(1); }
function out(obj) { process.stdout.write(JSON.stringify(obj, null, 2) + "\n"); }
function opt(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
async function req(method, path, body, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || TIMEOUT);
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
  // Kernel search replies are {success, data: [...]}; req() wraps that body
  // in {status, data}, so the array can sit at payload.data or .data.data.
  const d = payload.data !== undefined ? payload.data : payload;
  if (Array.isArray(d)) return d;
  for (const k of ["data", "results", "facts", "memories", "items", "hits"]) {
    if (Array.isArray(d?.[k])) return d[k];
  }
  return [];
}
function strOf(f, keys) {
  for (const k of keys) {
    const v = f?.[k];
    if (typeof v === "string" && v) return v;
  }
  return "";
}
const titleOf = (f) => strOf(f, ["title", "name"]) || (typeof f?.metadata?.title === "string" ? f.metadata.title : "");
const bodyOf = (f) => strOf(f, ["content", "text", "snippet"]);
const isRegister = (f) => titleOf(f).startsWith("[session-bus] register");
const isMsg = (f) => titleOf(f).startsWith("[bus-msg]");
const isOut = (f) => titleOf(f).startsWith("[bus-out]");
function msgIdOf(f) {
  const m = /^\[(?:bus-msg|bus-out)\]\s+(\S+)/.exec(titleOf(f));
  return m ? m[1] : null;
}
function fieldOf(f, name) {
  const m = new RegExp(`^${name}:\\s*(.*)$`, "m").exec(bodyOf(f));
  return m ? m[1].trim() : "";
}
async function recentScan(prefix) {
  // Fast read path: /api/agent-memory/recent answers in seconds even when
  // semantic /api/memory/search takes 90s+ (it scores the whole 31k store).
  // Bus facts are recent by construction; scan the newest HN_RECENT_LIMIT
  // records and filter by title prefix client-side.
  const limit = Number(process.env.HN_RECENT_LIMIT || 1000);
  const r = await req("GET", "/api/agent-memory/recent?limit=" + limit, undefined, 60000);
  if (r.status !== 200) return [];
  return itemsOf(r).filter((f) => titleOf(f).startsWith(prefix));
}
async function search(q, limit) {
  const scanned = await recentScan(q);
  if (scanned.length) return scanned;
  let last = null;
  for (let n = 0; n < 3; n++) {
    const r = await req("GET", "/api/memory/search?q=" + encodeURIComponent(q) + "&limit=" + (limit || 50));
    if (r.status === 200) return itemsOf(r);
    last = r;
    await new Promise((s) => setTimeout(s, 2000 * (n + 1)));
  }
  fail("memory search failed after 3 tries (HTTP " + last.status + "): " + JSON.stringify(last.data).slice(0, 200));
}
async function factLanded(token, kindQuery) {
  // A timed-out write often still lands: the kernel rewrites the whole
  // memories.json per write, which can take minutes on a saturated box.
  // Verify before retrying (avoids duplicates) or failing. Search by the
  // kind phrase and scan titles for the token: a bare hyphenated id token
  // rarely matches kernel keyword search on its own.
  for (let n = 0; n < 10; n++) {
    const hits = await recentScan(kindQuery);
    if (hits.some((f) => titleOf(f).includes(token))) return true;
    await new Promise((s) => setTimeout(s, 20000));
  }
  return false;
}
async function storeFact(body, what, verifyToken, kindQuery) {
  let last = null;
  for (let n = 0; n < 2; n++) {
    const r = await req("POST", "/api/memory/facts/add", body);
    if (r.status === 200 || r.status === 201) return r;
    last = r;
    if (verifyToken && (await factLanded(verifyToken, kindQuery || body.title || ""))) return { status: 200, data: { verified: "landed-after-timeout" } };
    await new Promise((s) => setTimeout(s, 3000));
  }
  fail(what + " store failed after 2 tries (HTTP " + last.status + "): " + JSON.stringify(last.data).slice(0, 200));
}

// ---- scratch transport: one key per record, one GET scans the map ----
async function scratchSet(key, obj) {
  const r = await req("POST", "/api/memory/scratchpad/set", { key, value: JSON.stringify(obj) }, 30000);
  if (r.status !== 200) fail("scratchpad set failed (HTTP " + r.status + "): " + JSON.stringify(r.data).slice(0, 200));
}
async function scratchMap() {
  const r = await req("GET", "/api/memory/scratchpad/get", undefined, 30000);
  if (r.status !== 200) fail("scratchpad get failed (HTTP " + r.status + ")");
  return r.data?.scratchpad || {};
}
function scratchRecords(map, prefix) {
  const rows = [];
  for (const [k, v] of Object.entries(map)) {
    if (!k.startsWith(prefix)) continue;
    try { rows.push(JSON.parse(v)); } catch { /* foreign value, skip */ }
  }
  return rows;
}
async function cmdRegister() {
  const id = opt("--id");
  const harness = opt("--harness");
  if (!id) fail("register needs --id <session-id>");
  if (!harness) fail("register needs --harness <name>");
  if (VIA !== "facts") {
    await scratchSet("bus:reg:" + id, { id, harness, thread: opt("--thread") || id, transport: opt("--transport") || "bus", ts: Date.now() });
    out({ ok: true, registered: id, harness, via: "scratch" });
    return;
  }
  const content = [
    `session: ${id}`, `harness: ${harness}`,
    `thread: ${opt("--thread") || id}`, `transport: ${opt("--transport") || "bus"}`,
  ].join("\n");
  await storeFact({
    title: `[session-bus] register ${id}`, content,
    tags: [...TAGS, "session-register"], category: "session-register",
  }, "register", id, "[session-bus] register");
  out({ ok: true, registered: id, harness });
}
async function cmdSessions() {
  if (VIA !== "facts") {
    const sessions = scratchRecords(await scratchMap(), "bus:reg:");
    out({ ok: true, count: sessions.length, sessions, via: "scratch" });
    return;
  }
  const regs = (await search("[session-bus] register", 50)).filter(isRegister);
  const seen = new Map();
  for (const f of regs) {
    const id = fieldOf(f, "session") || titleOf(f).replace("[session-bus] register ", "").trim();
    if (id && !seen.has(id)) {
      seen.set(id, {
        id, harness: fieldOf(f, "harness"), thread: fieldOf(f, "thread") || id,
        transport: fieldOf(f, "transport") || "bus",
      });
    }
  }
  out({ ok: true, count: seen.size, sessions: [...seen.values()] });
}
async function cmdSend() {
  const from = opt("--from");
  const to = opt("--to");
  const text = opt("--text");
  if (!from) fail("send needs --from <id>");
  if (!to) fail("send needs --to <id|*>");
  if (!text) fail("send needs --text \"...\"");
  const msgId = "bm-" + Date.now().toString(36);
  if (VIA !== "facts") {
    await scratchSet("bus:msg:" + msgId, { msg: msgId, from, to, text, ts: Date.now() });
    out({ ok: true, msg: msgId, from, to, via: "scratch" });
    return;
  }
  const content = [`from: ${from}`, `to: ${to}`, `msg: ${msgId}`, "", text].join("\n");
  await storeFact({
    title: `[bus-msg] ${msgId} -> ${to}`, content,
    tags: [...TAGS, "bus-msg"], category: "bus-msg",
  }, "send", msgId, "[bus-msg]");
  out({ ok: true, msg: msgId, from, to });
}
async function fetchThread(id) {
  const [msgs, outs] = await Promise.all([search("[bus-msg]", 50), search("[bus-out]", 50)]);
  const mine = (f) => fieldOf(f, "from") === id || fieldOf(f, "to") === id || fieldOf(f, "to") === "*";
  return {
    msgs: msgs.filter(isMsg).filter(mine),
    outs: outs.filter(isOut).filter((f) => fieldOf(f, "from") === id || fieldOf(f, "to") === id),
  };
}
async function cmdInbox() {
  const id = opt("--id");
  if (!id) fail("inbox needs --id <session-id>");
  if (VIA !== "facts") {
    const map = await scratchMap();
    const outs = scratchRecords(map, "bus:out:");
    const replied = new Set(outs.map((o) => o.inReplyTo).filter(Boolean));
    const messages = scratchRecords(map, "bus:msg:")
      .filter((m) => (m.to === id || m.to === "*") && (!replied.has(m.msg) || m.to === "*"));
    out({ ok: true, id, pending: messages.length, messages, via: "scratch" });
    return;
  }
  const { msgs, outs } = await fetchThread(id);
  const replied = new Set(outs.map((f) => fieldOf(f, "inReplyTo")).filter(Boolean));
  const pending = msgs.filter((m) => fieldOf(m, "to") === id || fieldOf(m, "to") === "*")
    .filter((m) => !replied.has(msgIdOf(m)) || fieldOf(m, "to") === "*");
  out({
    ok: true, id, pending: pending.length,
    messages: pending.map((m) => ({
      msg: msgIdOf(m), from: fieldOf(m, "from"), to: fieldOf(m, "to"),
      text: bodyOf(m).split("\n\n").slice(1).join("\n\n").slice(0, 2000),
    })),
  });
}
async function cmdReply() {
  const from = opt("--from");
  const to = opt("--to");
  const inReplyTo = opt("--in-reply-to");
  const text = opt("--text");
  const status = opt("--status") || "INFO";
  if (!from) fail("reply needs --from <id>");
  if (!to) fail("reply needs --to <id>");
  if (!text) fail("reply needs --text \"...\"");
  if (!["DONE", "BLOCKED", "INFO"].includes(status)) fail("reply --status must be DONE|BLOCKED|INFO");
  const outId = "bo-" + Date.now().toString(36);
  if (VIA !== "facts") {
    await scratchSet("bus:out:" + outId, { out: outId, from, to, inReplyTo: inReplyTo || "", status, text, ts: Date.now() });
    out({ ok: true, out: outId, from, to, inReplyTo: inReplyTo || null, status, via: "scratch" });
    return;
  }
  const content = [
    `from: ${from}`, `to: ${to}`, `inReplyTo: ${inReplyTo || ""}`, `status: ${status}`, "", text,
  ].join("\n");
  await storeFact({
    title: `[bus-out] ${outId} from ${from}`, content,
    tags: [...TAGS, "bus-out"], category: "bus-out",
  }, "reply", outId, "[bus-out]");
  out({ ok: true, out: outId, from, to, inReplyTo: inReplyTo || null, status });
}
async function cmdThread() {
  const id = opt("--id");
  if (!id) fail("thread needs --id <session-id>");
  if (VIA !== "facts") {
    const map = await scratchMap();
    const rows = [
      ...scratchRecords(map, "bus:msg:").filter((m) => m.from === id || m.to === id || m.to === "*").map((m) => ({ kind: "in", ...m })),
      ...scratchRecords(map, "bus:out:").filter((o) => o.from === id || o.to === id).map((o) => ({ kind: "out", ...o })),
    ].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    out({ ok: true, id, entries: rows.length, thread: rows, via: "scratch" });
    return;
  }
  const { msgs, outs } = await fetchThread(id);
  const rows = [
    ...msgs.map((m) => ({ kind: "in", id: msgIdOf(m), from: fieldOf(m, "from"), to: fieldOf(m, "to"), text: bodyOf(m).split("\n\n").slice(1).join("\n\n").slice(0, 500) })),
    ...outs.map((o) => ({ kind: "out", id: msgIdOf(o), from: fieldOf(o, "from"), to: fieldOf(o, "to"), status: fieldOf(o, "status"), inReplyTo: fieldOf(o, "inReplyTo"), text: bodyOf(o).split("\n\n").slice(1).join("\n\n").slice(0, 500) })),
  ];
  out({ ok: true, id, entries: rows.length, thread: rows });
}
async function cmdWatch() {
  const id = opt("--id");
  if (!id) fail("watch needs --id <session-id>");
  const interval = Number(opt("--interval") || 5000);
  const ack = process.argv.includes("--ack");
  const once = process.argv.includes("--once");
  const seen = new Set();
  process.stdout.write(JSON.stringify({ ok: true, watching: id, interval, ack }) + "\n");
  for (;;) {
    try {
      const map = await scratchMap();
      const outs = scratchRecords(map, "bus:out:");
      const replied = new Set(outs.map((o) => o.inReplyTo).filter(Boolean));
      const pending = scratchRecords(map, "bus:msg:")
        .filter((m) => (m.to === id || m.to === "*") && !seen.has(m.msg) && (!replied.has(m.msg) || m.to === "*"));
      for (const m of pending) {
        seen.add(m.msg);
        process.stdout.write(JSON.stringify({ kind: "in", ...m }) + "\n");
        if (ack && m.to === id) {
          const outId = "bo-" + Date.now().toString(36);
          await scratchSet("bus:out:" + outId, { out: outId, from: id, to: m.from, inReplyTo: m.msg, status: "INFO", text: "ACK by watcher", ts: Date.now() });
          process.stdout.write(JSON.stringify({ kind: "ack", out: outId, inReplyTo: m.msg }) + "\n");
        }
      }
    } catch (e) {
      process.stderr.write(`[session-bus] watch poll failed: ${e.message}\n`);
    }
    if (once) return;
    await new Promise((s) => setTimeout(s, interval));
  }
}
async function main() {
  const cmd = process.argv[2];
  if (cmd === "register") return cmdRegister();
  if (cmd === "sessions") return cmdSessions();
  if (cmd === "send") return cmdSend();
  if (cmd === "inbox") return cmdInbox();
  if (cmd === "reply") return cmdReply();
  if (cmd === "thread") return cmdThread();
  if (cmd === "watch") return cmdWatch();
  process.stderr.write(usage() + "\n");
  process.exit(cmd === "--help" || cmd === "-h" ? 0 : 1);
}
main().catch((e) => fail(e.message || String(e)));
