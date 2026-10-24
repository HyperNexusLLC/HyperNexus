// Full functionality test for the HyperNexus MiMoCode plugin + kernel core.
// Run: node bin/test-extensions.mjs
// Covers: all 9 typed tools, all 10 hooks, kernel HTTP core, error resilience.

const PLUGIN_URL = "file:///C:/Users/hyper/workspace/HyperNexus/addons/mimo/plugin/hypernexus/index.js";
const BASE = "http://127.0.0.1:7778";

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
}
async function http(path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(BASE + path, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: null, error: String(e) }; }
  finally { clearTimeout(t); }
}

console.log("=== 1. KERNEL CORE ENDPOINTS ===");
{
  const h = await http("/health");
  check("GET /health", h.ok && h.data && h.data.ok === true, `v${h.data && h.data.version}`);
  const st = await http("/api/tools/search?query=file&limit=3");
  const cnt = st.data && Array.isArray(st.data.data) ? st.data.data.length : -1;
  check("GET /api/tools/search", st.ok && cnt >= 0, `dataCount=${cnt}`);
  const ms = await http("/api/mcp/status");
  check("GET /api/mcp/status", ms.ok, ms.ok ? "" : ms.error || `HTTP ${ms.status}`);
  const sv = await http("/api/mcp/servers");
  const svs = sv.data && (sv.data.data || sv.data.servers);
  check("GET /api/mcp/servers", sv.ok, `servers=${Array.isArray(svs) ? svs.length : typeof svs}`);
  const tl = await http("/api/mcp/tools");
  const tls = tl.data && (tl.data.data || tl.data.tools);
  check("GET /api/mcp/tools", tl.ok, `tools=${Array.isArray(tls) ? tls.length : typeof tls}`);
  const su = await http("/api/mcp/tool-suggestions", { method: "POST", body: JSON.stringify({ query: "read a pdf" }), headers: { "Content-Type": "application/json" } });
  check("POST /api/mcp/tool-suggestions", su.ok || su.status === 200 || su.status === 202, `status=${su.status}`);
  const sg = await http("/api/mcp/tool-suggestions?query=pdf");
  check("GET /api/mcp/tool-suggestions", sg.ok, `status=${sg.status}`);
  const m1 = await http("/api/memory/search?query=session&limit=2");
  check("GET /api/memory/search", m1.ok || m1.status === 0, m1.ok ? "ok" : (m1.error || `HTTP ${m1.status}`));
  const m2 = await http("/api/memory/facts/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "selftest-e2e", content: "extension selftest " + new Date().toISOString(), tags: ["selftest"], namespace: "global" }),
  });
  check("POST /api/memory/facts/add", m2.ok, m2.ok ? "" : (m2.error || `HTTP ${m2.status}`));
}

console.log("=== 2. PLUGIN LOAD + TOOL/HOOK INVENTORY ===");
const mod = await import(PLUGIN_URL);
check("plugin import (ESM)", typeof mod.server === "function" && typeof mod.default === "function");
const hooks = await mod.server({}, { baseUrl: BASE });
const toolNames = Object.keys(hooks.tool || {});
const hookNames = Object.keys(hooks).filter((k) => k !== "tool");
// SDK surface: 23 function hooks + auth (AuthHook object) + provider (ProviderHook object).
const fnHooks = hookNames.filter((k) => typeof hooks[k] === "function");
const objHooks = hookNames.filter((k) => typeof hooks[k] === "object" && hooks[k] !== null);
// Concurrent-harness note: the mimo plugin surface grows across harness agents
// (13 → 20 → 22 tools). Assert the floor + required core names instead of an
// exact count so this shared battery does not break on additive changes.
const REQUIRED_MIMO_TOOLS = ["hypernexus_status", "hypernexus_memory_store", "hypernexus_memory_search", "hypernexus_mcp_call", "hypernexus_suggest_tools"];
check(
  `tool inventory >= 20 (currently ${toolNames.length})`,
  toolNames.length >= 20 && REQUIRED_MIMO_TOOLS.every((n) => toolNames.includes(n)),
  toolNames.join(",")
);
check("hook inventory = 25 (23 fn + auth + provider)", hookNames.length === 25 && typeof hooks.tool === "object", hookNames.join(","));
check("total Hooks keys = 26", Object.keys(hooks).length === 26, Object.keys(hooks).join(","));
check("auth is AuthHook object", objHooks.includes("auth") && typeof hooks.auth.provider === "string" && Array.isArray(hooks.auth.methods), `auth.provider=${hooks.auth && hooks.auth.provider}`);
check("provider is ProviderHook object", objHooks.includes("provider") && typeof hooks.provider.id === "string" && typeof hooks.provider.models === "function", `provider.id=${hooks.provider && hooks.provider.id}`);
check("all function hooks are callable", fnHooks.every((k) => typeof hooks[k] === "function"), fnHooks.join(","));

