#!/usr/bin/env node
// HyperNexus addon: codex-cli — native meta/muse-spark-1.3-contributor + hypernexus MCP + skills/hooks.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-codex-cli]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const CODEX_SRC = path.join(HERE, "..", "codex");
const CODEX_HOME = process.env.CODEX_HOME ? process.env.CODEX_HOME : path.join(HOME, ".codex");
const CFG = path.join(CODEX_HOME, "config.toml");
const SKILLS_DIR = path.join(CODEX_HOME, "skills");
const HOOKS_DIR = path.join(CODEX_HOME, "hooks");
const CORE_SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
const AGENT = "hypernexus-orchestrator";
const COMMANDS = ["hn-status", "hn-search", "hn-store", "hn-session", "hn-context", "hn-summary", "hn-tools", "hn-purge"];
const HOOKS = ["hn-session.sh", "hn-rbac.sh", "hn-pre-tool.sh"];
function exe() { return "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe"; }
function ensureToml(t) {
  let s = t ?? "";
  const need = (re, block) => { if (!re.test(s)) s += (s.endsWith("\n") || s === "" ? "" : "\n") + block; };
  if (!/^model\s*=/m.test(s)) s = `model = "muse-spark-1.3-contributor"\n` + s;
  else s = s.replace(/^model\s*=.*$/m, `model = "muse-spark-1.3-contributor"`);
  if (!/^model_provider\s*=/m.test(s)) s = s.replace(/^model\s*=.*$/m, (m) => `${m}\nmodel_provider = "meta"`);
  else s = s.replace(/^model_provider\s*=.*$/m, `model_provider = "meta"`);
  need(/\[model_providers\.meta\]/, `\n[model_providers.meta]\nname = "Meta Model API (via HyperNexus kernel: live pi-OAuth token, no stale copies)"\nbase_url = "http://127.0.0.1:7778/v1"\nenv_key = "MODEL_API_KEY"\nwire_api = "responses"\n`);
  need(/\[mcp_servers\.hypernexus\]/, `\n[mcp_servers.hypernexus]\ncommand = '${exe()}'\nargs = ["mcp"]\n\n[mcp_servers.hypernexus.env]\nHYPERNEXUS_URL = "http://127.0.0.1:7778"\nHYPERNEXUS_WORKSPACE_ROOT = 'C:/Users/hyper/workspace/HyperNexus'\n`);
  return s;
}
function installSkillsHooks() {
  let n = 0;
  for (const name of CORE_SKILLS) {
    const src = path.join(CODEX_SRC, "skills", name, "SKILL.md");
    if (!fs.existsSync(src)) { log(`WARNING: missing source skill ${src}, skipping.`); continue; }
    write(path.join(SKILLS_DIR, name, "SKILL.md"), fs.readFileSync(src, "utf8")); n++;
  }
  const asrc = path.join(CODEX_SRC, "agent", AGENT + ".md");
  if (fs.existsSync(asrc)) { write(path.join(SKILLS_DIR, AGENT, "SKILL.md"), fs.readFileSync(asrc, "utf8")); n++; }
  for (const name of COMMANDS) {
    const csrc = path.join(CODEX_SRC, "commands", name + ".md");
    if (!fs.existsSync(csrc)) continue;
    write(path.join(SKILLS_DIR, name, "SKILL.md"), fs.readFileSync(csrc, "utf8")); n++;
  }
  for (const h of HOOKS) {
    const hsrc = path.join(CODEX_SRC, "hooks", h);
    if (!fs.existsSync(hsrc)) continue;
    write(path.join(HOOKS_DIR, h), fs.readFileSync(hsrc, "utf8")); n++;
  }
  const rsrc = path.join(CODEX_SRC, "hooks", "README.md");
  if (fs.existsSync(rsrc)) write(path.join(HOOKS_DIR, "README.md"), fs.readFileSync(rsrc, "utf8"));
  return n;
}
function install() {
  write(CFG, ensureToml(read(CFG)));
  const n = installSkillsHooks();
  log(`meta provider + hypernexus MCP ensured in ${CFG} (key via MODEL_API_KEY, synced from pi) + ${n} skills/hooks.`);
  return true;
}
function check() {
  const gaps = [];
  const raw = read(CFG);
  if (!raw) gaps.push(`missing ${CFG}`);
  else {
    if (!/^model\s*=\s*"muse-spark-1\.3-contributor"/m.test(raw)) gaps.push("model is not muse-spark-1.3-contributor");
    if (!/^model_provider\s*=\s*"meta"/m.test(raw)) gaps.push("model_provider is not meta");
    if (!/\[mcp_servers\.hypernexus\]/.test(raw)) gaps.push("no [mcp_servers.hypernexus]");
  }
  for (const n of [...CORE_SKILLS, AGENT, ...COMMANDS]) {
    if (!fs.existsSync(path.join(SKILLS_DIR, n, "SKILL.md"))) gaps.push(`missing skill ${n}`);
  }
  for (const h of HOOKS) {
    if (!fs.existsSync(path.join(HOOKS_DIR, h))) gaps.push(`missing hook ${h}`);
  }
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: meta model + hypernexus MCP + ${CORE_SKILLS.length + 1 + COMMANDS.length} skills + ${HOOKS.length} hooks.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: config + skills left in place by design.");
else install();
