#!/usr/bin/env node
/**
 * test-crush-ext.mjs — HyperNexus Crush integration battery.
 * Verifies the full crush surface without touching the network:
 * manifest entry, installer outputs, crushrc wiring, MCP config, skills,
 * commands, agents, hooks, overlays, Meta helper wiring (auth shape only —
 * mint needs network, covered by --live).
 *
 *   node bin/test-crush-ext.mjs          hermetic checks
 *   node bin/test-crush-ext.mjs --live   + Meta key mint + kernel /health
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADDON = path.join(ROOT, "addons", "crush");
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

console.log("[crush-ext] manifest");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "addons", "shared", "hypernexus.manifest.json"), "utf8"));
const cr = manifest?.harnesses?.crush;
ok("manifest harnesses.crush active", cr?.status === "active", cr?.status);
ok("manifest installer path exists", fs.existsSync(path.join(ROOT, cr?.installer ?? "nope")));

console.log("[crush-ext] addon sources");
for (const f of ["README.md", "install.mjs", "mcp.crushrc.snippet", "meta-model.crushrc.snippet",
  "prompt-overlay.md", "preferred-tools.md", "swarm-prompt-block.md",
  "use-meta-model.ps1",
  path.join("bin", "meta-muse-key.mjs"),
  path.join("agent", "hypernexus-orchestrator.md"),
  path.join("agent", "hypernexus-researcher.md"),
  path.join("hooks", "hn-gate.cmd"),
  path.join("hooks", "hn-pre-tool.cmd"),
  path.join("hooks", "hn-pre-tool.sh"),
  path.join("hooks", "hn-session.cmd"),
  path.join("hooks", "hn-session.sh"),
  path.join("hooks", "hn-rbac.cmd"),
  path.join("hooks", "hn-rbac.sh"),
  path.join("skills", "hypernexus", "SKILL.md"),
  path.join("skills", "hypernexus-ops", "SKILL.md"),
  path.join("skills", "hypernexus-workflows", "SKILL.md"),
  ...["hn-status", "hn-search", "hn-store", "hn-session", "hn-context", "hn-summary", "hn-tools", "hn-purge", "hn-plan", "hn-remember", "hn-restore"].map((c) => path.join("commands", `${c}.md`))]) {
  ok(`source ${f}`, fs.existsSync(path.join(ADDON, f)));
}

console.log("[crush-ext] command parity (droid 11 = crush 11)");
const droidCmds = ["hn-status", "hn-store", "hn-search", "hn-tools", "hn-session", "hn-context", "hn-summary", "hn-purge", "hn-plan", "hn-remember", "hn-restore"];
for (const c of droidCmds) ok(`command ${c}.md`, fs.existsSync(path.join(ADDON, "commands", `${c}.md`)));
for (const c of droidCmds) {
  const t = fs.readFileSync(path.join(ADDON, "commands", `${c}.md`), "utf8");
  ok(`${c}.md is crush-flavored (no mcp__ prefix, no droid tag)`,
    /user-invocable: true/.test(t) && !/mcp__hypernexus__/.test(t) && !/tags.*droid/.test(t));
}

console.log("[crush-ext] skills + agents");
for (const s of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
  const t = fs.readFileSync(path.join(ADDON, "skills", s, "SKILL.md"), "utf8");
  ok(`skill ${s} user-invocable`, /user-invocable: true/.test(t));
}
ok("agent orchestrator crush-flavored", (() => {
  const t = fs.readFileSync(path.join(ADDON, "agent", "hypernexus-orchestrator.md"), "utf8");
  return /Crush/.test(t) && /crush/.test(t) && !/hypernexus_context_harvest/.test(t);
})());
ok("agent researcher read-only (mcp_call_tool off-limits)", (() => {
  const t = fs.readFileSync(path.join(ADDON, "agent", "hypernexus-researcher.md"), "utf8");
  return /off-limits/.test(t) && /mcp_call_tool/.test(t);
})());

console.log("[crush-ext] MCP snippet validity");
ok("mcp snippet has hypernexus server, forward slashes, no backslash exe, no hook miswiring", (() => {
  const t = fs.readFileSync(path.join(ADDON, "mcp.crushrc.snippet"), "utf8");
  const mcpLines = t.split("\n").filter((l) => l.trim().startsWith("mcp add") || l.trim().startsWith("--command"));
  // Only the MCP stanza's --command lines count: hook opt-in lines are comments.
  const mcpCmdLines = [];
  let inMcp = false;
  for (const l of t.split("\n")) {
    if (/^mcp add hypernexus/.test(l.trim())) inMcp = true;
    else if (inMcp && /^\S/.test(l) && l.trim() && !l.trim().startsWith("--")) inMcp = false;
    if (inMcp && l.trim().startsWith("--command")) mcpCmdLines.push(l);
  }
  void mcpLines;
  return /mcp add hypernexus/.test(t)
    && t.includes("C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe")
    && !mcpCmdLines.some((l) => l.includes("hooks"))
    && !mcpCmdLines.some((l) => /C:\\Users/.test(l));
})());

console.log("[crush-ext] installer wiring");
{
  const t = fs.readFileSync(path.join(ADDON, "install.mjs"), "utf8");
  ok("installer manages 11 commands", /"hn-plan", "hn-remember", "hn-restore"/.test(t));
  ok("installer manages researcher agent", /hypernexus-researcher\.md/.test(t));
  ok("installer ships bin/meta-muse-key.mjs", /bin.*meta-muse-key\.mjs/.test(t));
  ok("installer check covers minter + no .meta.access", /meta-muse-key\.mjs/.test(t) && /\.meta\.access/.test(t));
  ok("crushrc mints via helper (no short-lived .meta.access read)", (() => {
    // Extract the crushrcBlock return template: the api-key line must mint via
    // the helper (referenced as ${minter} from minterPath() -> meta-muse-key.mjs).
    // Doc comments may mention .meta.access to explain why it is NOT used —
    // only the executable --api-key line counts.
    const keyLine = t.split("\n").find((l) => l.includes("--api-key") && l.includes("$(")) ?? "";
    const viaHelper = keyLine.includes("${minter}") || keyLine.includes("meta-muse-key.mjs");
    const minterFn = /function minterPath[\s\S]*?meta-muse-key\.mjs/.test(t);
    return viaHelper && minterFn && !keyLine.includes(".meta.access");
  })());
}

console.log("[crush-ext] meta wiring (hermetic: auth shape + minter pattern)");
ok("meta-model snippet mints via helper (no live .meta.access read, no secrets)", (() => {
  try {
    const t = fs.readFileSync(path.join(ADDON, "meta-model.crushrc.snippet"), "utf8");
    // Doc comments may MENTION .meta.access to explain why it is NOT used;
    // the enforced property is: no live require(...).meta.access read + minter present.
    const liveRead = /require\([^)]*\)\.meta\.access|auth\.json['"]?\)\.meta\.access/.test(t);
    return /meta-muse-key\.mjs/.test(t) && !liveRead
      && !/(dca:[A-Za-z0-9_:\-]{10,}|sk-[A-Za-z0-9]{16,})/.test(t);
  } catch { return false; }
})());
ok("minter delegates to shared canonical flow (refresh -> /muse-code/key -> api_key, --check)", (() => {
  try {
    const a = fs.readFileSync(path.join(ADDON, "bin", "meta-muse-key.mjs"), "utf8");
    if (!/shared\/bin\/meta-muse-key\.mjs/.test(a)) return false;
    const s = fs.readFileSync(path.join(ROOT, "addons", "shared", "bin", "meta-muse-key.mjs"), "utf8");
    return /meta\.refresh/.test(s) && /muse-code\/key/.test(s) && /api_key/.test(s) && /--check/.test(s)
      && /process\.stdout\.write\(key\)/.test(s);
  } catch { return false; }
})());
ok("use-meta-model.ps1 mints fresh per run (no pasted snapshot)", (() => {
  try {
    const t = fs.readFileSync(path.join(ADDON, "use-meta-model.ps1"), "utf8");
    return /meta-muse-key\.mjs/.test(t) && !/paste-your-token/.test(t);
  } catch { return false; }
})());
ok("pi auth.json has meta oauth refresh (pi owns refresh)", (() => {
  try {
    const a = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".pi", "agent", "auth.json"), "utf8"));
    return a?.meta?.type === "oauth" && typeof a.meta.refresh === "string" && a.meta.refresh.length > 10;
  } catch { return false; }
})());

console.log("[crush-ext] no-secrets scan");
const secretRe = /(dca:[A-Za-z0-9_:\-]{10,}|sk-[A-Za-z0-9]{16,}|"access":\s*"LLM\|)/;
const scanned = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); continue; }
    if (!/\.(mjs|md|json|jsonc|ps1|cmd|sh)$/.test(e.name)) continue;
    scanned.push(p);
    const t = fs.readFileSync(p, "utf8");
    if (secretRe.test(t)) ok(`no secret in ${path.relative(ROOT, p)}`, false, "MATCH");
  }
})(ADDON);
ok(`scanned ${scanned.length} addon files, clean`, true);

console.log("[crush-ext] hook safety (all fail-open, fast, no network/creds)");
for (const [f, kind] of [["hn-gate.cmd", "cmd"], ["hn-pre-tool.cmd", "cmd"], ["hn-session.cmd", "cmd"], ["hn-rbac.cmd", "cmd"], ["hn-pre-tool.sh", "sh"], ["hn-session.sh", "sh"], ["hn-rbac.sh", "sh"]]) {
  const t = fs.readFileSync(path.join(ADDON, "hooks", f), "utf8");
  // No LIVE network/credential reads: doc comments may mention curl/http/auth.json
  // to explain the static-only design (hn-session.sh documents WHY it avoids curl).
  const liveNet = /\bcurl\s|Invoke-WebRequest|\bfetch\(|http:\/\/127\.0\.0\.1/.test(t.split("\n").filter((l) => !l.trim().startsWith("#") && !l.trim().startsWith("REM")).join("\n"));
  const liveCred = /readFileSync[^;]*auth\.json|process\.env\.META_MUSE_API_KEY\s*=\s*['"][^'"]+['"]/.test(t);
  ok(`hook ${f} no-network no-creds (${kind})`, !liveNet && !liveCred);
}

if (LIVE) {
  console.log("[crush-ext] live checks");
  try {
    execFileSync("node", [path.join(ADDON, "bin", "meta-muse-key.mjs"), "--check"], { stdio: "pipe", timeout: 45000 });
    ok("meta key mint OK (key hidden)", true);
  } catch (e) {
    ok("meta key mint OK (key hidden)", false, e.message?.slice(0, 160));
  }
  try {
    const r = await fetch("http://127.0.0.1:7778/health", { signal: AbortSignal.timeout(5000) });
    ok("kernel /health reachable", r.ok, `HTTP ${r.status}`);
  } catch (e) {
    ok("kernel /health reachable", false, e.message?.slice(0, 120));
  }
}

console.log(`[crush-ext] ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
