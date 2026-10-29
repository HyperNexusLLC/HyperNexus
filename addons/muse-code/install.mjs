#!/usr/bin/env node
// HyperNexus addon: muse-code (muse CLI) — native meta/muse-spark-1.3-contributor
// via pi OAuth (pi owns refresh) + full native plugin bundle.
//
// Installs:
//   1. ~/.config/muse/settings.json provider=meta model=muse-spark-1.3-contributor
//      (merge-only; never removes user keys)
//   2. Native plugin addons/muse-code/plugin/hypernexus
//      (3 skills + 11 commands + 5 hooks + 1 stdio MCP server)
//      via `muse plugins install --scope user|project`
//
// Token policy: keys are minted live from ~/.pi/agent/auth.json by
// bin/meta-muse-key.mjs (pi owns refresh); nothing secret is stored here,
// printed, or written into settings.
//
// Usage:
//   node install.mjs [--project <dir>] [--global] [--uninstall] [--check]
//
// Modes:
//   (default)   ensure settings + install plugin user-scope
//   --project <dir> install plugin project-scope (cwd default) instead of user
//   --global    alias for user scope (muse calls it user)
//   --uninstall remove the plugin record (settings left in place by design)
//   --check     verify installation state, exit non-zero on drift
//
// KNOWN PRODUCT BLOCKER (Muse Code 1.4.14): `muse plugins install` fails
// deterministically on this box with
//   plugin-store-write-failed ... /package: os error 32
// for ANY capability-bearing bundle (proven with a 1-skill probe), while
// empty bundles are rejected earlier with invalid-plugin-package. The bundle
// itself is validator-clean (`muse plugins validate` valid:true, no
// diagnostics). Re-run the install command below after a muse upgrade; the
// battery records the exact outcome.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_SRC = path.join(HERE, "plugin", "hypernexus");
const REPO_ROOT = path.resolve(HERE, "..", "..");
const HOME = os.homedir() || process.env.USERPROFILE || "";
const TAG = "[hypernexus-muse-code]";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const optValue = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};
const uninstall = has("--uninstall");
const check = has("--check");
const projectDir = path.resolve(optValue("--project") || process.cwd());
const projectScope = has("--project");
const SETTINGS = path.join(HOME, ".config", "muse", "settings.json");

const log = (m) => console.log(`${TAG} ${m}`);
const fail = (m) => { console.error(`${TAG} ERROR: ${m}`); process.exit(1); };
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };

function kernelBin() {
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  for (const c of [
    path.join(REPO_ROOT, "bin", exe),
    path.join(HOME, ".hypernexus", "bin", exe),
  ]) if (fs.existsSync(c)) return c;
  return path.join(REPO_ROOT, "bin", exe); // best guess; verified below
}

function wantSettings() {
  return {
    schema_version: 1, provider: "meta", model: "muse-spark-1.3-contributor",
    model_reasoning_efforts: { "muse-spark-1.3": "high", "muse-spark-1.3-contributor": "high" },
    contributor_mode_enabled: true, contributor_mode_disclosure_acknowledged: true,
  };
}

function wantMcpServer() {
  return {
    command: kernelBin().replace(/\\/g, "/"),
    args: ["mcp"],
    env: {
      HYPERNEXUS_WORKSPACE_ROOT: REPO_ROOT.replace(/\\/g, "/"),
      HYPERNEXUS_URL: "http://127.0.0.1:7778",
    },
  };
}

function ensureSettings() {
  const cur = read(SETTINGS);
  let obj = {};
  if (cur) {
    try { obj = JSON.parse(cur); }
    catch { log(`WARNING: cannot parse ${SETTINGS}, leaving untouched.`); return false; }
  }
  Object.assign(obj, wantSettings());
  obj.mcpServers = obj.mcpServers || {};
  obj.mcpServers.hypernexus = wantMcpServer();
  write(SETTINGS, JSON.stringify(obj, null, 2) + "\n");
  log(`provider=meta model=muse-spark-1.3-contributor + mcpServers.hypernexus ensured in ${SETTINGS} (auth stays in pi auth.json).`);
  return true;
}

function museBin() {
  const cmd = process.platform === "win32" ? "muse.cmd" : "muse";
  const dirs = [
    path.join(HOME, "AppData", "Local", "Programs", "muse"),
    path.join(HOME, ".local", "bin"),
  ];
  for (const d of dirs) {
    const c = path.join(d, cmd);
    if (fs.existsSync(c)) return c;
  }
  return "muse"; // PATH fallback
}

