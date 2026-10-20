// Execute the pi extension's HOOKS and COMMANDS (the parts not covered by the
// tool-execute test). Verifies none throw and return sane shapes. Uses the same
// mock ExtensionAPI + bundled extension as test-pi-ext-execute.mjs.
const mockPi = {
  _tools: {}, _commands: {}, _hooks: {}, _shortcuts: {}, _flags: {}, _mcp: {},
  registerTool(t) { this._tools[t.name] = t; },
  registerCommand(name, c) { this._commands[name] = c; },
  registerShortcut(k, s) { this._shortcuts[k] = s; },
  registerFlag(name, f) { this._flags[name] = f; },
  registerMcpServer(name, c) { this._mcp[name] = c; },
  on(evt, fn) { (this._hooks[evt] = this._hooks[evt] || []).push(fn); },
  setSessionName() {}, appendEntry() {},
  events: { on() {}, emit() {} },
};
const mod = await import("file:///C:/Users/hyper/AppData/Local/Temp/pi_ext_bundle.mjs");
mod.default(mockPi);

function mkCtx() {
  return {
    signal: AbortSignal.timeout(15000),
    ui: { notify() {}, setStatus() {}, setWidget() {}, editor: async (_l, d) => d ?? "command output", select: async (_l, opts) => Array.isArray(opts) ? opts[0] : opts, input: async (_l, d) => d ?? "test input", confirm: async () => true, setSessionName() {}, toast() {} },
    sessionManager: { getSessionFile: () => "/tmp/test-session.jsonl", getEntries: () => [{ role: "user", content: "hello world" }, { role: "assistant", content: "done" }] },
  };
}

const EVENTS = {
  session_start: { reason: "start" },
  before_agent_start: { systemPrompt: "You are helpful. HyperNexus", prompt: "build a checkout feature" },
  context: { messages: [{ role: "user", content: "how do I build a payment checkout service" }] },
  tool_call: { toolName: "bash", input: { command: "echo safe" } },
  tool_result: { toolName: "bash", content: [{ type: "text", text: "x".repeat(150) }] },
  user_bash: { command: "echo hi" },
  model_select: { previousModel: { id: "a" }, model: { id: "b" }, source: "user" },
  input: { text: "recall @memory:checkout" },
  turn_end: { toolResults: [{ toolName: "bash" }], turnIndex: 1, message: { content: [{ type: "text", text: "y".repeat(120) }] } },
  session_before_compact: { preparation: { firstKeptEntryId: "1", tokensBefore: 100 }, branchEntries: [], reason: "limit" },
  session_compact: { compactionEntry: { summary: "did work" }, reason: "limit" },
  session_shutdown: {},
  project_trust: { cwd: "C:/Users/hyper/workspace/HyperNexus" },
  resources_discover: {},
};

let hOk = 0, hFail = 0; const hFails = [];
for (const [evt, fns] of Object.entries(mockPi._hooks)) {
  for (const fn of fns) {
    try {
      await fn(EVENTS[evt] ?? {}, mkCtx());
      hOk++;
    } catch (e) {
      hFail++; hFails.push(`hook ${evt}: ${String(e).slice(0, 80)}`);
    }
  }
}
console.log(`HOOKS: ${hOk} ran, ${hFail} threw`);
for (const f of hFails) console.log("  FAIL", f);

const CMD_ARGS = {
  "tn-store": "test memory content",
  "tn-search": "checkout",
  "tn-status": "",
  "tn-plan": "test plan",
  "tn-purge": "",
  "tn-summary": "",
};
let cOk = 0, cFail = 0; const cFails = [];
for (const [name, c] of Object.entries(mockPi._commands)) {
  try {
    await c.handler(CMD_ARGS[name] ?? "", mkCtx());
    cOk++;
  } catch (e) {
    cFail++; cFails.push(`cmd ${name}: ${String(e).slice(0, 80)}`);
  }
}
console.log(`COMMANDS: ${cOk} ran, ${cFail} threw`);
for (const f of cFails) console.log("  FAIL", f);
