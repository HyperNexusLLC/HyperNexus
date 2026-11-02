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
const SRC_REMINDERS = path.join(HERE, "reminders");

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
const REMINDERS_DEST = path.join(opencodeDir, "reminders");

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
  if (fs.existsSync(SRC_REMINDERS)) {
    for (const entry of fs.readdirSync(SRC_REMINDERS, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      copyUtf8(path.join(SRC_REMINDERS, entry.name), path.join(REMINDERS_DEST, entry.name));
    }
    log(`reminders → ${REMINDERS_DEST}`);
  }
  if (fs.existsSync(SRC_BIN)) {
    copyUtf8(SRC_BIN, path.join(PLUGIN_DEST, "meta-muse-key.mjs"));
    log(`meta key minter → ${PLUGIN_DEST}`);
  }
  // V1→V2 config migration: singular "provider" is retired; plural "providers"
  // with package "env" is the V2 shape (see meta-model.opencode.jsonc).
  migrateV1Provider(findConfigFile());
  migrateMetaProviderId(findConfigFile());
  ensureMetaProvider(findConfigFile());
  ensureBashGuard(findConfigFile());
  if (!noMcp) registerMcpConfig();
  log("done. Restart OpenCode (or run `opencode service restart`) to load the plugin.");
}

/**
 * Rewrite a retired V1 `provider.meta` block (npm/options/apiKey) into the
 * collision-free V2 `providers["meta-hn"]` form (see migrateMetaProviderId)
 * `providers["meta-hn"]` shape (npm/env/options) without touching secrets —
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
  // NOTE: the models entry carries `releaseDate` on purpose. The config
  // overlay sets model.time ONLY from releaseDate, and core Model.snapshot
  // sorts on time.released with direct access — a time-less entry crashes
  // startup ("ae.time.released"). The plugin registers the same complete
  // Model.Info as backstop for the reverse transform order.
  config.providers = config.providers || {};
  if (!config.providers["meta-hn"]) {
    config.providers["meta-hn"] = {
      name: v1?.name || "Meta (muse-spark via HyperNexus proxy)",
      env: ["META_MUSE_API_KEY"],
      npm: "@opencode/ai/providers/openai-compatible",
      options: { baseURL: "http://127.0.0.1:7778/v1" },
      models: {
        "muse-spark-1.3-contributor": {
          name: "Muse Spark 1.3 Contributor",
          releaseDate: "2026-09-02",
          limit: { context: 1048576, output: 131072 },
        },
      },
    };
  }
  delete config.provider; // V1 singular key is rejected by V2 schema validation
  writeUtf8(file, JSON.stringify(config, null, 2) + "\n");
  log(`migrated V1 provider.meta → V2 providers["meta-hn"] in ${file} (apiKey now {env:META_MUSE_API_KEY}).`);
  migrateMetaProviderId(file);
  return true;
}

/**
 * Rename a legacy `providers.meta` block to collision-free `providers["meta-hn"]`
 * (and `package` → schema-valid `npm`), forcing the kernel proxy baseURL.
 * A custom "meta" id is shadowed by opencode's built-in "meta" (images)
 * provider → direct https://api.meta.ai/v1 → 403 on subscription keys
 * (proven 2026-11-02: binary strings + live packet trace of serve --stdio).
 * Also rewrites a pinned top-level model "meta/..." to "meta-hn/...".
 * No-op when nothing legacy is present. Returns true when rewritten.
 */