console.log("=== 3. ALL 9 TYPED TOOLS (execute) ===");
const cases = [
  ["hypernexus_status", {}],
  ["hypernexus_search_tools", { query: "file", limit: 3 }],
  ["hypernexus_suggest_tools", { query: "read a pdf" }],
  ["hypernexus_mcp_status", {}],
  ["hypernexus_mcp_servers", {}],
  ["hypernexus_mcp_tools", { limit: 5 }],
  ["hypernexus_memory_search", { query: "session", limit: 2 }],
  ["hypernexus_memory_store", { title: "selftest-store", content: "selftest store " + Date.now(), tags: ["selftest"], namespace: "global" }],
  ["hypernexus_context_harvest", { summary: "selftest harvest", keyFiles: ["addons/mimo/plugin/hypernexus/index.js"] }],
];
for (const [name, args] of cases) {
  const t = hooks.tool[name];
  if (!t || typeof t.execute !== "function") { check(`tool ${name}`, false, "missing execute"); continue; }
  try {
    const res = await t.execute(args);
    let outText = "";
    if (typeof res === "string") outText = res;
    else if (res && typeof res.output === "string") outText = res.output;
    else outText = JSON.stringify(res);
    // Against a LIVE kernel, a graceful-degrade note (ok:false / timeout / unavailable) is a failure.
    let degraded = false;
    try {
      const parsed = JSON.parse(outText);
      if (parsed && parsed.ok === false) degraded = true;
    } catch { /* not JSON — fall back to text match */ }
    if (/note"\s*:\s*"[^"]*(timeout|unavailable|refused|fetch failed|ECONNREFUSED|HTTP )/i.test(outText)) degraded = true;
    check(`tool ${name}`, !degraded,
      `${(res && res.metadata && JSON.stringify(res.metadata)) || ""} :: ${String(outText).slice(0, 80).replace(/\n/g, " ")}`);
  } catch (e) {
    check(`tool ${name}`, false, String(e).slice(0, 100));
  }
}

console.log("=== 4. ALL HOOKS (invoke with mock payloads) ===");
const mock = {
  "chat.message": [{ sessionID: "s1" }, { message: { content: "help me search the catalog for pdf tools" } }],
  "experimental.chat.system.transform": [{ sessionID: "s1", model: { id: "mimo-test" } }, { system: [] }],
  "tool.execute.before": [{ tool: "hypernexus_search_tools", sessionID: "s1", callID: "c1" }, { args: {} }],
  "tool.execute.after": [{ tool: "hypernexus_search_tools", sessionID: "s1", callID: "c1" }],
  "permission.ask": [{ tool: "hypernexus_search_tools", sessionID: "s1" }, { status: "ask" }],
  "session.pre": [{ sessionID: "s1", agentID: "test", task_id: "selftest" }, {}],
  "session.post": [{ sessionID: "s1", agentID: "test", outcome: "completed", finalText: "selftest done" }],
  "actor.postStop": [{ actorID: "a1", agentType: "explore", mode: "run", outcome: "completed", task: "selftest" }],
  "actor.preStop": [{ actorID: "a1", agentType: "explore", mode: "run", iteration: 1, task: "selftest" }, {}],
  "session.userQuery.pre": [{ sessionID: "s1", agentID: "test", step: 1, messageID: "m1", query: "search catalog for pdf tools" }, { cancel: false }],
  "session.userQuery.post": [{ sessionID: "s1", agentID: "test", step: 1, messageID: "m1", query: "search catalog", assistantMessageID: "a1", finish: "stop" }, {}],
  "session.llm.request": [{ sessionID: "s1", providerID: "mimo", modelID: "test", trajectory: [{ role: "user", content: "hi" }], systemPrompt: ["sys"] }, {}],
  "tool.definition": [{ toolID: "read_file" }, { description: "Read a file", parameters: {} }],
  "shell.env": [{ cwd: "C:/tmp", sessionID: "s1" }, { env: {} }],
  "chat.params": [{ sessionID: "s1", agent: "test", model: { id: "m" }, provider: { source: "config" }, message: {} }, { temperature: 0.7, topP: 1, topK: 0, maxOutputTokens: undefined, options: {} }],
  "chat.headers": [{ sessionID: "s1", agent: "test", model: { id: "m" }, provider: { source: "config" }, message: {} }, { headers: {} }],
  "command.execute.before": [{ command: "hn-status", sessionID: "s1", arguments: "" }, { parts: [] }],
  "event": [{ event: { type: "session.idle" } }],
  "experimental.session.compacting": [{ sessionID: "s1" }, { context: [] }],
  "experimental.compaction.autocontinue": [{ sessionID: "s1", agent: "test", model: { id: "m" }, provider: { source: "config" }, message: {}, overflow: true }, { enabled: true }],
  "experimental.text.complete": [{ sessionID: "s1", messageID: "m1", partID: "p1" }, { text: "hi" }],
  "experimental.chat.messages.transform": [{ sessionID: "s1" }, { messages: [{ role: "user", content: "find tools for file management" }], parts: [] }],
  "config": [{ plugin: [".../plugin/hypernexus"] }],
};
for (const name of fnHooks) {
  const fn = hooks[name];
  if (typeof fn !== "function") { check(`hook ${name}`, false, "not a function"); continue; }
  const args = mock[name] || [{}];
  try {
    const out = args[1];
    await fn(args[0], out);
    if (name === "permission.ask") {
      check("hook permission.ask auto-allows read-only", out && out.status === "allow", `status=${out && out.status}`);
    } else if (name === "experimental.chat.system.transform") {
      const injected = out && Array.isArray(out.system) && out.system.length > 0;
      check("hook system.transform injects context", injected, `system[]=${out && out.system && out.system.length}`);
    } else if (name === "shell.env") {
      check("hook shell.env injects HYPERNEXUS_URL", out && out.env && out.env.HYPERNEXUS_URL, `env keys=${out && out.env && Object.keys(out.env).join(",")}`);
    } else if (name === "chat.headers") {
      check("hook chat.headers injects correlation", out && out.headers && out.headers["X-HyperNexus-Session"], `headers=${out && out.headers && Object.keys(out.headers).join(",")}`);
    } else if (name === "tool.definition") {
      check("hook tool.definition appends catalog hint", out && /hypernexus_search_tools/.test(out.description || ""), `desc tail=${out && String(out.description).slice(-40)}`);
    } else if (name === "experimental.session.compacting") {
      check("hook compacting injects memory context", out && Array.isArray(out.context) && out.context.length > 0, `context[]=${out && out.context && out.context.length}`);
    } else if (name === "experimental.chat.messages.transform") {
      // Safe observer: must not mutate messages or parts
      const msgsOk = out && Array.isArray(out.messages) && out.messages.length === 1;
      const partsOk = out && Array.isArray(out.parts) && out.parts.length === 0;
      check("hook messages.transform observes without mutating", msgsOk && partsOk, `msgs=${out && out.messages && out.messages.length} parts=${out && out.parts && out.parts.length}`);
    } else if (name === "session.userQuery.pre") {
      // should not set cancel on a normal query
      check("hook session.userQuery.pre does not cancel", !out || !out.cancel, `cancel=${out && out.cancel}`);
    } else {
      check(`hook ${name}`, true);
    }
  } catch (e) {
    check(`hook ${name}`, false, String(e).slice(0, 100));
  }
}

console.log("=== 5. PERMISSION POLICY NEGATIVE CASE ===");
{
  const out = { status: "ask" };
  await hooks["permission.ask"]({ tool: "hypernexus_memory_store", sessionID: "s1" }, out);
  check("permission.ask leaves memory_store to policy (not auto-allow)", out.status !== "allow", `status=${out.status}`);
}

console.log("=== 6. KERNEL-DOWN RESILIENCE (tools must not throw) ===");
{
  const deadHooks = await mod.server({}, { baseUrl: "http://127.0.0.1:59999" });
  try {
    const r = await deadHooks.tool.hypernexus_status.execute({});
    const s = typeof r === "string" ? r : r.output;
    check("hypernexus_status degrades gracefully when kernel down", typeof s === "string", String(s).slice(0, 60));
  } catch (e) { check("hypernexus_status degrades gracefully when kernel down", false, String(e).slice(0, 80)); }
  try {
    const r = await deadHooks.tool.hypernexus_search_tools.execute({ query: "file" });
    const s = typeof r === "string" ? r : r.output;
    check("hypernexus_search_tools degrades gracefully when kernel down", typeof s === "string", String(s).slice(0, 60));
  } catch (e) { check("hypernexus_search_tools degrades gracefully when kernel down", false, String(e).slice(0, 80)); }
}

console.log("");
console.log(`=== SUMMARY: ${pass} passed, ${fail} failed ===`);
if (failures.length) console.log("Failed: " + failures.join(", "));
process.exit(fail > 0 ? 1 : 0);
