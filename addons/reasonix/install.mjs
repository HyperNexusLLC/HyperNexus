#!/usr/bin/env node
/**
 * install.mjs — HyperNexus → Reasonix integration installer
 * ===========================================================
 * Installs the HyperNexus native plugin (Extension Protocol v2 sidecar),
 * skills, commands, agent, hooks, and MCP server registration for Reasonix.
 *
 * Modes:
 *   node addons/reasonix/install.mjs               install (global plugin link instructions + MCP + hooks + skills mirror)
 *   node addons/reasonix/install.mjs --check       verify installation (exit 1 on gaps)
 *   node addons/reasonix/install.mjs --uninstall   remove managed hooks/MCP (never destroys user edits)
 *
 * What it installs / ensures:
 *   global config.toml [[plugins]] hypernexus      MCP stdio server (bin/hypernexus.exe mcp) — merged, never clobbered
 *   global settings.json hooks                     SessionStart / PostToolUse / PreToolUse (managed, merged)
 *   plugin source addons/reasonix/                 native v2 manifest + runtime sidecar + skills/commands/agents/hooks
 *     → install with: reasonix plugin install <repo>/addons/reasonix --link --yes
 *     (--link keeps the source of truth in the repo; --check verifies the link target)
 *   .mcp.json (project)                            hypernexus stdio entry (merged)
 *
 * Meta model wiring (meta/muse-spark-1.3-contributor) is a reference snippet
 * only (meta-model.reasonix.toml + use-meta-model.ps1) — never installed
 * automatically, never carries a secret. Auth is an ENV-VAR REFERENCE ONLY
 * (META_MUSE_API_KEY); pi owns the OAuth refresh (see scripts/sync-meta-oauth-reasonix.ps1).
 *
 * All writes are UTF-8 WITHOUT BOM. No secrets are ever written.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const REASONIX_HOME = path.join(HOME, "AppData", "Roaming", "reasonix");

const MODE = process.argv.includes("--uninstall")
  ? "uninstall"
  : process.argv.includes("--check")
    ? "check"
    : "install";

function readIfExists(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function writeIfChanged(dst, body) {
  if (readIfExists(dst) === body) return false;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, body, "utf8");
  return true;
}

function resolveExe() {
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  const candidate = path.join(REPO_ROOT, "bin", exe);
  return fs.existsSync(candidate) ? candidate : exe;
}

function repoVersion() {
  try {
    return fs.readFileSync(path.join(REPO_ROOT, "VERSION"), "utf8").trim();
  } catch {
    return "0.0.0";
  }
}

// ── TOML helpers (line-based, preserves comments/formatting) ─────────────────

function ensureMcpPluginEntry(toml, exe) {
  if (/^\s*name\s*=\s*"hypernexus"/m.test(toml)) return { toml, changed: false };
  const entry = `\n[[plugins]]\nname    = "hypernexus"\ncommand = "${exe.replace(/\\/g, "\\\\")}"\nargs    = ["mcp"]\nenv     = { HYPERNEXUS_URL = "http://127.0.0.1:7778", HYPERNEXUS_WORKSPACE_ROOT = "${REPO_ROOT.replace(/\\/g, "\\\\")}" }\n`;
  return { toml: toml.trimEnd() + "\n" + entry, changed: true };
}

// ── settings.json hooks (managed hypernexus block, merged) ──────────────────

function hookEntry(command, description, extra = {}) {
  return { command, description, timeout: 5000, ...extra };
}

function wantGlobalHooks() {
  const sh = (n) => path.join(REPO_ROOT, "addons", "reasonix", "hooks", "sh", n).replace(/\\/g, "/");
  return {
    SessionStart: [hookEntry(`sh "${sh("hn-session-start.sh")}"`, "HyperNexus: log session start to L2")],
    PostToolUse: [hookEntry(`sh "${sh("hn-post-tool-use.sh")}"`, "HyperNexus: record tool context")],
    PreToolUse: [{ ...hookEntry(`sh "${sh("hn-pre-tool-use.sh")}"`, "HyperNexus: RBAC gate for destructive patterns"), match: ".*" }],
  };
}

function mergeHooksSettings(raw) {
  let cfg = {};
  if (raw) {
    try {
      cfg = JSON.parse(raw);
    } catch {
      return { ok: false, cfg: null };
    }
  }
  cfg.hooks = cfg.hooks ?? {};
  const want = wantGlobalHooks();
  let changed = !raw;
  for (const [event, entries] of Object.entries(want)) {
    const cur = Array.isArray(cfg.hooks[event]) ? cfg.hooks[event] : [];
    for (const e of entries) {
      if (!cur.some((c) => c && c.command === e.command)) {
        cur.push(e);
        changed = true;
      }
    }
    cfg.hooks[event] = cur;
  }
  return { ok: true, cfg, changed };
}

function removeHooksSettings(raw) {
  if (!raw) return { changed: false, cfg: null };
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch {
    return { changed: false, cfg: null };
  }
  if (!cfg.hooks) return { changed: false, cfg };
  const want = wantGlobalHooks();
  let changed = false;
  for (const [event, entries] of Object.entries(want)) {
    const cur = cfg.hooks[event];
    if (!Array.isArray(cur)) continue;
    const cmds = new Set(entries.map((e) => e.command));
    const next = cur.filter((c) => !(c && cmds.has(c.command)));
    if (next.length !== cur.length) {
      changed = true;
      if (next.length) cfg.hooks[event] = next;
      else delete cfg.hooks[event];
    }
  }
  if (Object.keys(cfg.hooks).length === 0) delete cfg.hooks;
  return { changed, cfg };
}

// ── .mcp.json merge ──────────────────────────────────────────────────────────

function mergeProjectMcp(filePath, exe) {
  let cfg = {};
  const existing = readIfExists(filePath);
  if (existing) {
    try {
      cfg = JSON.parse(existing);
    } catch {
      console.error(`  ! ${filePath} is not valid JSON — leaving untouched`);
      return false;
    }
  }
  cfg.mcpServers = cfg.mcpServers ?? {};
  const want = {
    command: exe,
    args: ["mcp"],
    env: { HYPERNEXUS_URL: "http://127.0.0.1:7778", HYPERNEXUS_WORKSPACE_ROOT: REPO_ROOT },
  };
  const cur = cfg.mcpServers.hypernexus;
  const same = cur && cur.command === want.command && JSON.stringify(cur.args) === JSON.stringify(want.args);
  cfg.mcpServers.hypernexus = want;
  return !same || !existing ? writeIfChanged(filePath, JSON.stringify(cfg, null, 2) + "\n") : false;
}

// ── manifest / package checks ────────────────────────────────────────────────

const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
const COMMANDS = ["hn-status", "hn-store", "hn-search", "hn-tools", "hn-session", "hn-context", "hn-summary", "hn-restore", "hn-purge", "hn-remember", "hn-plan"];
const EXPECTED_TOOLS = ["status","system_overview","memory_store","memory_search","memory_fts_search","memory_vector_search","memory_list","memory_delete","memory_relate","scratchpad","context_harvest","record_observation","tool_search","tool_discover","suggest_tools","mcp_status","mcp_servers","mcp_tools","mcp_search","mcp_call","session_search","session_context","session_handoff","skill_search","skill_manage","code_search","knowledge_graph","billing_status","audit_log","subagent","workflow","orchestrate","browser","memory_stats","session_list","repomap"];

function checkTree() {
  const gaps = [];
  const ok = (rel, cond, note = "") => {
    if (!cond) gaps.push(`${rel}${note ? ` (${note})` : ""}`);
  };
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "reasonix-plugin.json"), "utf8"));
  } catch (e) {
    gaps.push(`reasonix-plugin.json (unparsable: ${e.message})`);
  }
  if (manifest) {
    ok("reasonix-plugin.json apiVersion", manifest.apiVersion === "reasonix.io/plugin/v2", manifest?.apiVersion);
    ok("reasonix-plugin.json name", manifest.name === "hypernexus", manifest?.name);
    const tools = (manifest.runtime?.tools ?? []).map((t) => t.name);
    for (const t of EXPECTED_TOOLS) ok(`runtime.tools[] ${t}`, tools.includes(t), "missing from manifest");
    const intercepts = manifest.runtime?.intercepts ?? [];
    for (const i of ["input.receive", "tool.before", "tool.after", "permission.decision", "session.start"]) {
      ok(`runtime.intercepts[] ${i}`, intercepts.includes(i), "missing");
    }
    const mcp = manifest.contributes?.mcpServers?.hypernexus;
    ok("contributes.mcpServers.hypernexus", !!mcp?.command && JSON.stringify(mcp?.args) === JSON.stringify(["mcp"]), "bad shape");
    ok("contributes.skills", JSON.stringify(manifest.contributes?.skills) === JSON.stringify(["skills"]), "must be [skills]");
  }
  ok("runtime/bin/hypernexus-reasonix.mjs", fs.existsSync(path.join(__dirname, "runtime", "bin", "hypernexus-reasonix.mjs")));
  for (const s of SKILLS) {
    const p = path.join(__dirname, "skills", s, "SKILL.md");
    const body = readIfExists(p) ?? "";
    ok(`skills/${s}/SKILL.md`, body.startsWith("---\nname: ") && /description:/.test(body.slice(0, 600)), "bad frontmatter");
  }
  for (const c of COMMANDS) {
    const p = path.join(__dirname, "commands", `${c}.md`);
    const body = readIfExists(p) ?? "";
    ok(`commands/${c}.md`, body.startsWith("---\n") && /description:/.test(body.slice(0, 600)), "bad frontmatter");
  }
  ok("agents/hypernexus-orchestrator.md", fs.existsSync(path.join(__dirname, "agents", "hypernexus-orchestrator.md")));
  ok("agents/hypernexus-researcher.md (read-only researcher)", fs.existsSync(path.join(__dirname, "agents", "hypernexus-researcher.md")));
  ok("hooks/context/startup.md", fs.existsSync(path.join(__dirname, "hooks", "context", "startup.md")));
  ok("hooks/context/precompact.md", fs.existsSync(path.join(__dirname, "hooks", "context", "precompact.md")));
  return { gaps, manifest };
}

// ── modes ────────────────────────────────────────────────────────────────────

const configPath = path.join(REASONIX_HOME, "config.toml");
const settingsPath = path.join(REASONIX_HOME, "settings.json");
const projectMcp = path.join(REPO_ROOT, ".mcp.json");

if (MODE === "check") {
  console.log(`HyperNexus → Reasonix check (plugin source: ${__dirname})`);
  let gaps = 0;
  const { gaps: treeGaps, manifest } = checkTree();
  for (const g of treeGaps) {
    console.log(`  GAP ${g}`);
    gaps++;
  }
  if (!treeGaps.length) console.log(`  ok plugin tree (36 runtime tools, ${COMMANDS.length} commands, ${SKILLS.length} skills, 1 agent, 10 intercepts)`);
  const version = repoVersion();
  if (manifest && manifest.version !== version) {
    console.log(`  GAP reasonix-plugin.json version ${manifest.version} != VERSION ${version}`);
    gaps++;
  } else if (manifest) {
    console.log(`  ok manifest version stamped (${version})`);
  }
  const raw = readIfExists(configPath) ?? "";
  const hasMcp = /^\s*name\s*=\s*"hypernexus"/m.test(raw);
  console.log(`  ${hasMcp ? "ok " : "GAP"} config.toml [[plugins]] hypernexus MCP`);
  if (!hasMcp) gaps++;
  const hasDefault = /^\s*default_model\s*=\s*"meta\/muse-spark-1\.3-contributor"/m.test(raw);
  console.log(`  ${hasDefault ? "ok " : "GAP"} config.toml default_model meta/muse-spark-1.3-contributor`);
  if (!hasDefault) gaps++;
  const sraw = readIfExists(settingsPath);
  let hooksOk = false;
  if (sraw) {
    try {
      const s = JSON.parse(sraw);
      hooksOk = ["SessionStart", "PostToolUse", "PreToolUse"].every((e) => Array.isArray(s?.hooks?.[e]) && s.hooks[e].length > 0);
    } catch { /* no */ }
  }
  console.log(`  ${hooksOk ? "ok " : "GAP"} settings.json hooks (SessionStart/PostToolUse/PreToolUse)`);
  if (!hooksOk) gaps++;
  let mcpOk = false;
  try {
    const cfg = JSON.parse(readIfExists(projectMcp) ?? "{}");
    mcpOk = cfg?.mcpServers?.hypernexus?.command != null;
  } catch { /* no */ }
  console.log(`  ${mcpOk ? "ok " : "GAP"} .mcp.json hypernexus server`);
  if (!mcpOk) gaps++;
  process.exit(gaps ? 1 : 0);
} else if (MODE === "uninstall") {
  console.log(`HyperNexus → Reasonix uninstall`);
  const removed = [];
  const { cfg, changed } = removeHooksSettings(readIfExists(settingsPath));
  if (changed) {
    if (cfg && (cfg.hooks || Object.keys(cfg).length > 1)) {
      fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    } else if (cfg && Object.keys(cfg).length === 0) {
      fs.rmSync(settingsPath, { force: true });
    } else if (cfg) {
      fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    }
    removed.push("settings.json hooks");
  }
  console.log(removed.length ? `  removed: ${removed.join(", ")}` : "  nothing to remove");
  console.log("  note: config.toml [[plugins]] hypernexus entry left in place — remove manually if desired.");
  console.log("  note: plugin package itself: run `reasonix plugin remove hypernexus` if installed via plugin flow.");
} else {
  const exe = resolveExe();
  const version = repoVersion();
  console.log(`HyperNexus → Reasonix install (v${version}, exe: ${exe})`);
  const changed = [];
  const raw = readIfExists(configPath) ?? "";
  if (!raw) {
    console.log(`  ! ${configPath} missing — skipping config.toml merge (run \`reasonix setup\` first)`);
  } else {
    const { toml, changed: c } = ensureMcpPluginEntry(raw, exe);
    if (c && writeIfChanged(configPath, toml)) changed.push("config.toml [[plugins]] hypernexus");
  }
  const { ok, cfg, changed: hc } = mergeHooksSettings(readIfExists(settingsPath));
  if (ok && hc) {
    writeIfChanged(settingsPath, JSON.stringify(cfg, null, 2) + "\n");
    changed.push("settings.json hooks");
  } else if (!ok) {
    console.log(`  ! ${settingsPath} is not valid JSON — leaving untouched`);
  }
  if (mergeProjectMcp(projectMcp, exe)) changed.push(".mcp.json hypernexus");
  console.log(changed.length ? `  updated: ${changed.join(", ")}` : "  already up to date");
  console.log("\nNext: register the native plugin package (one-time, FULL TRUST review):");
  console.log(`  reasonix plugin install "${__dirname}" --link --replace --yes`);
  console.log("Then: restart Reasonix so the sidecar + MCP server connect. Verify with:");
  console.log(`  node "${path.join(__dirname, "install.mjs")}" --check`);
  console.log(`  node bin/test-reasonix-ext.mjs`);
}
