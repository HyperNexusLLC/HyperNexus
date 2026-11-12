#!/usr/bin/env node
// probe-403.mjs — reproduce the bash/powershell description 403.
const tools = (name, desc) => [{ name, description: desc,
  input_schema: { type: "object", properties: { command: { type: "string" } } } }];
const cases = [
  ["bash-long", "Execute a shell command with optional timeout seconds."],
  ["bash-min", "shell"],
  ["bash-empty", ""],
  ["powershell-long", "Execute a PowerShell command with optional timeout."],
  ["powershell-min", "shell"],
  ["read-min", "read"],
];
for (const [name, desc] of cases) {
  const toolName = name.split("-")[0];
  try {
    const r = await fetch("http://127.0.0.1:7778/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "muse-spark-1.3-contributor", max_tokens: 1500,
        tools: tools(toolName, desc),
        messages: [{ role: "user", content: `Call ${toolName} with command "echo hi". You MUST call it.` }],
      }),
      signal: AbortSignal.timeout(180000),
    });
    const text = await r.text();
    console.log(`${name}: HTTP ${r.status} ${text.slice(0, 160).replace(/\n/g, " ")}`);
  } catch (e) { console.log(`${name}: FETCH FAIL ${e.message?.slice(0, 100)}`); }
}
