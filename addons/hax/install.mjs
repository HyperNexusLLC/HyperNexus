#!/usr/bin/env node
/**
 * install.mjs — HyperNexus → hax integration installer
 * ====================================================
 * hax (minimalist C agent) has no MCP/extension/plugin/hook runtime — by design
 * (see hax docs/philosophy.md). The hax integration therefore binds to the four
 * substrates hax DOES support, and this installer wires all of them:
 *
 *   1. provider   — `meta` custom provider (openai-responses → api.meta.ai/v1)
 *                   reading its key LIVE from pi auth.json via api_key_env
 *                   (HAX_META_API_KEY) + ready-made presets (meta, hn-worker).
 *   2. skills     — 3 SKILL.md files into ~/.config/hax/skills/ (hax's slot #2),
 *                   byte-identical to the repo copies in addons/hax/skills/.
 *   3. AGENTS.md  — managed prompt-overlay block in <repo>/AGENTS.md (hax's repo
 *                   hierarchy slot) + optional global ~/.config/hax/AGENTS.md.
 *   4. CLI+cmds   — hn.mjs driver (+ `hn` wrapper when node is on PATH),
 *                   11 @-mentionable command files + turn scripts
 *
 * Modes:
 *   node addons/hax/install.mjs              install provider+skills+AGENTS overlay
 *   node addons/hax/install.mjs --check      verify (exit 1 on gaps)
 *   node addons/hax/install.mjs --uninstall  remove managed blocks/files
 *   node addons/hax/install.mjs --global     also write global ~/.config/hax/AGENTS.md
 *
 * The installer never overwrites user credentials: it merges the `meta` provider
 * and `meta`/`hn-worker` presets into ~/.config/hax/config.json, preserving all
 * other keys. The OAuth key itself is NEVER written to config.json — it is read
 * live from pi auth.json by meta-env.sh / the api_key_env binding.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const HAX_CONFIG_DIR = path.join(HOME, ".config", "hax");
const HAX_SKILLS_DIR = path.join(HAX_CONFIG_DIR, "skills");
const HAX_CONFIG = path.join(HAX_CONFIG_DIR, "config.json");

const MODE = process.argv.includes("--uninstall")
  ? "uninstall"
  : process.argv.includes("--check")
    ? "check"
    : "install";
const GLOBAL_AGENTS = process.argv.includes("--global");

const BEGIN = "<!-- hypernexus:begin";
const END = "<!-- hypernexus:end -->";
// Hax-scoped markers: the generic BEGIN/END above also prefix other lanes'
// blocks (codewhale, freebuff, codex, open-interpreter), so block ops must
// anchor on the hax-managed marker or they would clobber a sibling block.
const HAX_BEGIN = "<!-- hypernexus:begin (managed by addons/hax/install.mjs";
const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];

function repoVersion() {
  try { return fs.readFileSync(path.join(REPO_ROOT, "VERSION"), "utf8").trim(); }
  catch { return "0.0.0"; }
}
function readIfExists(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}
function writeIfChanged(dst, body) {
  if (readIfExists(dst) === body) return false;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, body, "utf8");
  return true;
}
function upsertManagedBlock(filePath, blockText) {
  const block = blockText.trim();
  const existing = readIfExists(filePath) ?? "";
  const b = existing.indexOf(HAX_BEGIN);
  const e = b >= 0 ? existing.indexOf(END, b) : -1;
  let next;
  if (b >= 0 && e > b) next = existing.slice(0, b) + block + existing.slice(e + END.length);
  else next = existing.trimEnd() + (existing.trimEnd() ? "\n\n" : "") + block + "\n";
  return writeIfChanged(filePath, next);
}
function removeManagedBlock(filePath) {
  const existing = readIfExists(filePath);
  if (existing === null) return false;
  const b = existing.indexOf(HAX_BEGIN);
  const e = b >= 0 ? existing.indexOf(END, b) : -1;
  if (b < 0 || e < 0) return false;
  return writeIfChanged(filePath, (existing.slice(0, b) + existing.slice(e + END.length)).trim() + "\n");
}
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

const overlayBlock = () => `<!-- hypernexus:begin (managed by addons/hax/install.mjs — do not edit inside this block) -->
## HyperNexus Control Plane (hax)

This workspace is backed by the local HyperNexus kernel (Go, port 7778) through the
\`addons/hax/hn.mjs\` CLI driver (hax has no MCP/extension runtime by design; the CLI
is the integration surface, composed via \`hax -p\` like any other Unix tool).

Discipline loop for multi-step work: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

Call the driver as \`node addons/hax/hn.mjs …\` (or \`./addons/hax/hn …\` when node is on PATH):

- **RECALL** — \`node addons/hax/hn.mjs fts "<keywords>"\` then
  \`node addons/hax/hn.mjs harvest "<task>"\` before deriving answers from scratch.
- **DISCOVER** — \`node addons/hax/hn.mjs tools "<need>"\` / \`suggest\`, then
  \`node addons/hax/hn.mjs call <tool> '<args-json>'\`. Orient with \`repomap\`/\`code\`.
- **PERSIST** — \`node addons/hax/hn.mjs store "<title>" "<content>" "t1,t2"\`
  for non-obvious outcomes; \`handoff\` at checkpoints; \`graph\` for entities/relations.
- **VERIFY** — \`node addons/hax/hn.mjs status\` before and after production changes.
- Commands: \`@addons/hax/commands/hn-<name>.md\` (store|search|status|tools|session|context|plan|summary|purge|orchestrate|remember) — @-mention one, the model reads it
- Turn scripts: \`sh addons/hax/scripts/hn-prime.sh "<task>"\` (session start),
  \`sh addons/hax/scripts/hn-turn.sh pre|post|compact "<text>"\` (turn maintenance).
- Skills: \`hypernexus\`, \`hypernexus-ops\`, \`hypernexus-workflows\`
  (\`~/.config/hax/skills/\`, mirrored in \`addons/hax/skills/\`).
- Degradation contract: kernel calls never stall a turn. If the kernel is down
  (\`status\` → \`"ok": false\`), continue from local files and say so in one sentence.
  All surfaces degrade to a clear error object — never reassuring fiction.
<!-- hypernexus:end -->`;

// ── config.json merge (provider + presets) ─────────────────────────────────
const META_PROVIDER = {
  base_url: "http://127.0.0.1:7778/v1", // HyperNexus kernel OpenAI-compat proxy (live pi-OAuth token per request; immune to 24h rotation + subscription 403s)
  api: "openai-responses",
  api_key_env: "HAX_META_API_KEY",
  display_name: "Meta Muse (pi OAuth)",
};
const META_PRESETS = {
  meta: {
    description: "Meta Muse Spark 1.3 Contributor via pi OAuth subscription (key from HAX_META_API_KEY, read live from pi auth.json)",
    provider: "meta",
    model: "muse-spark-1.3-contributor",
    tint: "teal",
  },
  "hn-worker": {
    description: "HyperNexus subagent worker: memory-first RECALL→DISCOVER→EXECUTE→PERSIST loop via addons/hax/hn.mjs",
    provider: "meta",
    model: "muse-spark-1.3-contributor",
    effort: "medium",
    system_prompt_append: "You are a HyperNexus worker. For the assigned subtask: RECALL via `node addons/hax/hn.mjs harvest`, DISCOVER via `tools`, EXECUTE, PERSIST via `store`. Report outcome + stored fact title.",
    tint: "violet",
  },
};

function mergeConfig() {
  const cfg = readJson(HAX_CONFIG) ?? {};
  cfg.providers = cfg.providers && typeof cfg.providers === "object" ? cfg.providers : {};
  cfg.presets = cfg.presets && typeof cfg.presets === "object" ? cfg.presets : {};
  let changed = false;
  const cur = cfg.providers.meta ?? {};
  if (JSON.stringify(cur) !== JSON.stringify({ ...META_PROVIDER, ...cur }) && JSON.stringify(cur) !== JSON.stringify(META_PROVIDER)) {
    cfg.providers.meta = { ...META_PROVIDER, ...cur };
    changed = true;
  }
  for (const [k, v] of Object.entries(META_PRESETS)) {
    if (JSON.stringify(cfg.presets[k]) !== JSON.stringify(v)) { cfg.presets[k] = v; changed = true; }
  }
  return { cfg, changed };
}

let gaps = [];
if (MODE === "uninstall") {
  removeManagedBlock(path.join(REPO_ROOT, "AGENTS.md"));
  if (GLOBAL_AGENTS) removeManagedBlock(path.join(HAX_CONFIG_DIR, "AGENTS.md"));
  for (const s of SKILLS) {
    try { fs.unlinkSync(path.join(HAX_SKILLS_DIR, s, "SKILL.md")); } catch {}
  }
  // Leave config.json entries (user-owned); note them.
  console.log("hax HyperNexus overlay removed (config.json provider/presets left in place).");
  process.exit(0);
}

if (MODE === "check") {
  const { cfg } = mergeConfig();
  const onDisk = readJson(HAX_CONFIG) ?? {};
  if (!["http://127.0.0.1:7778/v1", "https://api.meta.ai/v1"].includes(onDisk.providers?.meta?.base_url)) gaps.push("config.json: providers.meta missing");
  if (!onDisk.presets?.meta) gaps.push("config.json: presets.meta missing");
  if (!onDisk.presets?.["hn-worker"]) gaps.push("config.json: presets.hn-worker missing");
  for (const s of SKILLS) {
    const src = readIfExists(path.join(REPO_ROOT, "addons", "hax", "skills", s, "SKILL.md"));
    const dst = readIfExists(path.join(HAX_SKILLS_DIR, s, "SKILL.md"));
    if (!dst) gaps.push(`skills/${s}: not installed`);
    else if (src !== null && src !== dst) gaps.push(`skills/${s}: drift from repo copy`);
  }
  const agents = readIfExists(path.join(REPO_ROOT, "AGENTS.md")) ?? "";
  if (!agents.includes(HAX_BEGIN)) gaps.push("AGENTS.md: managed overlay block missing");
  if (GLOBAL_AGENTS) {
    const g = readIfExists(path.join(HAX_CONFIG_DIR, "AGENTS.md")) ?? "";
    if (!g.includes(HAX_BEGIN)) gaps.push("global AGENTS.md: managed overlay block missing");
  }
  for (const f of ["hn.mjs", "hn", "prompt-overlay.md", "scripts/meta-env.sh", "scripts/hn-prime.sh", "scripts/hn-turn.sh"]) {
    if (!fs.existsSync(path.join(REPO_ROOT, "addons", "hax", f))) gaps.push(`addons/hax/${f}: missing`);
  }
  if (gaps.length) { console.log("hax HyperNexus check FAILED:\n - " + gaps.join("\n - ")); process.exit(1); }
  console.log(`hax HyperNexus check OK (v${repoVersion()}).`);
  process.exit(0);
}

// install
const { cfg, changed } = mergeConfig();
let wroteConfig = false;
if (changed) {
  fs.mkdirSync(HAX_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(HAX_CONFIG, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  wroteConfig = true;
}
let skillsWrote = 0;
for (const s of SKILLS) {
  const src = path.join(REPO_ROOT, "addons", "hax", "skills", s, "SKILL.md");
  if (writeIfChanged(path.join(HAX_SKILLS_DIR, s, "SKILL.md"), readIfExists(src) ?? "")) skillsWrote++;
}
const agentsWrote = upsertManagedBlock(path.join(REPO_ROOT, "AGENTS.md"), overlayBlock()) ? 1 : 0;
let globalWrote = false;
if (GLOBAL_AGENTS) globalWrote = upsertManagedBlock(path.join(HAX_CONFIG_DIR, "AGENTS.md"), overlayBlock());
console.log(`hax HyperNexus install OK (v${repoVersion()}): config ${wroteConfig ? "merged" : "unchanged"}, skills ${skillsWrote} updated, AGENTS.md ${agentsWrote ? "overlay applied" : "overlay already current"}${GLOBAL_AGENTS ? `, global ${globalWrote ? "applied" : "current"}` : ""}.`);
console.log("Next: eval \"$(sh addons/hax/scripts/meta-env.sh)\" && hax --preset meta");
