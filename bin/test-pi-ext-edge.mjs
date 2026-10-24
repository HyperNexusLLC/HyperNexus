// Edge-case test: invoke every pi-extension tool with empty/bad args and verify
// none throw (they should return graceful error text, not crash). Companion to
// test-pi-ext-execute.mjs (which tests happy paths).
const mockPi = {
  _tools: {}, _commands: {}, _hooks: {}, _shortcuts: {}, _flags: {}, _mcp: {},
  registerTool(t) { this._tools[t.name] = t; },
  registerCommand(n, c) { this._commands[n] = c; },
  registerShortcut(k, s) { this._shortcuts[k] = s; },
  registerFlag(n, f) { this._flags[n] = f; },
  registerMcpServer(n, c) { this._mcp[n] = c; },
  on(e, f) { (this._hooks[e] = this._hooks[e] || []).push(f); },
  setSessionName() {}, appendEntry() {}, events: { on() {}, emit() {} },
};
const mod = await import("file:///C:/Users/hyper/AppData/Local/Temp/pi_ext_bundle.mjs");
mod.default(mockPi);

function mkCtx() {
  return {
    signal: AbortSignal.timeout(8000),
    ui: { notify() {}, setStatus() {}, editor: async (_l, d) => d, select: async (_l, o) => Array.isArray(o) ? o[0] : o, input: async (_l, d) => d, confirm: async () => true, setSessionName() {}, toast() {} },
    sessionManager: { getSessionFile: () => "", getEntries: () => [] },
  };
}

const names = Object.keys(mockPi._tools);
let ok = 0; const fails = [];
// Try each tool with: {}, and with clearly-invalid values
const cases = [{}, { query: "" }, { content: "" }, { action: "__invalid__" }, { tool: "__nope__" }, { id: "" }];
for (const name of names) {
  for (const args of cases) {
    try {
      const res = await mockPi._tools[name].execute("t", args, AbortSignal.timeout(8000), () => {}, mkCtx());
      // Should return a result object (even if isError) — just must NOT throw
      ok++;
    } catch (e) {
      fails.push(`${name} ${JSON.stringify(args).slice(0, 30)}: THREW ${String(e).slice(0, 70)}`);
    }
  }
}
console.log(`EDGE CASES: ${ok} calls completed, ${fails.length} threw`);
for (const f of fails.slice(0, 20)) console.log("  THREW", f);
