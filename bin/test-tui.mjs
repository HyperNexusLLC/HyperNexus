// TUI plugin test: headless guard + command registration via mock TuiPluginApi.
// Run: node bin/test-tui.mjs
const TUI_URL = "file:///C:/Users/hyper/workspace/HyperNexus/addons/mimo/plugin/hypernexus-tui/tui.js";

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
}

console.log("=== 1. TUI PLUGIN LOAD + HEADLESS GUARD ===");
const mod = await import(TUI_URL);
check("tui export is a function", typeof mod.tui === "function");

try {
  const r1 = await mod.tui(undefined);
  check("tui(undefined) returns {} without throwing", r1 && typeof r1 === "object" && Object.keys(r1).length === 0, `keys=${r1 ? Object.keys(r1).join(",") : r1}`);
} catch (e) {
  check("tui(undefined) returns {} without throwing", false, String(e).slice(0, 120));
}

try {
  const r2 = await mod.tui({ ui: {} });
  check("tui(api without command.register) returns {}", r2 && typeof r2 === "object" && Object.keys(r2).length === 0);
} catch (e) {
  check("tui(api without command.register) returns {}", false, String(e).slice(0, 120));
}

console.log("=== 2. COMMAND REGISTRATION (mock TuiPluginApi) ===");
const registered = [];
const toasts = [];
const mockApi = {
  command: {
    // register receives a FACTORY that returns the command spec array
    register: (factory) => {
      try {
        const specs = typeof factory === "function" ? factory() : factory;
        if (Array.isArray(specs)) registered.push(...specs);
      } catch (e) { console.log("    (factory threw: " + String(e).slice(0, 80) + ")"); }
    },
    trigger: async () => {},
    show: () => {},
  },
  route: { register: () => {}, navigate: () => {} },
  ui: {
    // toast is called as toast({ variant, title, message }) by the plugin helper
    toast: (...args) => {
      if (args.length === 1 && args[0] && typeof args[0] === "object") {
        toasts.push({ kind: args[0].variant || args[0].kind, title: args[0].title, body: args[0].message });
      } else {
        toasts.push({ kind: args[0], title: args[1], body: args[2] });
      }
    },
    dialog: { replace: (fn) => { try { return fn(); } catch { return null; } }, close: () => {} },
    Dialog: () => null,
    // DialogPrompt: immediately resolve with a test query (as if the user typed it)
    DialogPrompt: (props) => { if (props && typeof props.onConfirm === "function") props.onConfirm("file"); return null; },
    Prompt: () => null,
    Slot: () => null,
  },
  keybind: () => {},
  kv: { get: async () => null, set: async () => {} },
  state: { get: () => null, set: () => {} },
  event: { on: () => {}, emit: () => {} },
  plugins: { list: () => [], activate: () => {}, deactivate: () => {} },
  lifecycle: { on: () => {} },
};

try {
  const hooks = await mod.tui(mockApi);
  check("tui(mockApi) returns hook object", hooks && typeof hooks === "object");
  const names = registered.map((s) => (s.slash && s.slash.name) || s.value || s.title);
  console.log(`    registered commands: ${JSON.stringify(names)}`);
  check("9 commands registered", registered.length === 9, `count=${registered.length}`);
  const expect = ["hn-status", "hn-search", "hn-suggest", "hn-memory", "hn-harvest"];
  for (const want of expect) {
    const found = registered.some((s) => (s.slash && s.slash.name) === want || s.value === want);
    check(`command '${want}' registered`, found);
  }
  const withHandlers = registered.filter((s) => typeof s.onSelect === "function").length;
  check("all commands have onSelect handlers", withHandlers === registered.length, `${withHandlers}/${registered.length}`);
} catch (e) {
  check("tui(mockApi) returns hook object", false, String(e).slice(0, 140));
}

console.log("=== 3. COMMAND HANDLERS INVOKE (toast-only output, no throw) ===");
for (const spec of registered) {
  const n = (spec.slash && spec.slash.name) || spec.value || "?";
  if (typeof spec.onSelect !== "function") { check(`handler ${n}`, false, "missing onSelect"); continue; }
  try {
    await spec.onSelect();
    check(`handler ${n}`, true);
  } catch (e) {
    check(`handler ${n}`, false, String(e).slice(0, 100));
  }
}
console.log(`    toasts emitted: ${toasts.length}`);
for (const t of toasts.slice(0, 12)) {
  console.log(`      [${t.kind}] ${t.title}: ${String(t.body || "").slice(0, 70).replace(/\n/g, " ")}`);
}

console.log("");
console.log(`=== TUI SUMMARY: ${pass} passed, ${fail} failed ===`);
if (failures.length) console.log("Failed: " + failures.join(", "));
process.exit(fail > 0 ? 1 : 0);
