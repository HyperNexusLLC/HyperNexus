#!/usr/bin/env node
/**
 * HyperNexus OpenCode installer
 * =============================
 *
 * Installs the HyperNexus plugin + skills + orchestrator agent into an OpenCode
 * project (.opencode/) or the global OpenCode config (~/.config/opencode/), and
 * registers the kernel's stdio MCP server (`hypernexus mcp`) when missing.
 *
 * Usage:
 *   node install.mjs [--project <dir>] [--global] [--uninstall] [--check] [--no-mcp]
 *
 * Modes:
 *   (default)   install into <dir>/.opencode/   (dir defaults to cwd)
 *   --global    install into ~/.config/opencode/
 *   --uninstall remove installed artifacts
 *   --check     verify installation state and exit non-zero on drift
 *   --no-mcp    skip MCP server registration
 *
 * All writes are UTF-8 WITHOUT BOM (Go/Node parsers reject BOM).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_PLUGIN = path.join(HERE, "plugin", "hypernexus");
const SRC_SKILLS = path.join(HERE, "skills");
const SRC_AGENT = path.join(HERE, "agent", "hypernexus-orchestrator.md");
const SRC_BIN = path.join(HERE, "bin", "meta-muse-key.mjs");

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
const opencodeDir = globalMode ? path.join(os.homedir(), ".config", "opencode") : path.join(projectDir, ".opencode");

const PLUGIN_DEST = path.join(opencodeDir, "plugins", "hypernexus");
const SKILLS_DEST = path.join(opencodeDir, "skills");
const AGENT_DEST = path.join(opencodeDir, "agent", "hypernexus-orchestrator.md");

function log(msg) {
  console.log(`[hypernexus-install] ${msg}`);
}

function writeUtf8(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8"); // utf8 → no BOM
}

function copyUtf8(src, dest) {
  writeUtf8(dest, fs.readFileSync(src, "utf8"));
}

// ── JSONC-safe config editing ────────────────────────────────────────────────

function stripJsonc(text) {
  let out = "";
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
      continue;
    }
    out += c;
  }
  return out.replace(/,\s*([}\]])/g, "$1"); // trailing commas
}

function findConfigFile() {
  for (const name of ["opencode.jsonc", "opencode.json"]) {
    const p = path.join(opencodeDir, name);
    if (fs.existsSync(p)) return p;
  }
  return path.join(opencodeDir, "opencode.jsonc");
}

function mcpCommand() {
  const override = process.env.HYPERNEXUS_MCP_COMMAND;
  if (override) return override.split(/\s+/).filter(Boolean);
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  for (const c of [
    path.join(projectDir, "bin", exe),
    path.join(HERE, "..", "..", "bin", exe),
    path.join(os.homedir(), ".hypernexus", "bin", exe),
  ]) {
    if (fs.existsSync(c)) return [c, "mcp"];
  }
  return [process.platform === "win32" ? "hypernexus.exe" : "hypernexus", "mcp"];
}

function registerMcpConfig() {
  // Prefer the OpenCode CLI (preserves unrelated config), fall back to direct edit.
  const cmd = mcpCommand();
  try {
    execFileSync("opencode", ["mcp", "add", "hypernexus", ...(globalMode ? ["--global"] : []), "--", ...cmd], {
      stdio: "inherit",
      cwd: globalMode ? projectDir : projectDir,
    });
    log(`MCP server 'hypernexus' registered via opencode CLI (${cmd.join(" ")})`);
    return;
  } catch {
    /* fall through to config edit */
  }
  const file = findConfigFile();
  let config = {};
  if (fs.existsSync(file)) {
    try {
      config = JSON.parse(stripJsonc(fs.readFileSync(file, "utf8")));
    } catch (err) {
      log(`WARNING: could not parse ${file}: ${err.message}. Skipping MCP registration.`);
      return;
    }
  }
  config["$schema"] = config["$schema"] || "https://opencode.ai/config.json";
  config.mcp = config.mcp || {};
  config.mcp.servers = config.mcp.servers || {};
  if (config.mcp.servers.hypernexus) {
    log("MCP server 'hypernexus' already configured — leaving untouched.");
    return;
  }
  config.mcp.servers.hypernexus = {
    type: "local",
    command: cmd,
    environment: {
      HYPERNEXUS_URL: process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778",
      HYPERNEXUS_WORKSPACE_ROOT: projectDir,
    },
    timeout: { startup: 45000 },
  };
  writeUtf8(file, JSON.stringify(config, null, 2) + "\n");
  log(`MCP server 'hypernexus' written to ${file} (${cmd.join(" ")})`);
}

// ── Install / uninstall / check ──────────────────────────────────────────────