function migrateMetaProviderId(file) {
  let config = {};
  if (!fs.existsSync(file)) return false;
  try {
    config = JSON.parse(stripJsonc(fs.readFileSync(file, "utf8")));
  } catch (err) {
    log(`WARNING: could not parse ${file}: ${err.message}. Skipping meta id migration.`);
    return false;
  }
  let dirty = false;
  if (config && typeof config === "object" && (config.providers === void 0 || config.providers === null)) {
    config.providers = {}; // stripped/minimal configs have no providers block yet (2026-11-02 crash: reading 'meta-hn' of undefined)
  }
  const legacy = config?.providers?.meta;
  if (legacy && typeof legacy === "object" && !config.providers["meta-hn"]) {
    const { package: _dropped, ...rest } = legacy;
    config.providers["meta-hn"] = {
      name: rest?.name || "Meta (muse-spark via HyperNexus proxy)",
      env: Array.isArray(rest?.env) && rest.env.length ? rest.env : ["META_MUSE_API_KEY"],
      npm: "@opencode/ai/providers/openai-compatible",
      options: { baseURL: "http://127.0.0.1:7778/v1" },
    };
    delete config.providers.meta;
    dirty = true;
  } else if (legacy && typeof legacy === "object") {
    delete config.providers.meta; // both present: drop the shadowed legacy block
    dirty = true;
  }
  const hnEntry = config.providers["meta-hn"];
  if (hnEntry && typeof hnEntry === "object") {
    // The config overlay sets model.time ONLY from `releaseDate`, and core
    // Model.snapshot sorts `right.time.released - left.time.released` with
    // direct access (opencode v2.2.5 source: packages/core/src/model.ts,
    // config/plugin/provider.ts). A models entry without releaseDate leaves the
    // model time-less → startup crash "ae.time.released". Backfill the
    // models.dev catalog release_date; preserve any user-customized fields.
    if (!hnEntry.models || typeof hnEntry.models !== "object") hnEntry.models = {};
    const m = hnEntry.models["muse-spark-1.3-contributor"];
    if (m && typeof m === "object") {
      if (m.releaseDate === void 0) {
        m.releaseDate = "2026-09-02";
        dirty = true;
      }
    } else {
      hnEntry.models["muse-spark-1.3-contributor"] = {
        name: "Muse Spark 1.3 Contributor",
        releaseDate: "2026-09-02",
        limit: { context: 1048576, output: 131072 },
      };
      dirty = true;
    }
  }
  if (typeof config?.model === "string" && config.model.startsWith("meta/")) {
    config.model = "meta-hn/" + config.model.slice("meta/".length);
    dirty = true;
  }
  if (!dirty) return false;
  writeUtf8(file, JSON.stringify(config, null, 2) + "\n");
  log(`migrated providers.meta → providers["meta-hn"] (proxy baseURL) in ${file}.`);
  return true;
}

/**
 * Seed `providers["meta-hn"]` when absent (fresh or stripped configs).
 * Shape mirrors meta-model.opencode.jsonc: npm loader, env key reference,
 * kernel proxy baseURL, and a `models` entry WITH `releaseDate` — the config
 * overlay sets model.time ONLY from releaseDate, and core Model.snapshot
 * sorts on time.released with direct access (time-less model = startup crash).
 * No-op when the provider block is already present (releaseDate backfill for
 * existing blocks lives in migrateMetaProviderId).
 * Returns true when the file was rewritten.
 */
function ensureMetaProvider(file) {
  let config = {};
  if (fs.existsSync(file)) {
    try {
      config = JSON.parse(stripJsonc(fs.readFileSync(file, "utf8")));
    } catch (err) {
      log(`WARNING: could not parse ${file}: ${err.message}. Skipping meta provider seed.`);
      return false;
    }
  }
  if (config && typeof config === "object" && config.providers && typeof config.providers === "object" && config.providers["meta-hn"]) return false; // already seeded
  if (!config || typeof config !== "object") config = {};
  if (!config.providers || typeof config.providers !== "object") config.providers = {};
  config.providers["meta-hn"] = {
    name: "Meta (muse-spark via HyperNexus proxy)",
    env: ["META_MUSE_API_KEY"],
    npm: "@opencode/ai/providers/openai-compatible",
    options: { baseURL: "http://127.0.0.1:7778/v1" },
    models: {
      "muse-spark-1.3-contributor": {
        name: "Muse Spark 1.3 Contributor",
        releaseDate: "2026-09-02",
        limit: { context: 1048576, output: 131072 },
      },
    },
  };
  writeUtf8(file, JSON.stringify(config, null, 2) + "\n");
  log(`seeded providers["meta-hn"] (proxy baseURL, models with releaseDate) in ${file}.`);
  return true;
}

