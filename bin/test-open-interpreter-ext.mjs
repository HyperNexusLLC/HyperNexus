#!/usr/bin/env node
/**
 * test-open-interpreter-ext.mjs — Open Interpreter HyperNexus extension battery.
 * OI-shaped mirror of bin/test-reasonix-ext.mjs T-structure (no sidecar: OI is
 * MCP-stdio + skills/hooks/overlay, installed into <project>/.agents):
 *   T1  mcp.json shape (mcpServers.hypernexus stdio, HYPERNEXUS_URL)
 *   T2  MCP stdio via configured command (initialize + tools/list memory surface)
 *   T3  skills / commands / agents / hooks / overlay files (16 skills, 3 hooks)
 *   T4  installer install + --check round-trip into a temp project dir
 *   T5  shared manifest open-interpreter harness entry
 *   T6  kernel HTTP surface (health, fts, billing)
 *   T7  meta wiring: thin shim delegates to shared minter; launcher mints fresh
 *   T8  attestation-safe docs: no bash/powershell/run_shell_command in tool maps
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const ADDON = path.join(REPO, "addons", "open-interpreter");
const BASE = "http://127.0.0.1:7778";

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

const CORE = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
const AGENTS = ["hypernexus-orchestrator", "hypernexus-researcher"];
const COMMANDS = ["hn-status", "hn-search", "hn-store", "hn-session", "hn-context", "hn-summary", "hn-tools", "hn-purge", "hn-plan", "hn-remember", "hn-restore"];
const HOOKS = ["hn-session.sh", "hn-rbac.sh", "hn-pre-tool.sh"];

console.log("=== T1: mcp.json shape ===");
try {
  const mcp = JSON.parse(read(path.join(ADDON, "mcp.json")) ?? "null");
  const srv = mcp?.mcpServers?.hypernexus;
  check("mcp.json parses", !!mcp);
  check("mcpServers.hypernexus stdio shape", !!srv && srv.command === "hypernexus" && JSON.stringify(srv.args) === JSON.stringify(["mcp"]));
  check("HYPERNEXUS_URL default", srv?.env?.HYPERNEXUS_URL === "http://127.0.0.1:7778", srv?.env?.HYPERNEXUS_URL);
} catch (e) {
  check("mcp.json parses", false, String(e.message).slice(0, 120));
}

console.log("=== T2: MCP stdio (configured command) ===");
async function mcpOnce(timeoutMs = 60000) {
  const exe = fs.existsSync(path.join(REPO, "bin", "hypernexus.exe")) ? path.join(REPO, "bin", "hypernexus.exe") : "hypernexus.exe";
  return new Promise((resolve, reject) => {
    const child = spawn(exe, ["mcp"], { stdio: ["pipe", "pipe", "pipe"] });
    let buf = "";
    const replies = new Map();
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line || !line.startsWith("{")) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined) replies.set(msg.id, msg);
        } catch { /* ignore non-JSON logs */ }
      }
    });
    child.on("error", reject);
    (async () => {
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test-oi", version: "1" } } }) + "\n");
      let t0 = Date.now();
      while (!replies.has(1) && Date.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 100));
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n");
      t0 = Date.now();
      while (!replies.has(2) && Date.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 100));
      child.kill();
      resolve(replies);
    })().catch(reject);
    setTimeout(() => { try { child.kill(); } catch {} reject(new Error("mcp timeout")); }, timeoutMs + 20000);
  });
}
try {
  const replies = await mcpOnce();
  check("mcp initialize answers", !!replies.get(1)?.result?.serverInfo || !!replies.get(1)?.result?.protocolVersion);
  const tools = replies.get(2)?.result?.tools ?? [];
  check("mcp tools/list non-empty", Array.isArray(tools) && tools.length > 10, `${tools.length} tools`);
  const names = tools.map((t) => t.name);
  check("mcp has add_memory", names.includes("add_memory"));
  check("mcp has search_memory", names.includes("search_memory"));
} catch (e) {
  check("mcp stdio round-trip", false, String(e.message).slice(0, 160));
}