function install() {
  log(`installing → ${opencodeDir} (${globalMode ? "global" : "project"})`);
  for (const f of ["index.js", "rpc.js", "package.json"]) {
    copyUtf8(path.join(SRC_PLUGIN, f), path.join(PLUGIN_DEST, f));
  }
  log(`plugin → ${PLUGIN_DEST}`);
  if (fs.existsSync(SRC_SKILLS)) {
    for (const entry of fs.readdirSync(SRC_SKILLS, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(SRC_SKILLS, entry.name, "SKILL.md");
      if (fs.existsSync(src)) {
        copyUtf8(src, path.join(SKILLS_DEST, entry.name, "SKILL.md"));
      }
    }
    log(`skills → ${SKILLS_DEST}`);
  }
  if (fs.existsSync(SRC_AGENT)) {
    copyUtf8(SRC_AGENT, AGENT_DEST);
    log(`agent → ${AGENT_DEST}`);
  }
  if (fs.existsSync(SRC_BIN)) {
    copyUtf8(SRC_BIN, path.join(PLUGIN_DEST, "meta-muse-key.mjs"));
    log(`meta key minter → ${PLUGIN_DEST}`);
  }
  // V1→V2 config migration: singular "provider" is retired; plural "providers"
  // with package "env" is the V2 shape (see meta-model.opencode.jsonc).
  migrateV1Provider(findConfigFile());
  if (!noMcp) registerMcpConfig();
  log("done. Restart OpenCode (or run `opencode service restart`) to load the plugin.");
}

/**
 * Rewrite a retired V1 `provider.meta` block (npm/options/apiKey) into the V2
 * `providers.meta` shape (package/env/settings) without touching secrets —
 * the apiKey value is replaced by the {env:META_MUSE_API_KEY} reference.
 * No-op when no V1 block exists. Returns true when the file was rewritten.
 */
function migrateV1Provider(file) {
  let config = {};
  if (fs.existsSync(file)) {
    try {
      config = JSON.parse(stripJsonc(fs.readFileSync(file, "utf8")));
    } catch (err) {
      log(`WARNING: could not parse ${file}: ${err.message}. Skipping provider migration.`);
      return false;
    }
  } else {
    return false;
  }
  const v1 = config?.provider?.meta;
  if (!v1 || typeof v1 !== "object") return false; // nothing to migrate
  const models = v1?.options?.models || v1?.models || {
    "muse-spark-1.3-contributor": { name: "Muse Spark 1.3 Contributor", limit: { context: 1048576, output: 131072 } },
  };
  config.providers = config.providers || {};
  if (!config.providers.meta) {
    config.providers.meta = {
      name: v1?.name || "Meta (muse-spark)",
      env: ["META_MUSE_API_KEY"],
      package: "@opencode/ai/providers/openai-compatible",
      options: { baseURL: v1?.options?.baseURL || "http://127.0.0.1:7778/v1" },
      models,
    };
  }
  delete config.provider; // V1 singular key is rejected by V2 schema validation
  writeUtf8(file, JSON.stringify(config, null, 2) + "\n");
  log(`migrated V1 provider.meta → V2 providers.meta in ${file} (apiKey now {env:META_MUSE_API_KEY}).`);
  return true;
}

function uninstallAll() {
  for (const target of [PLUGIN_DEST, AGENT_DEST, path.join(SKILLS_DEST, "hypernexus"), path.join(SKILLS_DEST, "hypernexus-ops"), path.join(SKILLS_DEST, "hypernexus-workflows"), path.join(SKILLS_DEST, "hypernexus-orchestrator")]) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      log(`removed ${target}`);
    } catch (err) {
      log(`WARNING: could not remove ${target}: ${err.message}`);
    }
  }
  log("note: MCP server config entry 'hypernexus' is left in place — remove it from opencode.json(c) manually if desired.");
}

function checkAll() {
  let ok = true;
  const same = (src, dest) => {
    if (!fs.existsSync(dest)) {
      log(`MISSING: ${dest}`);
      return false;
    }
    const a = fs.readFileSync(src, "utf8");
    const b = fs.readFileSync(dest, "utf8");
    if (a !== b) {
      log(`DRIFT: ${dest} differs from ${src}`);
      return false;
    }
    return true;
  };
  for (const f of ["index.js", "rpc.js", "package.json"]) {
    ok = same(path.join(SRC_PLUGIN, f), path.join(PLUGIN_DEST, f)) && ok;
  }
  ok = same(SRC_AGENT, AGENT_DEST) && ok;
  for (const skill of ["hypernexus", "hypernexus-ops", "hypernexus-workflows", "hypernexus-orchestrator"]) {
    const skillSrc = path.join(SRC_SKILLS, skill, "SKILL.md");
    if (fs.existsSync(skillSrc)) {
      ok = same(skillSrc, path.join(SKILLS_DEST, skill, "SKILL.md")) && ok;
    } else {
      log(`NOTE: skill source missing (plugin falls back to inline content): ${skillSrc}`);
    }
  }
  if (fs.existsSync(SRC_BIN)) {
    ok = same(SRC_BIN, path.join(PLUGIN_DEST, "meta-muse-key.mjs")) && ok;
  }
  const file = findConfigFile();
  let mcpOk = false;
  let metaOk = false;
  if (fs.existsSync(file)) {
    try {
      const cfg = JSON.parse(stripJsonc(fs.readFileSync(file, "utf8")));
      mcpOk = !!cfg?.mcp?.servers?.hypernexus;
      const meta = cfg?.providers?.meta;
      metaOk = !!meta && (meta?.options?.baseURL === "http://127.0.0.1:7778/v1" || meta?.options?.baseURL === "https://api.meta.ai/v1") &&
        Array.isArray(meta?.env) && meta.env.includes("META_MUSE_API_KEY") &&
        !!meta?.models?.["muse-spark-1.3-contributor"];
      if (cfg?.provider) {
        log(`NOTE: retired V1 singular "provider" key still present in ${file} — run install (no flags) to migrate to plural "providers".`);
      }
    } catch {
      mcpOk = false;
    }
  }
  if (!mcpOk) log(`NOTE: MCP server 'hypernexus' not present in ${file} (register with: node install.mjs${globalMode ? " --global" : ""})`);
  if (!metaOk) log(`NOTE: V2 providers.meta (muse-spark-1.3-contributor, env META_MUSE_API_KEY) not present in ${file} (see meta-model.opencode.jsonc)`);
  log(ok ? "CHECK PASSED" : "CHECK FAILED");
  process.exit(ok ? 0 : 1);
}

if (check) checkAll();
else if (uninstall) uninstallAll();
else install();
