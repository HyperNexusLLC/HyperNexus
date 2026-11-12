// Execute all MiMo Desktop dist tools against the kernel. node test-desktop-tools.mjs
const DIR = "file:///C:/Users/hyper/workspace/HyperNexus/addons/mimo/tools/dist/";
const ARGS = {
  hypernexus_add_fact: { title: "dt fact", content: "desktop tool fact", tags: ["dt"] },
  hypernexus_billing_status: {},
  hypernexus_code_search: { query: "memory", mode: "symbols" },
  hypernexus_context_harvest: { topic: "memory" },
  hypernexus_knowledge_graph: { action: "add_entities", entities: [{ name: "DT", type: "test", observations: ["x"] }] },
  hypernexus_mcp_call: { serverName: "filesystem", toolName: "list" },
  hypernexus_mcp_search: { query: "memory", limit: 3 },
  hypernexus_memory_list: { limit: 3 },
  hypernexus_memory_vector_search: { query: "memory", limit: 3 },
  hypernexus_record_observation: { entity: "DT", observation: "desktop observation" },
  hypernexus_repomap: { dir: "addons", maxFiles: 20 },
  hypernexus_search_memory: { query: "memory", limit: 3 },
  hypernexus_session_context: { action: "get" },
  hypernexus_session_search: { query: "memory", limit: 3 },
  hypernexus_system_status: {},
  hypernexus_tool_discover: { intent: "search files" },
};
const names = Object.keys(ARGS);
let ok = 0; const results = [];
for (const n of names) {
  try {
    const mod = await import(DIR + n + ".js");
    const t = mod.default;
    const out = await t.execute(ARGS[n]);
    const s = typeof out === "string" ? out : JSON.stringify(out);
    // "Works" = not a hard 404/unreachable error
    const bad = /404 page not found|kernel unreachable|ERR_MODULE/i.test(s);
    if (!bad) ok++; else results.push(`FAIL ${n}: ${s.slice(0, 80)}`);
  } catch (e) {
    results.push(`FAIL ${n}: ${String(e).slice(0, 80)}`);
  }
}
console.log(`DESKTOP TOOLS: ${ok}/${names.length} passed`);
for (const r of results) console.log(" ", r);