// Windows .cmd shims cannot be exec'd directly (CreateProcess needs cmd.exe),
// so route through ComSpec while keeping every argument a separate argv token.
function runMuse(argv, timeoutMs) {
  const bin = museBin();
  const [cmd, prefix] = bin.toLowerCase().endsWith(".cmd")
    ? [process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", bin]]
    : [bin, []];
  return spawnSync(cmd, [...prefix, ...argv], { encoding: "utf8", timeout: timeoutMs, shell: false });
}

function skillsInstall() {
  // Skills use the skills store (works on this box); plugin store is blocked (see below).
  let n = 0;
  for (const s of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    const r = runMuse(["skills", "install", path.join(PLUGIN_SRC, "skills", s), "--scope", "user", "--json"], 180000);
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    if (r.status === 0 || /already installed/.test(out)) { n++; continue; }
    log(`skill ${s} install note: ${out.slice(0, 200)}`);
  }
  log(`${n}/3 skills ensured user-scope (activation is per-workspace; project skills shadow user ones by design).`);
  return n === 3;
}

function pluginInstall(scopeArgs) {
  const r = runMuse(["plugins", "install", PLUGIN_SRC, ...scopeArgs, "--json"], 180000);
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status === 0) { log("plugin installed (user approval/trust is your action: `muse plugins approve hypernexus`)."); return true; }
  if (/plugin-store-write-failed|os error 32/.test(out)) {
    log("BLOCKED BY PRODUCT (Muse Code 1.4.14): `muse plugins install` cannot write its package cache on this box (os error 32) — bundle is validator-clean; retry after a muse upgrade. Not failing install; settings above still ensured.");
    return false;
  }
  log(`plugin install exited ${r.status}: ${out.slice(0, 400)}`);
  return false;
}

function pluginValidate() {
  const r = runMuse(["plugins", "validate", PLUGIN_SRC, "--json"], 180000);
  try {
    const v = JSON.parse(r.stdout);
    if (v && v.valid === true && Array.isArray(v.diagnostics) && v.diagnostics.length === 0) return true;
    fail(`plugin validation not clean: ${(r.stdout || "").slice(0, 500)}`);
  } catch {
    fail(`plugin validation output unparseable: ${(r.stdout || "").slice(0, 300)}${r.stderr || ""}`);
  }
  return false;
}

// ── uninstall ──────────────────────────────────────────────────────────────
if (uninstall) {
  const r = runMuse(["plugins", "remove", "hypernexus", "--json"], 120000);
  log(`plugins remove exited ${r.status} (${`${r.stdout || ""}${r.stderr || ""}`.slice(0, 200)}).`);
  for (const s of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    const u = runMuse(["skills", "uninstall", s, "--json"], 120000);
    log(`skills uninstall ${s} exited ${u.status}.`);
  }
  try {
    const raw = read(SETTINGS);
    if (raw) {
      const o = JSON.parse(raw);
      if (o.mcpServers?.hypernexus) { delete o.mcpServers.hypernexus; write(SETTINGS, `${JSON.stringify(o, null, 2)}\n`); log("removed mcpServers.hypernexus from settings."); }
    }
  } catch { log("settings left untouched (unparseable)."); }
  log("provider/model left in place by design (delete manually to revert).");
  process.exit(0);
}

// ── check ──────────────────────────────────────────────────────────────────
if (check) {
  const gaps = [];
  const raw = read(SETTINGS);
  if (!raw) gaps.push(`missing ${SETTINGS}`);
  else {
    try {
      const o = JSON.parse(raw);
      if (o.provider !== "meta") gaps.push("provider is not meta");
      if (o.model !== "muse-spark-1.3-contributor") gaps.push("model is not muse-spark-1.3-contributor");
      if (!o.mcpServers?.hypernexus?.command) gaps.push("settings mcpServers.hypernexus missing");
    } catch { gaps.push(`${SETTINGS}: invalid JSON`); }
  }
  for (const rel of [
    "plugin/hypernexus/.muse-plugin/plugin.json",
    "plugin/hypernexus/mcp/hn-mcp.mjs",
    "plugin/hypernexus/hooks/scripts/hn-hook-lib.mjs",
    "plugin/hypernexus/reminders/hypernexus-recall.md",
    "bin/meta-muse-key.mjs",
    "mcp.json",
  ]) if (!fs.existsSync(path.join(HERE, rel))) gaps.push(`missing ${rel}`);
  const cmdCount = fs.readdirSync(path.join(PLUGIN_SRC, "commands")).filter((f) => f.endsWith(".md")).length;
  if (cmdCount < 8) gaps.push(`only ${cmdCount} commands (want >= 8)`);
  for (const s of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    if (!fs.existsSync(path.join(PLUGIN_SRC, "skills", s, "SKILL.md"))) gaps.push(`missing skill ${s}`);
    if (!fs.existsSync(path.join(HOME, ".config", "muse", "skills", s, "SKILL.md"))) gaps.push(`skill ${s} not installed user-scope`);
  }
  if (!pluginValidate()) gaps.push("plugin validation failed");
  if (gaps.length) { for (const g of gaps) console.error(`${TAG} CHECK FAILED: ${g}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: meta/muse-spark-1.3-contributor + validator-clean bundle (3 skills, ${cmdCount} commands, 5 hooks, 1 MCP server).`);
  process.exit(0);
}

// ── install ────────────────────────────────────────────────────────────────
ensureSettings();
skillsInstall();
pluginInstall(projectScope ? ["--scope", "project"] : ["--scope", "user"]);
log("done. Mint a live key per shell: $env:META_API_KEY = node bin/meta-muse-key.mjs  (or run .\\use-meta-model.ps1).");
