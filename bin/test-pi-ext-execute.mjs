// Real pi-extension test: mock the ExtensionAPI, load hypernexus.ts, execute all
// registered tools against the live kernel. Verifies the ACTUAL extension code paths.
const TOOL_ARGS = {
  hypernexus_memory_store: { content: "pi-exec test fact " + Date.now(), tags: ["pi-exec"] },
  hypernexus_memory_search: { query: "memory", limit: 3 },
  hypernexus_memory_vector_search: { query: "memory", limit: 3 },
  hypernexus_memory_list: { limit: 3 },
  hypernexus_tool_search: { query: "search files", limit: 3 },
  hypernexus_suggest_tools: { limit: 3 },
  hypernexus_session_search: { query: "memory", limit: 3 },
  hypernexus_skill_manage: { action: "list" },
  hypernexus_code_search: { query: "memory", mode: "semantic" },
  hypernexus_context_harvest: { query: "memory" },
  hypernexus_scratchpad: { action: "get" },
  hypernexus_system_status: {},
  hypernexus_billing_status: {},
  hypernexus_mcp_call: { tool: "echo", args: { message: "pi-exec" } },
  hypernexus_add_fact: { content: "pi-exec fact " + Date.now(), kind: "fact", tags: ["pi-exec"] },
  hypernexus_memory_list: { limit: 3 },
  hypernexus_repomap: { dir: "addons" },
  hypernexus_knowledge_graph: { action: "add_entities", entities: [{ name: "PiExec", type: "test", observations: ["x"] }] },
  hypernexus_session_context: { action: "get" },
  hypernexus_subagent: { task: "pi-exec test task" },
  hypernexus_orchestrate: { task: "test orchestration" },
  hypernexus_browser: { action: "status" },
};

const mockPi = {
  _tools: {}, _commands: {}, _hooks: {}, _shortcuts: {}, _flags: {},
  registerTool(t) { this._tools[t.name] = t; },
  registerCommand(name, c) { this._commands[name] = c; },
  registerShortcut(k, s) { this._shortcuts[k] = s; },
  registerFlag(name, f) { this._flags[name] = f; },
  registerMcpServer(name, c) { this._mcp = this._mcp || {}; this._mcp[name] = c; },
  on(evt, fn) { (this._hooks[evt] = this._hooks[evt] || []).push(fn); },
  setSessionName() {}, appendEntry() {},
  events: { on() {}, emit() {} },
};

const mod = await import("file:///C:/Users/hyper/AppData/Local/Temp/pi_ext_bundle.mjs");
mod.default(mockPi);

const names = Object.keys(mockPi._tools);
console.log(`pi extension loaded: ${names.length} tools, ${Object.keys(mockPi._commands).length} commands, ${Object.keys(mockPi._hooks).length} hooks, ${Object.keys(mockPi._shortcuts).length} shortcuts`);

let ok = 0, fail = 0; const fails = [];
// Lifecycle-covered tools need real record ids; exercised below against live
// records, not with the empty-arg probe (which correctly reports a graceful
// error, not a crash, when no id is given).
const LIFECYCLE = new Set(["hypernexus_memory_update", "hypernexus_memory_delete", "hypernexus_memory_handoff"]);
for (const name of names) {
  if (LIFECYCLE.has(name)) continue;
  const t = mockPi._tools[name];
  const args = TOOL_ARGS[name] ?? {};
  const signal = AbortSignal.timeout(20000);
  try {
    const testCtx = { ui: { notify() {}, setStatus() {} }, executeTool: (n, a, o) => mockPi._tools[n] ? mockPi._tools[n].execute("nested", a, o?.signal ?? AbortSignal.timeout(15000), () => {}, { ui: { notify() {}, setStatus() {} } }) : Promise.resolve({ content: [] }) };
    const res = await t.execute("test-id", args, signal, () => {}, testCtx);
    const s = JSON.stringify(res);
    const bad = res?.isError || /404 page not found|Cannot read|undefined is not|TypeError|ReferenceError/i.test(s);
    if (bad) { fail++; fails.push(`${name}: ${s.slice(0, 90)}`); }
    else { ok++; }
  } catch (e) {
    fail++; fails.push(`${name}: THREW ${String(e).slice(0, 90)}`);
  }
}

