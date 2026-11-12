#!/usr/bin/env node
/**
 * test-grok-ext.mjs — Grok HyperNexus extension battery (minimal static).
 * Grok mirrors the open-interpreter shape (MCP-stdio + skills/hooks/overlay);
 * this battery is fully static + installer round-trip (no live kernel calls):
 *   G1  addon tree present (install.mjs, mcp.json, meta doc, launcher, README,
 *       prompt-overlay, agent/2, bin/shim, commands/11, hooks/3+README, skills/3)
 *   G2  installer install + --check round-trip into a temp project dir
 *   G3  shared manifest harnesses.grok entry (active, installer path)
 *   G4  shared manifest grok capability bindings (29 bound, dead unbound)
 *   G5  meta wiring: thin shim delegates to shared minter; launcher mints fresh
 *   G6  attestation-safe docs: no bash/powershell/run_shell_command in tool maps
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const ADDON = path.join(REPO, "addons", "grok");

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
function read(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

const COMMANDS = ["hn-status", "hn-search", "hn-store", "hn-session", "hn-context", "hn-summary", "hn-tools", "hn-purge", "hn-plan", "hn-remember", "hn-restore"];
const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
const AGENTS = ["hypernexus-orchestrator", "hypernexus-researcher"];
const HOOKS = ["hn-session.sh", "hn-rbac.sh", "hn-pre-tool.sh"];

console.log("=== G1: grok addon tree ===");
for (const f of ["install.mjs", "mcp.json", "meta-model.grok.md", "use-meta-model.ps1", "README.md", "prompt-overlay.md"]) {
  check(`${f} exists`, !!read(path.join(ADDON, f)));
}
check("bin/meta-muse-key.mjs exists", !!read(path.join(ADDON, "bin", "meta-muse-key.mjs")));
for (const c of COMMANDS) check(`commands/${c}.md exists`, !!read(path.join(ADDON, "commands", `${c}.md`)));
for (const s of SKILLS) check(`skills/${s}/SKILL.md exists`, !!read(path.join(ADDON, "skills", s, "SKILL.md")));
for (const a of AGENTS) check(`agent/${a}.md exists`, !!read(path.join(ADDON, "agent", `${a}.md`)));
for (const h of HOOKS) check(`hooks/${h} exists`, !!read(path.join(ADDON, "hooks", h)));
check("hooks/README.md exists", !!read(path.join(ADDON, "hooks", "README.md")));
try {
  const mcp = JSON.parse(read(path.join(ADDON, "mcp.json")) ?? "null");
  check("mcp.json hypernexus stdio shape", mcp?.mcpServers?.hypernexus?.command === "hypernexus");
} catch (e) {
  check("mcp.json parses", false, String(e.message).slice(0, 120));
}
check("install.mjs managed block is grok-scoped", (read(path.join(ADDON, "install.mjs")) ?? "").includes("hypernexus:begin:grok"));

console.log("=== G2: installer install + --check (temp project dir) ===");
try {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hn-grok-"));
  execFileSync(process.execPath, [path.join(ADDON, "install.mjs"), "--project", tmp], { stdio: "pipe", timeout: 60000 });
  check("install into temp dir exits 0", true);
  execFileSync(process.execPath, [path.join(ADDON, "install.mjs"), "--project", tmp, "--check"], { stdio: "pipe", timeout: 60000 });
  check("install --check exits 0", true);
  const mcp = JSON.parse(fs.readFileSync(path.join(tmp, ".agents", "mcp.json"), "utf8"));
  check("installed .agents/mcp.json has hypernexus", !!mcp?.mcpServers?.hypernexus);
  fs.rmSync(tmp, { recursive: true, force: true });
} catch (e) {
  check("installer round-trip", false, String(e.message).slice(0, 300));
}

console.log("=== G3/G4: shared manifest grok registration ===");
try {
  const shared = JSON.parse(read(path.join(REPO, "addons", "shared", "hypernexus.manifest.json")) ?? "null");
  check("harnesses.grok active", shared?.harnesses?.grok?.status === "active");
  check("grok installer registered", shared?.harnesses?.grok?.installer === "addons/grok/install.mjs");
  const bound = (shared?.capabilities ?? []).filter((c) => c?.harness?.grok);
  check("29 capabilities bound to grok", bound.length === 29, `${bound.length} bound`);
  const dead = ["memory_update", "kernel_routes"];
  check("dead endpoints intentionally unbound", dead.every((id) => !(shared?.capabilities ?? []).find((c) => c.id === id)?.harness?.grok), dead.join(","));
} catch (e) {
  check("shared manifest parses", false, String(e.message).slice(0, 120));
}

console.log("=== G5: meta wiring (minter shim + fresh-mint launcher) ===");
{
  const shim = read(path.join(ADDON, "bin", "meta-muse-key.mjs")) ?? "";
  check("bin/meta-muse-key.mjs delegates to shared minter", shim.includes("shared/bin/meta-muse-key.mjs"));
  const launcher = read(path.join(ADDON, "use-meta-model.ps1")) ?? "";
  check("use-meta-model.ps1 mints via meta-muse-key.mjs", launcher.includes("meta-muse-key.mjs"));
  check("launcher never pastes a snapshot key", !/paste-your-token/.test(launcher));
  let code = -1;
  try {
    execFileSync(process.execPath, [path.join(ADDON, "bin", "meta-muse-key.mjs"), "--check"], { stdio: "pipe", timeout: 60000 });
    code = 0;
  } catch (e) {
    code = e.status ?? -1;
  }
  console.log(`  INFO  minter shim --check exit ${code} (0 = mint OK; nonzero = no pi OAuth session in this shell — key never printed)`);
  if (code === 0) check("minter shim --check mint OK", true);
}

console.log("=== G6: attestation-safe docs (no shell tools in model-facing maps) ===");
{
  const overlay = read(path.join(ADDON, "prompt-overlay.md")) ?? "";
  const skill = read(path.join(ADDON, "skills", "hypernexus", "SKILL.md")) ?? "";
  check("overlay tool-map row no longer lists bash", !overlay.includes("| files/shell | `bash`"));
  check("SKILL tool row no longer lists bash/run_shell_command as tools", !skill.includes("`run_shell_command` / `bash` /"));
  check("overlay carries attestation note", /client_attestation_denied/.test(overlay));
  check("SKILL carries attestation note", /client_attestation_denied/.test(skill));
}

console.log(`\n== RESULT: ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