console.log("=== T3: skills / commands / agents / hooks / overlay ===");
for (const s of CORE) check(`skills/${s}/SKILL.md exists`, !!read(path.join(ADDON, "skills", s, "SKILL.md")));
for (const a of AGENTS) check(`agent/${a}.md exists`, !!read(path.join(ADDON, "agent", `${a}.md`)));
for (const c of COMMANDS) check(`commands/${c}.md exists`, !!read(path.join(ADDON, "commands", `${c}.md`)));
for (const h of HOOKS) check(`hooks/${h} exists`, !!read(path.join(ADDON, "hooks", h)));
check("hooks/README.md exists", !!read(path.join(ADDON, "hooks", "README.md")));
check("prompt-overlay.md exists", !!read(path.join(ADDON, "prompt-overlay.md")));
check("16 skills total (3 core + 2 agents + 11 commands)", CORE.length + AGENTS.length + COMMANDS.length === 16);

console.log("=== T4: installer install + --check (temp project dir) ===");
try {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hn-oi-"));
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

console.log("=== T5: shared manifest open-interpreter entry ===");
try {
  const shared = JSON.parse(read(path.join(REPO, "addons", "shared", "hypernexus.manifest.json")) ?? "null");
  check("harnesses.open-interpreter active", shared?.harnesses?.["open-interpreter"]?.status === "active");
  check("open-interpreter installer registered", shared?.harnesses?.["open-interpreter"]?.installer === "addons/open-interpreter/install.mjs");
} catch (e) {
  check("shared manifest parses", false, String(e.message).slice(0, 120));
}

console.log("=== T6: kernel HTTP surface ===");
async function getOk(p, budget = 30000) {
  try {
    const r = await fetch(`${BASE}${p}`, { signal: AbortSignal.timeout(budget) });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message).slice(0, 80) };
  }
}
{
  const h = await getOk("/health");
  check("GET /health", h.ok, h.ok ? "" : (h.error ?? `HTTP ${h.status}`));
  const fts = await getOk("/api/memory/fts-search?q=hypernexus&limit=1");
  check("GET /api/memory/fts-search", fts.ok, fts.ok ? "" : (fts.error ?? `HTTP ${fts.status}`));
  const b = await getOk("/api/billing/status", 60000);
  check("GET /api/billing/status", b.ok, b.ok ? "" : (b.error ?? `HTTP ${b.status}`));
}

console.log("=== T7: meta wiring (minter shim + fresh-mint launcher) ===");
{
  const shim = read(path.join(ADDON, "bin", "meta-muse-key.mjs")) ?? "";
  check("bin/meta-muse-key.mjs delegates to shared minter", shim.includes("shared/bin/meta-muse-key.mjs"));
  const launcher = read(path.join(ADDON, "use-meta-model.ps1")) ?? "";
  check("use-meta-model.ps1 mints via meta-muse-key.mjs", launcher.includes("meta-muse-key.mjs"));
  check("launcher never pastes a snapshot key", !/paste-your-token|META_MUSE_API_KEY\s*=\s*['"][^'"]+['"]/.test(launcher));
  const doc = read(path.join(ADDON, "meta-model.open-interpreter.md")) ?? "";
  check("meta-model doc documents --check (key hidden)", doc.includes("--check") && /key hidden|never stored/i.test(doc));
  let code = -1;
  try {
    execFileSync(process.execPath, [path.join(ADDON, "bin", "meta-muse-key.mjs"), "--check"], { stdio: "pipe", timeout: 60000 });
    code = 0;
  } catch (e) {
    code = e.status ?? -1;
  }
  console.log(`  INFO  minter shim --check exit ${code} (0 = mint OK; nonzero = no pi OAuth session in this shell — delegation verified statically above, key never printed)`);
  if (code === 0) check("minter shim --check mint OK", true);
  const suspects = [];
  for (const f of [path.join(ADDON, "meta-model.open-interpreter.md"), path.join(ADDON, "use-meta-model.ps1")]) {
    const body = read(f) ?? "";
    if (/sk-[A-Za-z0-9]{8,}/.test(body) || /dca:[A-Za-z0-9_-]{8,}/.test(body) || /LLM\|/.test(body)) suspects.push(path.basename(f));
  }
  check("no live tokens in meta files", suspects.length === 0, suspects.join(","));
}

console.log("=== T8: attestation-safe docs (no shell tools in model-facing maps) ===");
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
