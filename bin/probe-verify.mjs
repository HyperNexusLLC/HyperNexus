#!/usr/bin/env node
// probe-verify.mjs — verify the live kernel has the attestation rename map.
const URL = "http://127.0.0.1:7778/v1/messages";
async function turn(name, tools, content) {
  const body = { model: "muse-spark-1.3-contributor", max_tokens: 1500, messages: [{ role: "user", content }] };
  if (tools) body.tools = tools.map((n) => ({ name: n, description: "t", input_schema: { type: "object", properties: {} } }));
  try {
    const r = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    const text = await r.text();
    let extra = "";
    if (r.status === 200) {
      try {
        const j = JSON.parse(text);
        const tu = (j.content || []).find((b) => b.type === "tool_use");
        extra = tu ? ` tool_use name=${tu.name}` : ` text=${JSON.stringify((j.content || []).map((b) => b.text || "").join(" ")).slice(0, 60)}`;
      } catch { extra = " (unparsed)"; }
    } else {
      extra = ` ${text.slice(0, 120).replace(/\n/g, " ")}`;
    }
    console.log(`${r.status === 200 ? "ALLOW" : "DENY "} ${name}: HTTP ${r.status}${extra}`);
  } catch (e) { console.log(`ERROR ${name}: ${e.message?.slice(0, 80)}`); }
}
await turn("plain-text", null, "reply with exactly: VERIFY_OK");
await turn("bare-bash", ["bash"], "Call bash. You MUST call it.");
await turn("bare-add_memory", ["add_memory"], "Call add_memory. You MUST call it.");
await turn("bare-web_search", ["web_search"], "Call web_search. You MUST call it.");
await turn("bare-powershell", ["powershell"], "Call powershell. You MUST call it.");
