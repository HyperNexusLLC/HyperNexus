#!/usr/bin/env node
/**
 * test-freebuff-ext.mjs — HyperNexus Freebuff integration battery.
 * Verifies the full freebuff surface without touching the network:
 * manifest entry, installer outputs, MCP config, skills, overlays,
 * Meta helper wiring (auth shape only — mint needs network, covered by --live).
 *
 *   node bin/test-freebuff-ext.mjs          hermetic checks
 *   node bin/test-freebuff-ext.mjs --live   + Meta key mint + kernel /health
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADDON = path.join(ROOT, "addons", "freebuff");
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

console.log("[freebuff-ext] manifest");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "addons", "shared", "hypernexus.manifest.json"), "utf8"));
const fb = manifest?.harnesses?.freebuff;
ok("manifest harnesses.freebuff active", fb?.status === "active", fb?.status);
ok("manifest installer path exists", fs.existsSync(path.join(ROOT, fb?.installer ?? "nope")));

console.log("[freebuff-ext] installer outputs (project install)");
const agentsDir = path.join(ROOT, ".agents");
ok(".agents/mcp.json valid JSON with hypernexus server", (() => {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(agentsDir, "mcp.json"), "utf8"));
    const s = cfg?.mcpServers?.hypernexus;
    return !!s && Array.isArray(s.args) && s.args.includes("mcp") && typeof s.command === "string";
  } catch { return false; }
})());
const expectedSkills = ["hypernexus", "hypernexus-ops", "hypernexus-workflows",
  "hn-status", "hn-search", "hn-store", "hn-session", "hn-context", "hn-summary", "hn-tools", "hn-purge",
  "hn-plan", "hn-remember", "hn-restore", "hypernexus-orchestrator", "hypernexus-researcher"];
const missing = expectedSkills.filter((s) => !fs.existsSync(path.join(agentsDir, "skills", s, "SKILL.md")));
ok(`all ${expectedSkills.length} skills installed`, missing.length === 0, missing.join(","));
ok("agent hypernexus-orchestrator installed", fs.existsSync(path.join(agentsDir, "skills", "hypernexus-orchestrator", "SKILL.md")));
for (const h of ["hn-session.sh","hn-rbac.sh","hn-pre-tool.sh"]) ok("hook "+h+" installed", fs.existsSync(path.join(agentsDir, "hooks", h)));
ok("HYPERNEXUS.md overlay installed", fs.existsSync(path.join(agentsDir, "HYPERNEXUS.md")));
ok("AGENTS.md managed block present", (fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8")).includes("hypernexus:begin:freebuff"));
ok("sibling hax block untouched", (fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8")).includes("managed by addons/hax/install.mjs"));

console.log("[freebuff-ext] addon sources");
for (const f of ["README.md", "install.mjs", "mcp.freebuff.snippet.json", "meta-model.freebuff.md",
  "prompt-overlay.md", "preferred-tools.md", "swarm-prompt-block.md",
  path.join("bin", "meta-muse-key.mjs"),
  "use-meta-model.ps1",
  path.join("agent", "hypernexus-orchestrator.md"),
  path.join("agent", "hypernexus-researcher.md"),
  path.join("hooks", "hn-session.sh"),
  path.join("hooks", "hn-rbac.sh"),
  path.join("hooks", "hn-pre-tool.sh"),
  path.join("hooks", "README.md"),
  path.join("skills", "hypernexus", "SKILL.md"),
  path.join("skills", "hypernexus-ops", "SKILL.md"),
  path.join("skills", "hypernexus-workflows", "SKILL.md"),
  ...["hn-status", "hn-search", "hn-store", "hn-session", "hn-context", "hn-summary", "hn-tools", "hn-purge", "hn-plan", "hn-remember", "hn-restore"].map((c) => path.join("commands", `${c}.md`))]) {
  ok(`source ${f}`, fs.existsSync(path.join(ADDON, f)));
}
ok("snippet is valid JSON with hypernexus server", (() => {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(ADDON, "mcp.freebuff.snippet.json"), "utf8"));
    return !!s?.mcpServers?.hypernexus;
  } catch { return false; }
})());

console.log("[freebuff-ext] no-secrets scan");
const secretRe = /(dca:[A-Za-z0-9_:\-]{10,}|sk-[A-Za-z0-9]{16,}|"access":\s*"LLM\|)/;
const scanned = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); continue; }
    if (!/\.(mjs|md|json|jsonc)$/.test(e.name)) continue;
    scanned.push(p);
    const t = fs.readFileSync(p, "utf8");
    if (secretRe.test(t)) ok(`no secret in ${path.relative(ROOT, p)}`, false, "MATCH");
  }
})(ADDON);
(function walkAgents(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walkAgents(p); continue; }
    if (!/\.(mjs|md|json)$/.test(e.name)) continue;
    if (secretRe.test(fs.readFileSync(p, "utf8"))) ok(`no secret in ${path.relative(ROOT, p)}`, false, "MATCH");
  }
})(agentsDir);
ok(`scanned ${scanned.length} addon files, .agents clean`, true);

console.log("[freebuff-ext] meta wiring (hermetic: auth shape + minter pattern)");
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

if (LIVE) {
  console.log("[freebuff-ext] live checks");
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

console.log(`[freebuff-ext] ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
