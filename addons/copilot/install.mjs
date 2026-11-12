#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.join(HERE, "plugin", "hypernexus");
const args = new Set(process.argv.slice(2));

function resolveCli() {
  const configured = process.env.COPILOT_CLI;
  if (configured && fs.existsSync(configured)) return configured;
  const names = process.platform === "win32"
    ? ["copilot.exe", "copilot.cmd", "copilot.bat"]
    : ["copilot"];
  for (const directory of (process.env.PATH || "").split(path.delimiter)) {
    for (const name of names) {
      const candidate = path.join(directory, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return configured || "copilot";
}

const cli = resolveCli();

function fail(message) {
  process.stderr.write(`[hypernexus-copilot] ${message}\n`);
  process.exit(1);
}

function invoke(parameters) {
  const result = spawnSync(cli, parameters, {
    stdio: "inherit",
    timeout: 180000,
    windowsHide: true,
  });
  if (result.error) fail(`could not run Copilot CLI: ${result.error.message}`);
  if (result.status === null && result.signal) fail(`Copilot CLI was interrupted (${result.signal})`);
  return result;
}

function verifySource() {
  const required = [
    "plugin.json",
    "mcp.json",
    "mcp-launcher.mjs",
    "README.md",
    "skills/hypernexus/SKILL.md",
    "skills/hypernexus-ops/SKILL.md",
    "skills/hypernexus-workflows/SKILL.md",
    "com.github.copilot/agents/hypernexus-orchestrator.agent.md",
    "com.github.copilot/agents/hypernexus-researcher.agent.md",
    "com.github.copilot/rules/hypernexus.md",
  ];
  for (const relative of required) {
    if (!fs.existsSync(path.join(PLUGIN, relative))) fail(`plugin source is missing ${relative}`);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, "plugin.json"), "utf8"));
  const mcp = JSON.parse(fs.readFileSync(path.join(PLUGIN, "mcp.json"), "utf8"));
  const hooks = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", ".github", "hooks", "hypernexus.json"), "utf8"));
  const workspaceMcp = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", ".mcp.json"), "utf8"));
  const commands = fs.readdirSync(path.join(PLUGIN, "com.github.copilot", "commands"))
    .filter((name) => name.endsWith(".md"));
  if (manifest.name !== "hypernexus") fail("plugin.json has the wrong name");
  if (mcp.mcpServers?.hypernexus?.tools?.[0] !== "*") fail("plugin MCP configuration does not expose all tools");
  if (!workspaceMcp.mcpServers?.hypernexus) fail("workspace .mcp.json does not configure HyperNexus");
  if (commands.length !== 11) fail(`expected 11 slash commands, found ${commands.length}`);
  if (hooks.version !== 1 || !hooks.hooks?.preToolUse || !hooks.hooks?.sessionStart) {
    fail("Copilot hook configuration is incomplete");
  }
}

verifySource();

if (args.has("--check")) {
  process.stdout.write("[hypernexus-copilot] plugin, workspace MCP, and hooks are valid\n");
  process.exit(0);
}

if (args.has("--uninstall")) {
  const result = invoke(["plugin", "uninstall", "hypernexus"]);
  if (result.status !== 0) fail(`plugin uninstall failed (exit ${result.status})`);
  process.exit(0);
}

if (args.has("--help") || args.has("-h")) {
  process.stdout.write("Usage: node addons/copilot/install.mjs [--check|--uninstall]\n");
  process.exit(0);
}

const install = invoke(["plugin", "install", PLUGIN]);
if (install.status !== 0) fail(`plugin install failed (exit ${install.status})`);
process.stdout.write("[hypernexus-copilot] installed. Project hooks are loaded from .github/hooks/hypernexus.json\n");
