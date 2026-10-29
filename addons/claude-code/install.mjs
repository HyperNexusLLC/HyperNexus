#!/usr/bin/env node
/**
 * HyperNexus Claude Code installer
 * ================================
 *
 * Installs the HyperNexus plugin (commands + skills + agents + hooks) and
 * registers the kernel's stdio MCP server (`hypernexus mcp`).
 *
 * Layout installed:
 *   <dest>/hypernexus/.claude-plugin/plugin.json
 *   <dest>/hypernexus/.mcp.json          (absolute binary path, filled in here)
 *   <dest>/hypernexus/commands/hn-*.md
 *   <dest>/hypernexus/skills/<name>/SKILL.md
 *   <dest>/hypernexus/agents/*.md
 *   <dest>/hypernexus/hooks/hooks.json + hooks/scripts/*.mjs
 *
 * Usage:
 *   node install.mjs [--project <dir>] [--global] [--uninstall] [--check] [--no-mcp]
 *
 * Modes:
 *   (default)   install into <dir>/.claude/plugins/   (dir defaults to cwd)
 *   --global    install into ~/.claude/plugins/
 *   --uninstall remove installed artifacts
 *   --check     verify installation state and exit non-zero on drift
 *   --no-mcp    skip MCP server registration (plugin .mcp.json still installed)
 *
 * All writes are UTF-8 WITHOUT BOM (Node/Claude parsers reject BOM).
 * This installer never reads auth.json / token files and never prints secrets:
 * it only references the HYPERNEXUS_URL endpoint name. Meta OAuth is owned by
 * pi (~/.pi/agent/auth.json); the kernel's Anthropic shim reads it per request,
 * and bin/meta-muse-key.mjs mints override keys live when needed.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_PLUGIN = path.join(HERE, "plugin", "hypernexus");
const REPO_ROOT = path.resolve(HERE, "..", "..");

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const optValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};

const globalMode = has("--global");
const uninstall = has("--uninstall");
const check = has("--check");
const noMcp = has("--no-mcp");

const projectDir = path.resolve(optValue("--project") || process.cwd());
const pluginsDir = globalMode
  ? path.join(os.homedir(), ".claude", "plugins")
  : path.join(projectDir, ".claude", "plugins");
const PLUGIN_DEST = path.join(pluginsDir, "hypernexus");
const PROJECT_MCP = path.join(projectDir, ".mcp.json");

const COMMANDS = ["hn-status", "hn-store", "hn-search", "hn-tools", "hn-session",
  "hn-context", "hn-summary", "hn-purge", "hn-plan", "hn-remember", "hn-restore"];
const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
const AGENTS = ["hypernexus-orchestrator.md", "hypernexus-researcher.md"];
const HOOK_SCRIPTS = ["hn-log.mjs", "hn-gate.mjs", "hn-compact.mjs"];

function log(msg) {
  console.log(`[hypernexus-install] ${msg}`);
}

function fail(msg) {
  console.error(`[hypernexus-install] ERROR: ${msg}`);
  process.exit(1);
}

function writeUtf8(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8"); // utf8 → no BOM
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else if (entry.isFile()) writeUtf8(d, fs.readFileSync(s, "utf8"));
  }
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function kernelBin() {
  const override = process.env.HYPERNEXUS_MCP_COMMAND;
  if (override) return override.split(/\s+/).filter(Boolean);
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  for (const c of [
    path.join(REPO_ROOT, "bin", exe),
    path.join(os.homedir(), ".hypernexus", "bin", exe),
  ]) {
    if (fs.existsSync(c)) return [c, "mcp"];
  }
  return [path.join(REPO_ROOT, "bin", exe), "mcp"]; // best guess; verified below
}

function mcpJson(binArgs) {
  return {
    mcpServers: {
      hypernexus: {
        type: "stdio",
        command: binArgs[0],
        args: binArgs.slice(1),
        env: {
          HYPERNEXUS_WORKSPACE_ROOT: globalMode ? projectDir : REPO_ROOT,
          HYPERNEXUS_URL: "http://127.0.0.1:7778",
        },
      },
    },
  };
}

function mergeProjectMcp(binArgs) {
  let existing = {};
  if (fs.existsSync(PROJECT_MCP)) {
    try {
      existing = JSON.parse(fs.readFileSync(PROJECT_MCP, "utf8"));
    } catch {
      fail(`${PROJECT_MCP} is not valid JSON; refusing to modify it.`);
    }
  }
  existing.mcpServers = existing.mcpServers || {};
  existing.mcpServers.hypernexus = mcpJson(binArgs).mcpServers.hypernexus;
  return existing;
}

// ── uninstall ────────────────────────────────────────────────────────────────
if (uninstall) {
  rmrf(PLUGIN_DEST);
  if (fs.existsSync(PROJECT_MCP)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(PROJECT_MCP, "utf8"));
      if (cfg.mcpServers?.hypernexus) {
        delete cfg.mcpServers.hypernexus;
        writeUtf8(PROJECT_MCP, `${JSON.stringify(cfg, null, 2)}\n`);
        log(`removed hypernexus MCP server from ${PROJECT_MCP}`);
      }
    } catch {
      log(`left ${PROJECT_MCP} untouched (unparseable)`);
    }
  }
  log("uninstalled.");
  process.exit(0);
}

if (!fs.existsSync(SRC_PLUGIN)) fail(`plugin source missing: ${SRC_PLUGIN}`);

// ── check ────────────────────────────────────────────────────────────────────
if (check) {
  const problems = [];
  for (const rel of [
    ".claude-plugin/plugin.json",
    ".mcp.json",
    "hooks/hooks.json",
    ...HOOK_SCRIPTS.map((s) => `hooks/scripts/${s}`),
    ...AGENTS.map((a) => `agents/${a}`),
    ...SKILLS.map((s) => `skills/${s}/SKILL.md`),
    ...COMMANDS.map((c) => `commands/${c}.md`),
  ]) {
    if (!fs.existsSync(path.join(PLUGIN_DEST, rel))) problems.push(`missing ${rel}`);
  }
  // Byte-identity: installed copy must match the addon source.
  for (const rel of [
    ".claude-plugin/plugin.json",
    "hooks/hooks.json",
    ...HOOK_SCRIPTS.map((s) => `hooks/scripts/${s}`),
    ...AGENTS.map((a) => `agents/${a}`),
    ...SKILLS.map((s) => `skills/${s}/SKILL.md`),
    ...COMMANDS.map((c) => `commands/${c}.md`),
  ]) {
    const src = path.join(SRC_PLUGIN, rel);
    const dst = path.join(PLUGIN_DEST, rel);
    if (fs.existsSync(src) && fs.existsSync(dst)) {
      if (fs.readFileSync(src, "utf8") !== fs.readFileSync(dst, "utf8")) {
        problems.push(`drift ${rel}`);
      }
    }
  }
  // Minter must ship with the addon source.
  if (!fs.existsSync(path.join(HERE, "bin", "meta-muse-key.mjs"))) {
    problems.push("missing bin/meta-muse-key.mjs");
  }
  if (!noMcp && !globalMode) {
    try {
      const cfg = JSON.parse(fs.readFileSync(PROJECT_MCP, "utf8"));
      if (!cfg.mcpServers?.hypernexus) problems.push("project .mcp.json lacks hypernexus server");
    } catch {
      problems.push("project .mcp.json missing or unparseable");
    }
  }
  if (problems.length > 0) {
    for (const p of problems) console.error(`[hypernexus-install] drift: ${p}`);
    process.exit(1);
  }
  log("installation verified.");
  process.exit(0);
}

// ── install ──────────────────────────────────────────────────────────────────
const [bin, ...binRest] = kernelBin();
if (!fs.existsSync(bin)) {
  log(`WARNING: kernel binary not found at ${bin}; install continues, MCP will connect once bin/hypernexus.exe exists.`);
}

copyTree(SRC_PLUGIN, PLUGIN_DEST);
log(`plugin installed → ${PLUGIN_DEST}`);

// Fill the plugin .mcp.json with the absolute binary path.
writeUtf8(
  path.join(PLUGIN_DEST, ".mcp.json"),
  `${JSON.stringify(mcpJson([bin, ...binRest]), null, 2)}\n`,
);

if (!noMcp && !globalMode) {
  writeUtf8(PROJECT_MCP, `${JSON.stringify(mergeProjectMcp([bin, ...binRest]), null, 2)}\n`);
  log(`MCP server registered in ${PROJECT_MCP}`);
}

log("done. Launch: .\\use-meta-model.ps1  (or  claude --plugin-dir .claude\\plugins\\hypernexus)");
