#!/usr/bin/env node
// probe-ns.mjs — exact-match vs substring: namespaced MCP tool names.
const names = ["mcp__hypernexus__bash", "mcp__hypernexus__add_memory",
  "mcp__hypernexus__search_memory", "mcp__hypernexus__system_status",
  "mcp__hypernexus__read", "mybash", "bash_tool", "memory_add",
  "add_memory_v2", "powershell_exec"];
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
    console.log(`${r.status === 200 ? "ALLOW" : "DENY "} ${name}: HTTP ${r.status}`);
  } catch (e) { console.log(`ERROR ${name}: ${e.message?.slice(0, 80)}`); }
}
