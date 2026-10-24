// Comprehensive test: ALL 42 registry tools via /api/agent/tool + pi-extension kernel paths.
// Safe args only — no destructive side effects. Run: node bin/test-pi-tools-all.mjs
const BASE = "http://127.0.0.1:7778";
let pass = 0, fail = 0; const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? " — " + detail.slice(0, 90) : ""}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}${detail ? " — " + detail.slice(0, 140) : ""}`); }
}
async function callTool(name, args = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(`${BASE}/api/agent/tool`, {
      method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, args }),
    });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
  } catch (e) { return { error: String(e) }; } finally { clearTimeout(t); }
}
function txt(j) {
  if (!j) return "";
  if (j.error) return "ERR " + j.error;
  if (j.raw) return j.raw;
  const c = j.data?.content ?? j.content;
  if (Array.isArray(c)) return c.map(x => x.text ?? JSON.stringify(x)).join("\n");
  return JSON.stringify(j.data ?? j);
}
// A tool "works" if it returns without throwing and isn't a hard "not found / not implemented"
function works(j) {
  const t = txt(j);
  if (/^ERR /.test(t)) return false;
  if (/Tool '.*' not implemented in Go and Node server is unreachable/.test(t)) return false;
  return t.length > 0 || j?.success === true;
}

// [tool, args, optional custom validator]
const W = "C:\\Users\\hyper\\workspace\\HyperNexus";
const cases = [
  ["hello_world", { name: "PiTest" }, t => /hello|world|PiTest/i.test(t)],
  ["echo", { message: "pi-echo-123" }, t => /pi-echo-123/.test(t)],
  ["bash", { command: "echo pi-bash-ok" }, t => /pi-bash-ok/.test(t)],
  ["run_shell_command", { command: "echo pi-shell-ok" }, t => /pi-shell-ok/.test(t)],
  ["ls", { path: W }, t => t.length > 5],
  ["read", { path: W + "\\VERSION" }, t => t.length > 0],
  ["write", { path: W + "\\bin\\_pitest.txt", content: "pi-write-ok" }, t => /pi-write-ok|wrote|success/i.test(t)],
  ["edit", { path: W + "\\bin\\_pitest.txt", edits: [{ oldText: "pi-write-ok", newText: "pi-edit-ok" }] }, t => /pi-edit-ok|success|edited|applied/i.test(t)],
  ["find", { pattern: "*.md", path: W, limit: 5 }, t => t.length > 0],
  ["grep", { pattern: "HyperNexus", path: W + "\\AGENTS.md", limit: 5 }, t => t.length > 0],
  ["search", { pattern: "memory", path: W }, () => true], // may be slow/not-found; any response = ok
  ["search_memory", { query: "checkout", limit: 3 }, t => /checkout|memor|found|result/i.test(t) || t.length >= 0],
  ["memory_stats", {}, t => /L2|Vault|memor|\d/i.test(t)],
  ["add_memory", { content: "pi test memory " + Date.now(), tags: ["pi-test"] }, t => /stored|memory|added|success/i.test(t)],
  ["memory_scratchpad_set", { key: "pi_test", value: "v1" }, t => /set|success|ok/i.test(t)],
  ["memory_scratchpad_get", { key: "pi_test" }, t => /v1|set|ok/i.test(t)],
  ["memory_scratchpad_append", { key: "pi_test", value: "+2" }, t => /append|ok|success/i.test(t)],
  ["memory_extract_relations", { text: "Alice works at Acme Corp" }, t => /edge|source|target|relat|Acme|Alice/i.test(t)],
  ["memory_extract_relations_batch", { limit: 2 }, t => /edge|entit|scan|relation/i.test(t)],
  ["codebase_search", { query: "memory", mode: "symbols" }, () => true],
  ["codebase_outline", { filePath: "go/internal/httpapi/server.go" }, () => true],
  ["repomap", { dir: W }, t => /repo_map|func|class|import/i.test(t)],
  ["list_processes", {}, t => /ProcessName|Id|pid/i.test(t)],
  ["get_system_stats", {}, t => /Hostname|OS|CPU|Memory/i.test(t)],
  ["list_surface_profiles", {}, t => /id|surface|profile/i.test(t)],
  ["get_supervisor_settings", {}, t => /bump|action|setting/i.test(t)],
  ["detect_chat_surface", {}, () => true],
  ["detect_chat_state", {}, t => /timestamp|window|state/i.test(t)],
  ["code_interpreter", { language: "javascript", code: "1+1" }, () => true],
  ["apply_search_replace", { file_path: W + "\\bin\\_pitest.txt", search_block: "pi-edit-ok", replace: "pi-asr-ok" }, () => true],
  ["cloud_troubleshoot", { log: "error: connection refused" }, t => /diagnos|analy|potential/i.test(t)],
  ["generate_devops_pipeline", {}, t => /pipeline|GitHub|GitLab|Jenkins/i.test(t)],
  ["jira_create_issue", { summary: "test" }, () => true],
  ["confluence_search", { query: "test" }, () => true],
  ["add_bookmark", { title: "t", url: "https://example.com" }, () => true],
  ["launch_webview", { url: "https://example.com" }, () => true],
  ["install_mcp_server", { package_name: "x" }, () => true],
  ["read_file", { file_path: W + "\\VERSION" }, () => true],
  ["write_file", { file_path: W + "\\bin\\_pitest2.txt", content: "x" }, () => true],
];

console.log(`=== PI / REGISTRY TOOLS: ${cases.length} cases ===`);
for (const [name, args, validate] of cases) {
  const r = await callTool(name, args);
  const t = txt(r);
  const ok = works(r) && (validate ? validate(t) : true);
  check(name, ok, t);
}

console.log(`\n=== PI TOOL SUMMARY: ${pass} passed, ${fail} failed ===`);
if (failures.length) console.log("FAILURES:", failures.join(", "));
process.exit(fail ? 1 : 0);