// Lifecycle: update/delete/handoff against real ids (needs live kernel).
let lok = 0, lfail = 0; const lfails = [];
{
  const KB = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
  // Alphanumeric-only tag: FTS MATCH treats hyphens/quotes as operators.
  const tag = `pibattery${Date.now()}`;
  const call = (n, a) => mockPi._tools[n].execute("lifecycle", a, AbortSignal.timeout(25000), () => {}, { ui: { notify() {}, setStatus() {} } });
  const lcheck = (n, cond, d = "") => { if (cond) { lok++; } else { lfail++; lfails.push(`${n} ${String(d).slice(0, 90)}`); } };
  let alive = false;
  try {
    const h = await (await fetch(`${KB}/health`, { signal: AbortSignal.timeout(10000) })).json();
    alive = !!h?.ok;
  } catch { alive = false; }
  if (!alive) {
    console.log("lifecycle SKIPPED (kernel unreachable)");
  } else {
    const findId = async () => {
      try {
        const r = await fetch(`${KB}/api/memory/fts-search?q=${encodeURIComponent(tag)}&limit=5`, { signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        const arr = j?.data;
        const rec = (Array.isArray(arr) ? arr : []).map((m) => m.record ?? m).find((m) => JSON.stringify(m).includes(tag));
        return rec?.id ?? null;
      } catch { return null; }
    };
    let mid = null;
    try {
      const r = await fetch(`${KB}/api/memory/facts/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `pi probe ${tag}`, content: `probe content ${tag}`, tags: [tag, "pi-exec"], category: "general" }), signal: AbortSignal.timeout(20000) });
      mid = r.ok ? await findId() : null;
    } catch { mid = null; }
    lcheck("lifecycle setup store+find", !!mid, mid ?? "facts/add or fts-search failed");
    if (mid) {
      const u = await call("hypernexus_memory_update", { id: mid, content: `updated probe ${tag}`, tags: [tag] });
      lcheck("lifecycle update ok", !u?.isError, JSON.stringify(u).slice(0, 90));
      const mid2 = await findId();
      lcheck("lifecycle updated record searchable", !!mid2, mid2 ?? "updated record not found");
      if (mid2) {
        const d = await call("hypernexus_memory_delete", { id: mid2 });
        lcheck("lifecycle delete ok", !d?.isError && d?.structuredContent?.deleted === mid2, JSON.stringify(d).slice(0, 90));
      }
      const w = await call("hypernexus_memory_handoff", { summary: `pi probe handoff ${tag}` });
      const art = w?.structuredContent?.artifact ?? null;
      // The artifact itself carries the notes (kernel embeds them at write).
      lcheck("lifecycle handoff write ok", !w?.isError && !!art && JSON.stringify(art).includes(tag), JSON.stringify(w).slice(0, 90));
      // Pickup restores BY ARTIFACT ID and replays its recentContext entries
      // (kernel contract: it returns {success,count}, not the notes — those
      // live in the artifact the write leg returned, asserted above).
      const p = await call("hypernexus_memory_handoff", { pickup: true, artifact: art });
      lcheck("lifecycle handoff pickup restores", !p?.isError && !!art && JSON.stringify(p).includes('"success":true'), JSON.stringify(p).slice(0, 120));
      // Cleanup: remove the handoff-test fact if still present.
      const mid3 = await findId();
      if (mid3) await call("hypernexus_memory_delete", { id: mid3 });
    }
  }
}
console.log(`PI EXTENSION EXECUTE: ${ok}/${names.length - LIFECYCLE.size} probe + ${lok}/${lok + lfail} lifecycle passed`);
for (const f of fails) console.log("  FAIL", f);
for (const f of lfails) console.log("  FAIL lifecycle", f);
