#!/usr/bin/env node
// session-start.mjs — HyperNexus session bootstrap (never blocks startup).
import { readStdin, kfetch, outputContext } from "./hn-hook-lib.mjs";
const input = await readStdin();
const health = await kfetch("/health");
let status = "HyperNexus kernel: unreachable (offline - local tools only)";
if (health.ok) {
  const d = health.data?.data ?? health.data ?? {};
  status = `HyperNexus kernel: ONLINE${d.version ? ` (${d.version})` : ""} - L1/L2/L3 memory, MCP tools, knowledge graph available.`;
}
const goal = await kfetch(`/api/memory/session-bootstrap?cwd=${encodeURIComponent(String(input.cwd || "").slice(0, 120))}`);
let line = "";
if (goal.ok && goal.data) {
  const g = goal.data?.data ?? goal.data;
  line = `\nActive goal/handoff: ${JSON.stringify(g).slice(0, 600)}`;
}
outputContext("SessionStart",
  `## HyperNexus session\n${status}\nDiscipline: RECALL (search_memory) before multi-step work; PERSIST non-obvious outcomes with add_memory; DISCOVER via mcp_list_tools/mcp_call_tool on capability gaps; VERIFY via system_status around production changes. Hot-path budget 400ms - FTS only.${line}`);
