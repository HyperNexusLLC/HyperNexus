#!/usr/bin/env node
// probe-names.mjs — map the tool-name allow-list boundary.
const names = ["bash", "powershell", "run_shell_command", "exec", "shell",
  "read", "write", "edit", "grep", "find", "ls", "codebase_search",
  "mcp_call_tool", "add_memory", "search_memory", "system_status",
  "code_interpreter", "Bash", "Shell", "terminal"];
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
    const text = await r.text();
    const verdict = r.status === 200 ? "ALLOW" : "DENY ";
    console.log(`${verdict} ${name}: HTTP ${r.status} ${text.slice(0, 100).replace(/\n/g, " ")}`);
  } catch (e) { console.log(`ERROR ${name}: ${e.message?.slice(0, 80)}`); }
}
