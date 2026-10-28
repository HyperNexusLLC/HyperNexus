#!/usr/bin/env node
/**
 * HyperNexus Droid installer
 * ==========================
 *
 * Installs the HyperNexus plugin into a Droid local marketplace and registers
 * the kernel's stdio MCP server in ~/.factory/mcp.json when missing.
 *
 * Usage:
 *   node install.mjs [--marketplace <dir>] [--uninstall] [--check] [--no-mcp]
 *
 * Modes:
 *   (default)   copy plugin/ -> <marketplace>/hypernexus + write marketplace.json
 *   --check     verify installation state, exit non-zero on drift
 *   --uninstall remove installed artifacts
 *   --no-mcp    skip MCP server registration
 *
 * Default marketplace dir: addons/droid/marketplace/ (install from there with
 *   droid plugin marketplace add <that-dir>
 *   droid plugin install hypernexus@hypernexus-marketplace --scope user
 * ).
 * All writes are UTF-8 WITHOUT BOM.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_PLUGIN = path.join(HERE, "plugin", "hypernexus");

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const optValue = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};

const uninstall = has("--uninstall");
const check = has("--check");
const noMcp = has("--no-mcp");
const marketplaceDir = path.resolve(optValue("--marketplace") || path.join(HERE, "marketplace"));
const DEST_PLUGIN = path.join(marketplaceDir, "hypernexus");

function log(m) { console.log(`[hypernexus-droid-install] ${m}`); }
function fail(m) { console.error(`[hypernexus-droid-install] FAIL: ${m}`); process.exit(1); }

function writeUtf8(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyTree(s, d);
    else if (e.isFile()) writeUtf8(d, fs.readFileSync(s, "utf8"));
  }
}

function rmTree(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function marketplaceManifest() {
  return JSON.stringify({
    name: "hypernexus-marketplace",
    description: "HyperNexus control-plane plugin for Droid (memory, MCP tools, skills, commands, hooks, droids).",
    owner: { name: "HyperNexus" },
    plugins: [
      {
        name: "hypernexus",
        description: "HyperNexus AI control plane: L1/L2/L3 memory, MCP discovery, skills, commands, hooks, droids.",
        source: "./hypernexus",
      },
    ],
  }, null, 2) + "\n";
}

function drift() {
  const problems = [];
  const need = [
    ".factory-plugin/plugin.json", "mcp.json", "hooks/hooks.json",
    "skills/hypernexus/SKILL.md", "skills/hypernexus-ops/SKILL.md",
    "skills/hypernexus-workflows/SKILL.md",
    "commands/hn-status.md", "commands/hn-store.md", "commands/hn-remember.md",
    "commands/hn-search.md", "commands/hn-tools.md", "commands/hn-session.md",
    "commands/hn-context.md", "commands/hn-plan.md", "commands/hn-summary.md",
    "commands/hn-restore.md", "commands/hn-purge.md",
    "droids/hypernexus-orchestrator.md", "droids/hypernexus-researcher.md",
    "output-styles/hypernexus-report.md", "README.md",
  ];
  for (const f of need) {
    if (!fs.existsSync(path.join(DEST_PLUGIN, f))) problems.push(`missing ${f}`);
  }
  const hooksPath = path.join(DEST_PLUGIN, "hooks", "hooks.json");
  if (fs.existsSync(hooksPath)) {
    try {
      const h = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
      for (const ev of ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SessionEnd", "PreCompact", "SubagentStop"]) {
        if (!h[ev]) problems.push(`hooks.json missing event ${ev}`);
      }
    } catch (e) { problems.push(`hooks.json unparseable: ${e.message}`); }
  }
  return problems;
}

const MCP_PATH = path.join(os.homedir(), ".factory", "mcp.json");
function ensureMcp() {
  let cfg = { mcpServers: {} };
  if (fs.existsSync(MCP_PATH)) {
    try { cfg = JSON.parse(fs.readFileSync(MCP_PATH, "utf8")); }
    catch (e) { fail(`cannot parse ${MCP_PATH}: ${e.message}`); }
  }
  cfg.mcpServers = cfg.mcpServers || {};
  if (!cfg.mcpServers.hypernexus) {
    cfg.mcpServers.hypernexus = {
      type: "stdio",
      command: "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe",
      args: ["mcp"],
      timeout: 120000,
      connectTimeout: 60000,
      disabled: false,
    };
    fs.mkdirSync(path.dirname(MCP_PATH), { recursive: true });
    writeUtf8(MCP_PATH, JSON.stringify(cfg, null, 2) + "\n");
    log(`registered hypernexus MCP server in ${MCP_PATH}`);
  } else {
    log("hypernexus MCP server already present — untouched");
  }
}

if (check) {
  const problems = drift();
  if (problems.length) { for (const p of problems) console.error(`drift: ${p}`); process.exit(1); }
  log("OK — marketplace plugin matches source layout");
  process.exit(0);
}

if (uninstall) {
  rmTree(DEST_PLUGIN);
  log(`removed ${DEST_PLUGIN} (marketplace.json kept)`);
  process.exit(0);
}

if (!fs.existsSync(SRC_PLUGIN)) fail(`plugin source missing: ${SRC_PLUGIN}`);
rmTree(DEST_PLUGIN);
copyTree(SRC_PLUGIN, DEST_PLUGIN);
fs.mkdirSync(path.join(marketplaceDir, ".factory-plugin"), { recursive: true });
writeUtf8(path.join(marketplaceDir, ".factory-plugin", "marketplace.json"), marketplaceManifest());
log(`installed hypernexus plugin -> ${DEST_PLUGIN}`);
log(`marketplace manifest -> ${path.join(marketplaceDir, ".factory-plugin", "marketplace.json")}`);
log(`next: droid plugin marketplace add ${marketplaceDir}`);
log(`      droid plugin install hypernexus@hypernexus-marketplace --scope user`);
if (!noMcp) ensureMcp();
