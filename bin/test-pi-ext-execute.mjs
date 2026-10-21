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
for (const name of names) {
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
console.log(`PI EXTENSION EXECUTE: ${ok}/${names.length} passed`);
for (const f of fails) console.log("  FAIL", f);