/**
 * Ensure the Meta attestation guard: native `bash` must be off the model
 * payload or subscription requests 403 (client_attestation_denied, bisected
 * 2026-11-01). Shell work goes through the hypernexus/* plugin tools.
 * No-op when already set. Returns true when the file was rewritten.
 */
function ensureBashGuard(file) {
  let config = {};
  if (fs.existsSync(file)) {
    try {
      config = JSON.parse(stripJsonc(fs.readFileSync(file, "utf8")));
    } catch (err) {
      log(`WARNING: could not parse ${file}: ${err.message}. Skipping bash guard.`);
      return false;
    }
  } else {
    return false;
  }
  if (config?.tools?.bash === false) return false; // already guarded
  config.tools = (config.tools && typeof config.tools === "object") ? config.tools : {};
  config.tools.bash = false;
  writeUtf8(file, JSON.stringify(config, null, 2) + "\n");
  log(`enabled tools.bash=false attestation guard in ${file}.`);
  return true;
}

function uninstallAll() {
  for (const target of [PLUGIN_DEST, AGENT_DEST, path.join(SKILLS_DEST, "hypernexus"), path.join(SKILLS_DEST, "hypernexus-ops"), path.join(SKILLS_DEST, "hypernexus-workflows"), path.join(SKILLS_DEST, "hypernexus-orchestrator"), path.join(REMINDERS_DEST, "hn-memory-first.md"), path.join(REMINDERS_DEST, "hn-verify-ops.md")]) {
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
  for (const reminder of ["hn-memory-first.md", "hn-verify-ops.md"]) {
    const reminderSrc = path.join(SRC_REMINDERS, reminder);
    if (fs.existsSync(reminderSrc)) {
      ok = same(reminderSrc, path.join(REMINDERS_DEST, reminder)) && ok;
    }
  }
  const file = findConfigFile();
  let mcpOk = false;
  let metaOk = false;
  let bashGuardOk = false;
  if (fs.existsSync(file)) {
    try {
      const cfg = JSON.parse(stripJsonc(fs.readFileSync(file, "utf8")));
      mcpOk = !!cfg?.mcp?.servers?.hypernexus;
      const meta = cfg?.providers?.["meta-hn"];
      metaOk = !!meta && meta?.options?.baseURL === "http://127.0.0.1:7778/v1" &&
        Array.isArray(meta?.env) && meta.env.includes("META_MUSE_API_KEY") &&
        typeof meta?.models?.["muse-spark-1.3-contributor"]?.releaseDate === "string";
      bashGuardOk = cfg?.tools?.bash === false;
      if (cfg?.provider) {
        log(`NOTE: retired V1 singular "provider" key still present in ${file} — run install (no flags) to migrate to plural "providers".`);
      }
    } catch {
      mcpOk = false;
    }
  }
  if (!mcpOk) log(`NOTE: MCP server 'hypernexus' not present in ${file} (register with: node install.mjs${globalMode ? " --global" : ""})`);
  if (!metaOk) log(`NOTE: V2 providers["meta-hn"] (muse-spark-1.3-contributor, env META_MUSE_API_KEY, proxy baseURL) not present in ${file} (see meta-model.opencode.jsonc)`);
  if (!bashGuardOk) log(`NOTE: tools.bash=false attestation guard not present in ${file} (run install (no flags) to enable; subscription 403s otherwise)`);
  log(ok ? "CHECK PASSED" : "CHECK FAILED");
  process.exit(ok ? 0 : 1);
}

if (check) checkAll();
else if (uninstall) uninstallAll();
else install();
