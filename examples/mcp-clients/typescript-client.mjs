#!/usr/bin/env node
/**
 * HyperNexus MCP TypeScript/Node client example.
 *
 * Connects to the HyperNexus Go kernel HTTP API to list tools,
 * search for a tool, and call it.
 *
 * Usage:
 *   node typescript-client.mjs
 *   node typescript-client.mjs --search "file read"
 *   node typescript-client.mjs --call run_python --args '{"code": "print(1+1)"}'
 */

const BASE = "http://127.0.0.1:7778";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--search") opts.search = args[++i];
    else if (args[i] === "--call") opts.call = args[++i];
    else if (args[i] === "--args") opts.args = args[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs();

  const health = await get("/health");
  console.log("Kernel:", health);

  if (opts.search) {
    const result = await post("/api/mcp/tools/search", { query: opts.search });
    const tools = result.tools || [];
    console.log(`Found ${tools.length} tools:`);
    for (const t of tools.slice(0, 10)) {
      console.log(`  - ${t.name}: ${(t.description || "").slice(0, 80)}`);
    }
  } else if (opts.call) {
    const toolArgs = JSON.parse(opts.args || "{}");
    const result = await post("/api/mcp/tools/call", {
      tool: opts.call,
      args: toolArgs,
    });
    console.log(JSON.stringify(result, null, 2));
  } else {
    const result = await get("/api/mcp/tools");
    const tools = result.tools || [];
    console.log(`Available tools (${tools.length}):`);
    for (const t of tools.slice(0, 20)) {
      console.log(`  - ${t.name}`);
    }
    if (tools.length > 20) console.log(`  ... and ${tools.length - 20} more`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
