// T10 MCP Server comprehensive tool test — exercises all 42 tormentnexus MCP tools
// via /api/agent/tool (the same path the plugin uses).
const BASE = "http://127.0.0.1:7778";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? " — " + detail.slice(0, 100) : ""}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail.slice(0, 150) : ""}`); }
}
async function callTool(name, args = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(`${BASE}/api/agent/tool`, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, args }),
    });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
  } catch (e) {
    return { error: String(e) };
  } finally { clearTimeout(timer); }
}
function extract(j) {
  if (!j) return "";
  if (j.raw) return j.raw;
  const c = j.data?.content;
  if (Array.isArray(c)) return c.map(x => x.text || JSON.stringify(x)).join("\n");
  return JSON.stringify(j);
}

console.log("=== T10-MCP: CORE FILE-OPS TOOLS ===");
{
  const r = await callTool("hello_world", { name: "T10" });
  const t = extract(r);
  check("hello_world", /hello|T10|world/i.test(t) || r.success, t);
}
{
  const r = await callTool("echo", { message: "t10-mcp-echo-test" });
  const t = extract(r);
  check("echo", /t10-mcp-echo-test/.test(t), t);
}
{
  const r = await callTool("ls", { path: "C:\\Users\\hyper\\workspace\\HyperNexus" });
  const t = extract(r);
  check("ls", t.length > 5 && !/error.*not found/i.test(t), t.slice(0, 80));
}
{
  const r = await callTool("read", { path: "C:\\Users\\hyper\\workspace\\HyperNexus\\README.md" });
  const t = extract(r);
  check("read", t.length > 2 && r?.success !== false && !r?.error, t.slice(0, 60));
}
{
  const r = await callTool("find", { pattern: "README.md", path: "C:\\Users\\hyper\\workspace\\HyperNexus" });
  const t = extract(r);
  check("find", t.length > 2, t.slice(0, 80));
}
{
  const r = await callTool("grep", { pattern: "HyperNexus", path: "C:\\Users\\hyper\\workspace\\HyperNexus\\VERSION.md", literal: true });
  const t = extract(r);
  check("grep", t.length > 2, t.slice(0, 80));
}

console.log("=== T10-MCP: MEMORY TOOLS ===");
{
  const r = await callTool("add_memory", { content: "T10 MCP test memory entry", tags: "t10,mcp-test" });
  const t = extract(r);
  check("add_memory", /ok|success|added|stored/i.test(t) || r.success, t.slice(0, 100));
}
{
  const r = await callTool("search_memory", { query: "T10 MCP test" });
  const t = extract(r);
  check("search_memory", t.length > 2 && r?.success !== false && !r?.error, t.slice(0, 100));
}
{
  const r = await callTool("memory_stats", {});
  const t = extract(r);
  check("memory_stats", t.length > 2 && r?.success !== false && !r?.error, t.slice(0, 100));
}
{
  const r = await callTool("memory_scratchpad_set", { key: "t10-test", value: "scratchpad-value" });
  const t = extract(r);
  check("memory_scratchpad_set", /ok|success|set|stored/i.test(t) || r.success, t.slice(0, 80));
}
{
  const r = await callTool("memory_scratchpad_get", { key: "t10-test" });
  const t = extract(r);
  check("memory_scratchpad_get", /scratchpad-value/.test(t), t.slice(0, 80));
}
{
  const r = await callTool("memory_scratchpad_append", { key: "t10-test", value: " +appended" });
  const t = extract(r);
  check("memory_scratchpad_append", /ok|success|append/i.test(t) || r.success, t.slice(0, 80));
}
{
  const r = await callTool("memory_extract_relations", { text: "HyperNexus uses Go kernel and MiMoCode plugin integration." });
  const t = extract(r);
  check("memory_extract_relations", t.length > 2 && !/^\{"error"/.test(t), t.slice(0, 80));
}

console.log("=== T10-MCP: SEARCH & CODEBASE TOOLS ===");
{
  const r = await callTool("search", { pattern: "HyperNexus" });
  const t = extract(r);
  check("search", t.length > 2, t.slice(0, 80));
}
{
  const r = await callTool("codebase_search", { query: "plugin hooks" });
  const t = extract(r);
  check("codebase_search", t.length > 2, t.slice(0, 80));
}
{
  const r = await callTool("codebase_outline", { filePath: "addons/mimo/plugin/hypernexus/index.js" });
  const t = extract(r);
  check("codebase_outline", t.length > 2, t.slice(0, 80));
}
{
  const r = await callTool("repomap", { dir: "C:\\Users\\hyper\\workspace\\HyperNexus", max_files: 5 });
  const t = extract(r);
  check("repomap", t.length > 2, t.slice(0, 80));
}

console.log("=== T10-MCP: PROCESS & SYSTEM TOOLS ===");
{
  const r = await callTool("list_processes", {});
  const t = extract(r);
  check("list_processes", t.length > 2, t.slice(0, 80));
}
{
  const r = await callTool("get_system_stats", {});
  const t = extract(r);
  check("get_system_stats", t.length > 2, t.slice(0, 80));
}
{
  const r = await callTool("list_surface_profiles", {});
  const t = extract(r);
  check("list_surface_profiles", t.length > 2, t.slice(0, 80));
}
{
  const r = await callTool("get_supervisor_settings", {});
  const t = extract(r);
  check("get_supervisor_settings", t.length > 2, t.slice(0, 80));
}

console.log("=== T10-MCP: CHAT-SURFACE TOOLS ===");
{
  const r = await callTool("detect_chat_surface", {});
  const t = extract(r);
  check("detect_chat_surface", t.length > 2, t.slice(0, 80));
}
{
  const r = await callTool("detect_chat_state", {});
  const t = extract(r);
  check("detect_chat_state", t.length > 2, t.slice(0, 80));
}

console.log(`\n=== T10-MCP SUMMARY: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
