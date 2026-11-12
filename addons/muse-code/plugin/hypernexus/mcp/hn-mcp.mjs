#!/usr/bin/env node
/**
 * hn-mcp.mjs — launch the HyperNexus kernel stdio MCP server for Muse Code.
 *
 * Resolution order for the kernel binary:
 *   1. $HYPERNEXUS_MCP_COMMAND (command line, space-separated)
 *   2. Repo checkout layout: <plugin>/../../../.. → bin/hypernexus(.exe)
 *   3. ~/.hypernexus/bin/hypernexus(.exe)
 *   4. `hypernexus` on PATH (spawned with argv ["mcp"])
 *
 * This launcher never reads credentials and never prints secrets: stdio is
 * piped straight through to the kernel server.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function candidates() {
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  const list = [];
  if (process.env.HYPERNEXUS_MCP_COMMAND) {
    const parts = process.env.HYPERNEXUS_MCP_COMMAND.split(/\s+/).filter(Boolean);
    if (parts.length) list.push(parts);
  }
  // Repo checkout: mcp/ → hypernexus/ → plugin/ → muse-code/ → addons/ → repo/
  list.push([path.resolve(HERE, "..", "..", "..", "..", "..", "bin", exe), "mcp"]);
  list.push([path.join(os.homedir(), ".hypernexus", "bin", exe), "mcp"]);
  list.push(["hypernexus", "mcp"]);
  return list;
}

const tried = [];
for (const [cmd, ...args] of candidates()) {
  if (path.isAbsolute(cmd) && !fs.existsSync(cmd)) {
    tried.push(cmd);
    continue;
  }
  const child = spawn(cmd, args, { stdio: "inherit" });
  const code = await new Promise((resolve) => {
    child.on("error", () => resolve(null));
    child.on("exit", (c) => resolve(c));
  });
  if (code === null) continue; // spawn failed — try next candidate
  process.exit(code ?? 1);
}

process.stderr.write(
  `[hn-mcp] kernel binary not found (tried: ${tried.join(", ")}). ` +
    `Set HYPERNEXUS_MCP_COMMAND or install the kernel.\n`
);
process.exit(1);
