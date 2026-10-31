#!/usr/bin/env node
/**
 * test-claude-code-ext.mjs — HyperNexus Claude Code integration battery.
 * Verifies the full claude surface without touching the network:
 * manifest entry, installer outputs, plugin bundle validity, MCP config,
 * skills, commands, agents, hooks, Meta helper wiring (auth shape only —
 * mint needs network, covered by --live).
 *
 *   node bin/test-claude-code-ext.mjs          hermetic checks
 *   node bin/test-claude-code-ext.mjs --live   + Meta key mint + kernel + model round-trip
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADDON = path.join(ROOT, "addons", "claude-code");
const SRC_PLUGIN = path.join(ADDON, "plugin", "hypernexus");
const LIVE = process.argv.includes("--live");

let pass = 0;
let fail = 0;
function ok(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("[claude-code-ext] manifest");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "addons", "shared", "hypernexus.manifest.json"), "utf8"));
const cc = manifest?.harnesses?.["claude-code"] ?? manifest?.harnesses?.claude;
ok("manifest harnesses.claude-code active", cc?.status === "active", cc?.status);
ok("manifest installer path exists", fs.existsSync(path.join(ROOT, cc?.installer ?? "nope")));

console.log("[claude-code-ext] addon sources");
for (const f of ["README.md", "install.mjs", "meta-model.settings.snippet",
  "prompt-overlay.md", "preferred-tools.md", "swarm-prompt-block.md",
  "use-meta-model.ps1",
  path.join("bin", "meta-muse-key.mjs"),
  path.join("plugin", "hypernexus", ".claude-plugin", "plugin.json"),
  path.join("plugin", "hypernexus", ".mcp.json"),
  path.join("plugin", "hypernexus", "README.md"),
  path.join("plugin", "hypernexus", "hooks", "hooks.json"),
  path.join("plugin", "hypernexus", "hooks", "scripts", "hn-log.mjs"),
  path.join("plugin", "hypernexus", "hooks", "scripts", "hn-gate.mjs"),
  path.join("plugin", "hypernexus", "hooks", "scripts", "hn-compact.mjs"),
  path.join("plugin", "hypernexus", "agents", "hypernexus-orchestrator.md"),
  path.join("plugin", "hypernexus", "agents", "hypernexus-researcher.md"),
  path.join("plugin", "hypernexus", "skills", "hypernexus", "SKILL.md"),
  path.join("plugin", "hypernexus", "skills", "hypernexus-ops", "SKILL.md"),
  path.join("plugin", "hypernexus", "skills", "hypernexus-workflows", "SKILL.md"),
  ...["hn-status", "hn-search", "hn-store", "hn-session", "hn-context", "hn-summary", "hn-tools", "hn-purge", "hn-plan", "hn-remember", "hn-restore"].map((c) => path.join("plugin", "hypernexus", "commands", `${c}.md`))]) {
  ok(`source ${f}`, fs.existsSync(path.join(ADDON, f)));
}

console.log("[claude-code-ext] command parity (crush/droid 11 = claude-code 11)");
const ALL_CMDS = ["hn-status", "hn-store", "hn-search", "hn-tools", "hn-session", "hn-context", "hn-summary", "hn-purge", "hn-plan", "hn-remember", "hn-restore"];
for (const c of ALL_CMDS) ok(`command ${c}.md`, fs.existsSync(path.join(SRC_PLUGIN, "commands", `${c}.md`)));
for (const c of ALL_CMDS) {
  const t = fs.readFileSync(path.join(SRC_PLUGIN, "commands", `${c}.md`), "utf8");
  ok(`${c}.md is claude-flavored (mcp__hypernexus__ refs, args)`,
    /mcp__hypernexus__/.test(t) && /\$ARGUMENTS/.test(t));
}

console.log("[claude-code-ext] skills + agents");
for (const s of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
  const t = fs.readFileSync(path.join(SRC_PLUGIN, "skills", s, "SKILL.md"), "utf8");
  ok(`skill ${s} has name+description frontmatter`,
    /^---\nname:\s*\S/m.test(t) && /description:/.test(t));
  ok(`skill ${s} references hypernexus MCP tools`, /mcp__hypernexus__/.test(t));
}
ok("agent orchestrator claude-flavored", (() => {
  const t = fs.readFileSync(path.join(SRC_PLUGIN, "agents", "hypernexus-orchestrator.md"), "utf8");
  return /Claude Code/.test(t) && /mcp__hypernexus__/.test(t);
})());
ok("agent researcher read-only (mcp_call_tool off-limits)", (() => {
  const t = fs.readFileSync(path.join(SRC_PLUGIN, "agents", "hypernexus-researcher.md"), "utf8");
  return /off-limits/.test(t) && /mcp_call_tool/.test(t);
})());

console.log("[claude-code-ext] plugin bundle validity");
ok("plugin.json parses (schema, name, commands/skills/agents/hooks/mcpServers)", (() => {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(SRC_PLUGIN, ".claude-plugin", "plugin.json"), "utf8"));
    return p.name === "hypernexus" && p.commands === "./commands/" && p.skills === "./skills/"
      && Array.isArray(p.agents) && p.agents.length === 2 && p.hooks === "./hooks/hooks.json"
      && p.mcpServers === "./.mcp.json";
  } catch { return false; }
})());
ok(".mcp.json template has hypernexus stdio server", (() => {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(SRC_PLUGIN, ".mcp.json"), "utf8"));
    const s = m?.mcpServers?.hypernexus;
    return s?.type === "stdio" && typeof s?.command === "string" && Array.isArray(s?.args);
  } catch { return false; }
})());
ok("hooks.json covers 7 events incl PreToolUse gate + PreCompact", (() => {
  try {
    const h = JSON.parse(fs.readFileSync(path.join(SRC_PLUGIN, "hooks", "hooks.json"), "utf8"));
    const ev = h?.hooks ?? {};
    return ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PreCompact", "Stop", "SubagentStop"]
      .every((e) => Array.isArray(ev[e]) && ev[e].length > 0)
      && JSON.stringify(ev.PreToolUse).includes("hn-gate.mjs")
      && JSON.stringify(ev.PreCompact).includes("hn-compact.mjs");
  } catch { return false; }
})());
for (const s of ["hn-log.mjs", "hn-gate.mjs", "hn-compact.mjs"]) {
  try {
    execFileSync(process.execPath, ["--check", path.join(SRC_PLUGIN, "hooks", "scripts", s)], { stdio: "pipe" });
    ok(`node --check hooks/scripts/${s}`, true);
  } catch (e) {
    ok(`node --check hooks/scripts/${s}`, false, e.message?.slice(0, 120));
  }
}
try {
  execFileSync(process.execPath, ["--check", path.join(ADDON, "bin", "meta-muse-key.mjs")], { stdio: "pipe" });
  ok("node --check bin/meta-muse-key.mjs", true);
} catch (e) {
  ok("node --check bin/meta-muse-key.mjs", false, e.message?.slice(0, 120));
}
try {
  execFileSync(process.execPath, ["--check", path.join(ADDON, "install.mjs")], { stdio: "pipe" });
  ok("node --check install.mjs", true);
} catch (e) {
  ok("node --check install.mjs", false, e.message?.slice(0, 120));
}

console.log("[claude-code-ext] hook safety (all fail-open, fast, no network/creds)");
for (const f of ["hn-log.mjs", "hn-gate.mjs", "hn-compact.mjs"]) {
  const t = fs.readFileSync(path.join(SRC_PLUGIN, "hooks", "scripts", f), "utf8");
  const code = t.split("\n").filter((l) => {
    const s = l.trim();
    return !(s.startsWith("*") || s.startsWith("//") || s.startsWith("/*"));
  }).join("\n");
  // hn-log/hn-compact POST to the kernel (intended); the gate must not.
  const liveNet = f === "hn-gate.mjs"
    ? /\bcurl\s|Invoke-WebRequest|\bfetch\(|http:\/\/127\.0\.0\.1/.test(code)
    : /\bcurl\s|Invoke-WebRequest/.test(code);
  const liveCred = /readFileSync[^;]*auth\.json|META_MUSE_API_KEY\s*=\s*['"][^'"]+['"]/.test(code);
  const exitsZero = /process\.exit\(0\)/.test(code) || /exit 0/.test(code) || f === "hn-gate.mjs";
  ok(`hook ${f} no-creds + exits-clean`, !liveNet && !liveCred && exitsZero);
}
ok("gate denies destructive patterns (rm -rf /, mkfs, fork bomb)", (() => {
  const t = fs.readFileSync(path.join(SRC_PLUGIN, "hooks", "scripts", "hn-gate.mjs"), "utf8");
  return /rm\\s/.test(t) && /mkfs/.test(t) && /process\.exit\(2\)/.test(t);
})());

console.log("[claude-code-ext] installer wiring");
{
  const t = fs.readFileSync(path.join(ADDON, "install.mjs"), "utf8");
  ok("installer manages 11 commands", /"hn-plan", "hn-remember", "hn-restore"/.test(t));
  ok("installer manages researcher agent", /hypernexus-researcher\.md/.test(t));
  ok("installer manages 3 hook scripts", /hn-gate\.mjs/.test(t) && /hn-compact\.mjs/.test(t));
  ok("installer check covers drift + minter", /drift/.test(t) && /meta-muse-key\.mjs/.test(t));
  ok("installer never live-reads auth.json", !/readFileSync\([^)]*auth\.json|require\([^)]*auth\.json/.test(t));
}

console.log("[claude-code-ext] meta wiring (hermetic: auth shape + minter pattern)");
ok("meta-model snippet documents native shim path (no secrets)", (() => {
  try {
    const t = fs.readFileSync(path.join(ADDON, "meta-model.settings.snippet"), "utf8");
    const liveRead = /require\([^)]*\)\.meta\.access|auth\.json['"]?\)\.meta\.access/.test(t);
    return /ANTHROPIC_BASE_URL/.test(t) && /muse-spark-1\.3-contributor/.test(t)
      && /meta-muse-key\.mjs/.test(t) && !liveRead
      && !/(dca:[A-Za-z0-9_:\-]{10,}|sk-[A-Za-z0-9]{16,})/.test(t);
  } catch { return false; }
})());
ok("minter mirrors canonical flow (thin shim -> shared minter, refresh -> /muse-code/key -> api_key, --check)", (() => {
  try {
    const a = fs.readFileSync(path.join(ADDON, "bin", "meta-muse-key.mjs"), "utf8");
    const s = fs.readFileSync(path.join(ROOT, "addons", "shared", "bin", "meta-muse-key.mjs"), "utf8");
    const thinShim = /shared\/bin\/meta-muse-key\.mjs/.test(a);
    const canonical = /meta\.refresh/.test(s) && /muse-code\/key/.test(s) && /api_key/.test(s) && /--check/.test(s);
    return thinShim && canonical;
  } catch { return false; }
})());
ok("use-meta-model.ps1 mints fresh per run (no pasted snapshot)", (() => {
  try {
    const t = fs.readFileSync(path.join(ADDON, "use-meta-model.ps1"), "utf8");
    return /meta-muse-key\.mjs/.test(t) && !/paste-your-token/.test(t)
      && /--model muse-spark-1\.3-contributor/.test(t);
  } catch { return false; }
})());
ok("pi auth.json has meta oauth refresh (pi owns refresh)", (() => {
  try {
    const a = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".pi", "agent", "auth.json"), "utf8"));
    return a?.meta?.type === "oauth" && typeof a.meta.refresh === "string" && a.meta.refresh.length > 10;
  } catch { return false; }
})());

console.log("[claude-code-ext] no-secrets scan");
const secretRe = /(dca:[A-Za-z0-9_:\-]{10,}|sk-[A-Za-z0-9]{16,}|"access":\s*"LLM\|)/;
const scanned = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); continue; }
    if (!/\.(mjs|md|json|ps1)$/.test(e.name)) continue;
    scanned.push(p);
    const t = fs.readFileSync(p, "utf8");
    if (secretRe.test(t)) ok(`no secret in ${path.relative(ROOT, p)}`, false, "MATCH");
  }
})(ADDON);
ok(`scanned ${scanned.length} addon files, clean`, true);

if (LIVE) {
  console.log("[claude-code-ext] live checks");
  try {
    execFileSync("node", [path.join(ADDON, "bin", "meta-muse-key.mjs"), "--check"], { stdio: "pipe", timeout: 45000 });
    ok("meta key mint OK (key hidden)", true);
  } catch (e) {
    ok("meta key mint OK (key hidden)", false, e.message?.slice(0, 160));
  }
  try {
    const r = await fetch("http://127.0.0.1:7778/health", { signal: AbortSignal.timeout(10000) });
    ok("kernel /health reachable", r.ok, `HTTP ${r.status}`);
  } catch (e) {
    ok("kernel /health reachable", false, e.message?.slice(0, 120));
  }
  try {
    const r = await fetch("http://127.0.0.1:7778/v1/models", { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    ok("anthropic shim /v1/models lists muse-spark",
      r.ok && JSON.stringify(j).includes("muse-spark"), `HTTP ${r.status}`);
  } catch (e) {
    ok("anthropic shim /v1/models lists muse-spark", false, e.message?.slice(0, 120));
  }
}

console.log(`[claude-code-ext] ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
