#!/usr/bin/env node
// tool-audit.mjs — fire-and-forget HyperNexus audit log for MCP/harness tool calls.
import { readStdin, postLater } from "./hn-hook-lib.mjs";
const input = await readStdin();
const tool = String(input.tool_name || "?").slice(0, 64);
postLater("/api/memory/observations/record", {
  type: "tool-call", title: `droid-tool:${tool}`, content: `${tool} via droid`,
  metadata: { source: "droid-plugin", tool },
});
