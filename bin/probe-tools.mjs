// Probe: time each tool individually with a hard cap to find hangs. node bin/probe-tools.mjs
const BASE = "http://127.0.0.1:7778";
const W = "C:\\Users\\hyper\\workspace\\HyperNexus";
const cases = [
  ["hello_world", { name: "P" }], ["echo", { message: "x" }],
  ["bash", { command: "echo hi" }], ["run_shell_command", { command: "echo hi" }],
  ["ls", { path: W }], ["read", { path: W + "\\VERSION" }],
  ["write", { path: W + "\\bin\\_probe.txt", content: "x" }],
  ["edit", { path: W + "\\bin\\_probe.txt", edits: [{ oldText: "x", newText: "y" }] }],
  ["find", { pattern: "*.md", path: W + "\\addons", limit: 3 }],
  ["grep", { pattern: "HyperNexus", path: W + "\\addons", limit: 3 }],
  ["search", { pattern: "HyperNexus", path: W + "\\addons", limit: 3 }],
  ["search_memory", { query: "checkout", limit: 2 }],
  ["memory_stats", {}], ["add_memory", { content: "probe " + Date.now() }],
  ["memory_scratchpad_set", { key: "p", value: "v" }],
  ["memory_scratchpad_get", { key: "p" }],
  ["memory_scratchpad_append", { key: "p", value: "+" }],
  ["memory_extract_relations", { text: "Alice works at Acme" }],
  ["memory_extract_relations_batch", { limit: 1 }],
  ["codebase_search", { query: "memory", mode: "symbols" }],
  ["codebase_outline", { filePath: "go/internal/httpapi/server.go" }],
  ["repomap", { dir: W + "\\addons" }],
  ["list_processes", {}], ["get_system_stats", {}],
  ["list_surface_profiles", {}], ["get_supervisor_settings", {}],
  ["detect_chat_surface", {}], ["detect_chat_state", {}],
  ["code_interpreter", { language: "bash", code: "echo ci" }],
  ["apply_search_replace", { file_path: W + "\\bin\\_probe.txt", search_block: "y", replace: "z" }],
  ["cloud_troubleshoot", { log: "err" }], ["generate_devops_pipeline", {}],
  ["jira_create_issue", { summary: "t" }], ["confluence_search", { query: "t" }],
  ["add_bookmark", { title: "t", url: "https://e.com" }],
  ["launch_webview", { url: "https://e.com" }],
  ["install_mcp_server", { package_name: "x" }],
  ["read_file", { file_path: W + "\\VERSION" }],
  ["write_file", { file_path: W + "\\bin\\_probe2.txt", content: "x" }],
];
async function call(name, args) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  const start = Date.now();
  try {
    const r = await fetch(`${BASE}/api/agent/tool`, {
      method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, args }),
    });
    await r.text();
    return { ms: Date.now() - start, status: r.status };
  } catch (e) {
    return { ms: Date.now() - start, err: String(e).slice(0, 40) };
  } finally { clearTimeout(t); }
}
console.log(`probing ${cases.length} tools (12s cap each)...`);
for (const [name, args] of cases) {
  const r = await call(name, args);
  const flag = r.err ? "HANG/ERR" : r.ms > 8000 ? "SLOW" : "ok";
  console.log(`${flag.padEnd(8)} ${String(r.ms).padStart(6)}ms  ${name}  ${r.err ?? ("HTTP " + r.status)}`);
}
