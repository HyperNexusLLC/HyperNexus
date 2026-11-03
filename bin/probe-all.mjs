#!/usr/bin/env node
// probe-all.mjs — test every remaining bare MCP/kernel tool name.
const names = ["write", "edit", "find", "grep", "ls", "delete_memory",
  "memory_stats", "repomap", "code_interpreter", "run_shell_command",
  "memory_scratchpad_get", "memory_scratchpad_set", "memory_extract_relations",
  "mcp_list_servers", "mcp_status", "billing_status", "get_system_stats",
  "codebase_outline", "hello_world", "echo", "apply_search_replace",
  "install_mcp_server", "launch_webview", "generate_devops_pipeline",
  "jira_create_issue", "confluence_search", "cloud_troubleshoot",
  "download_llamafile", "add_bookmark", "kill_process", "list_processes",
  "powershell_command", "cmd", "terminal_exec", "sh"];
for (const name of names) {
  try {
    const r = await fetch("http://127.0.0.1:7778/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "muse-spark-1.3-contributor", max_tokens: 1500,
        tools: [{ name, description: "t", input_schema: { type: "object", properties: {} } }],
        messages: [{ role: "user", content: `Call ${name}. You MUST call it.` }],
      }),
      signal: AbortSignal.timeout(180000),
    });
    await r.text();
    console.log(`${r.status === 200 ? "ALLOW" : "DENY "} ${name}`);
  } catch (e) { console.log(`ERROR ${name}: ${e.message?.slice(0, 60)}`); }
}
