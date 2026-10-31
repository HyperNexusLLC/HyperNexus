#!/usr/bin/env node
/**
 * test-open-interpreter-ext.mjs — HyperNexus Open Interpreter integration battery.
 * Verifies the full open-interpreter surface without touching the network:
 * manifest entry, installer outputs (into an os.tmpdir() scratch project —
 * never the repo .agents dir), MCP config, skills, overlay body,
 * Meta helper wiring (auth shape only — mint needs network, covered by --live).
 *
 *   node bin/test-open-interpreter-ext.mjs          hermetic checks
 *   node bin/test-open-interpreter-ext.mjs --live   + Meta key mint + kernel /health
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADDON = path.join(ROOT, "addons", "open-interpreter");
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

console.log("[open-interpreter-ext] manifest");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "addons", "shared", "hypernexus.manifest.json"), "utf8"));
const oi = manifest?.harnesses?.["open-interpreter"];
ok("manifest harnesses.open-interpreter active", oi?.status === "active", oi?.status);
ok("manifest installer path exists", fs.existsSync(path.join(ROOT, oi?.installer ?? "nope")));

console.log("[open-interpreter-ext] installer outputs (scratch project install)");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "oi-ext-"));
try {
  execFileSync("node", [path.join(ADDON, "install.mjs"), "--project", scratch], { stdio: "pipe", timeout: 60000 });
  ok("install.mjs runs into scratch project", true);
} catch (e) {
  ok("install.mjs runs into scratch project", false, String(e.message).slice(0, 160));
}
try {
  execFileSync("node", [path.join(ADDON, "install.mjs"), "--project", scratch, "--check"], { stdio: "pipe", timeout: 60000 });
  ok("install.mjs --check passes on scratch project", true);
} catch (e) {
  ok("install.mjs --check passes on scratch project", false, String(e.message).slice(0, 200));
}
const agentsDir = path.join(scratch, ".agents");
ok("scratch .agents/mcp.json valid JSON with hypernexus server", (() => {
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
for (const h of ["hn-session.sh", "hn-rbac.sh", "hn-pre-tool.sh"]) ok("hook " + h + " installed", fs.existsSync(path.join(agentsDir, "hooks", h)));
ok("HYPERNEXUS.md overlay installed with non-empty body", (() => {
  try {
    const t = fs.readFileSync(path.join(agentsDir, "HYPERNEXUS.md"), "utf8");
    const body = t.split("\n").filter((l) => !l.startsWith("> Installed by") && l.trim() !== "" && !l.startsWith("# HyperNexus (Open-interpreter"));
    return body.length > 3;
  } catch { return false; }
})());
fs.rmSync(scratch, { recursive: true, force: true });

console.log("[open-interpreter-ext] addon sources");
for (const f of ["README.md", "install.mjs", "mcp.json", "meta-model.open-interpreter.md",
  "prompt-overlay.md",
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
ok("mcp.json is valid JSON with hypernexus server", (() => {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(ADDON, "mcp.json"), "utf8"));
    return !!s?.mcpServers?.hypernexus;
  } catch { return false; }
})());

console.log("[open-interpreter-ext] open-interpreter naming (no Freebuff copy-paste)");
const freebuffHits = [];
const namingFiles = [path.join("skills", "hypernexus", "SKILL.md"),
  path.join("skills", "hypernexus-ops", "SKILL.md"),
  path.join("skills", "hypernexus-workflows", "SKILL.md"),
  path.join("agent", "hypernexus-orchestrator.md"),
  path.join("agent", "hypernexus-researcher.md"),
  "prompt-overlay.md"];
for (const d of ["commands", "hooks"]) {
  const dir = path.join(ADDON, d);
  if (fs.existsSync(dir)) for (const e of fs.readdirSync(dir)) namingFiles.push(path.join(d, e));
}
for (const f of namingFiles) {
  const t = fs.readFileSync(path.join(ADDON, f), "utf8");
  if (/[Ff]reebuff/.test(t)) freebuffHits.push(f);
}
ok("no Freebuff naming in skills/agent files", freebuffHits.length === 0, freebuffHits.join(","));

console.log("[open-interpreter-ext] no-secrets scan");
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
ok(`scanned ${scanned.length} addon files clean`, true);

console.log("[open-interpreter-ext] meta wiring (hermetic: auth shape + minter pattern)");
ok("use-meta-model.ps1 mints fresh per run (no pasted snapshot)", (() => {
  try {
    const t = fs.readFileSync(path.join(ADDON, "use-meta-model.ps1"), "utf8");
    return /meta-muse-key\.mjs/.test(t) && !/paste-your-token/.test(t);
  } catch { return false; }
})());
ok("meta-model doc covers mint flow with oi paths", (() => {
  try {
    const t = fs.readFileSync(path.join(ADDON, "meta-model.open-interpreter.md"), "utf8");
    return /meta-muse-key\.mjs/.test(t) && /open-interpreter/i.test(t) && /--check/.test(t) && t.split("\n").length > 10;
  } catch { return false; }
})());
ok("minter shim delegates to shared (stdout=key-only contract)", (() => {
  try {
    const t = fs.readFileSync(path.join(ADDON, "bin", "meta-muse-key.mjs"), "utf8");
    return /shared\/bin\/meta-muse-key\.mjs/.test(t);
  } catch { return false; }
})());
ok("pi auth.json has meta oauth refresh (pi owns refresh)", (() => {
  try {
    const a = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".pi", "agent", "auth.json"), "utf8"));
    return a?.meta?.type === "oauth" && typeof a.meta.refresh === "string" && a.meta.refresh.length > 10;
  } catch { return false; }
})());

if (LIVE) {
  console.log("[open-interpreter-ext] live checks");
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

console.log(`[open-interpreter-ext] ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
