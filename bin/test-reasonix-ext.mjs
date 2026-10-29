#!/usr/bin/env node
/**
 * test-reasonix-ext.mjs — Reasonix HyperNexus extension battery.
 * Verifies the full HARNESS=reasonix integration end to end:
 *   T1  reasonix-plugin.json manifest shape (v2 api, 36 tools, 10 intercepts, skills/agents/commands/hooks/mcpServers)
 *   T2  sidecar protocol over stdio NDJSON (initialize → tool/call status → intercept input.receive → shutdown)
 *   T3  skills / commands / agent / hooks files + frontmatter
 *   T4  installer --check passes (drift-free)
 *   T5  shared manifest reasonix harness + 29 capability bindings
 *   T6  MCP stdio via configured command (initialize + tools/list shows memory surface)
 *   T7  kernel HTTP surface (health, overview, mcp status/tools, fts, billing, skills, sessions)
 *   T8  meta wiring: default_model + meta provider env-ref, no secrets in repo
 *   T9  reasonix home wiring (config [[plugins]] + settings.json hooks)
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const ADDON = path.join(REPO, "addons", "reasonix");
const HOME = process.env.USERPROFILE || process.env.HOME || os.homedir();
const RHOME = path.join(HOME, "AppData", "Roaming", "reasonix");
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

// Readiness gate: kernel boot can take 15s+ on a saturated box.
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) break;
  } catch { /* retry */ }
  await new Promise((r) => setTimeout(r, 2000));
  if (i === 59) {
    console.error("kernel never became ready");
    process.exit(1);
  }
}

const EXPECTED_TOOLS = ["status","system_overview","memory_store","memory_search","memory_fts_search","memory_vector_search","memory_list","memory_delete","memory_relate","scratchpad","context_harvest","record_observation","tool_search","tool_discover","suggest_tools","mcp_status","mcp_servers","mcp_tools","mcp_search","mcp_call","session_search","session_context","session_handoff","skill_search","skill_manage","code_search","knowledge_graph","billing_status","audit_log","subagent","workflow","orchestrate","browser","memory_stats","session_list","repomap"];
const EXPECTED_INTERCEPTS = ["input.receive","context.prepare","tool.before","tool.after","permission.decision","session.start","session.end","compaction.prepare","system_prompt.build","agent.before_start"];
const COMMANDS = ["hn-status","hn-store","hn-search","hn-tools","hn-session","hn-context","hn-summary","hn-restore","hn-purge","hn-remember","hn-plan"];
const SKILLS = ["hypernexus","hypernexus-ops","hypernexus-workflows"];

console.log("=== T1: reasonix-plugin.json manifest ===");
let manifest = null;
try {
  manifest = JSON.parse(read(path.join(ADDON, "reasonix-plugin.json")) ?? "");
  check("manifest parses", !!manifest);
} catch (e) {
  check("manifest parses", false, String(e.message).slice(0, 120));
}
if (manifest) {
  check("apiVersion reasonix.io/plugin/v2", manifest.apiVersion === "reasonix.io/plugin/v2", manifest.apiVersion);
  check("name hypernexus", manifest.name === "hypernexus", manifest.name);
  check("version matches /VERSION", manifest.version === (read(path.join(REPO, "VERSION")) ?? "").trim(), manifest.version);
  const tools = (manifest.runtime?.tools ?? []).map((t) => t.name);
  check("36 runtime tools", tools.length === 36, `${tools.length} declared`);
  for (const t of EXPECTED_TOOLS) {
    if (!tools.includes(t)) check(`runtime.tools[] ${t}`, false, "missing");
  }
  check("all 36 expected tools present", EXPECTED_TOOLS.every((t) => tools.includes(t)));
  const badSchema = (manifest.runtime?.tools ?? []).filter((t) => t.inputSchema?.type !== "object" || !t.description || !/^[A-Za-z0-9_-]{1,48}$/.test(t.name));
  check("tool schemas valid (object type, name shape, description)", badSchema.length === 0, badSchema.map((t) => t.name).join(","));
  for (const i of EXPECTED_INTERCEPTS) check(`intercepts[] ${i}`, (manifest.runtime?.intercepts ?? []).includes(i));
  check("replaces empty (no slot collisions)", JSON.stringify(manifest.runtime?.replaces) === JSON.stringify([]));
  check("runtime.capabilities == [interceptors,tools]", JSON.stringify(manifest.runtime?.capabilities) === JSON.stringify(["interceptors", "tools"]), JSON.stringify(manifest.runtime?.capabilities));
  check("contributes.skills == [skills]", JSON.stringify(manifest.contributes?.skills) === JSON.stringify(["skills"]));
  check("contributes.agents present", Array.isArray(manifest.contributes?.agents));
  check("contributes.commands present", Array.isArray(manifest.contributes?.commands));
  const mcp = manifest.contributes?.mcpServers?.hypernexus;
  check("contributes.mcpServers.hypernexus stdio shape", !!mcp?.command && JSON.stringify(mcp?.args) === JSON.stringify(["mcp"]));
  check("sidecar command uses ${REASONIX_PLUGIN_ROOT}", String(manifest.runtime?.command ?? "").includes("REASONIX_PLUGIN_ROOT") || manifest.runtime?.command === "node");
  check("sidecar required=false (fail-open)", manifest.runtime?.required === false);
}

console.log("=== T2: sidecar protocol (NDJSON stdio) ===");
async function sidecarOnce(messages, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ADDON, "runtime", "bin", "hypernexus-reasonix.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
    let buf = "";
    const replies = new Map();
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined) replies.set(msg.id, msg);
        } catch { /* ignore */ }
      }
    });
    child.on("error", reject);
    (async () => {
      for (const m of messages) {
        child.stdin.write(JSON.stringify(m) + "\n");
        // wait for its reply (notifications get none)
        if (m.id !== undefined) {
          const t0 = Date.now();
          while (!replies.has(m.id) && Date.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 50));
        } else {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      // graceful shutdown
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 999, method: "extension/shutdown", params: {} }) + "\n");
      const t0 = Date.now();
      while (!replies.has(999) && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 50));
      child.kill();
      resolve({ replies, stderr });
    })().catch(reject);
    setTimeout(() => { try { child.kill(); } catch {} reject(new Error("sidecar timeout")); }, timeoutMs + 20000);
  });
}
try {
  const { replies } = await sidecarOnce([
    { jsonrpc: "2.0", id: 1, method: "extension/initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "extension/tool/call", params: { name: "status", arguments: {} } },
    { jsonrpc: "2.0", id: 3, method: "extension/intercept", params: { event: "input.receive", text: "hello @memory:hypernexus test" } },
    { jsonrpc: "2.0", id: 4, method: "extension/intercept", params: { event: "tool.before", tool: "bash", input: { command: "echo hi" } } },
    { jsonrpc: "2.0", id: 5, method: "extension/intercept", params: { event: "permission.decision", action: "bash", resources: ["echo hi"] } },
    { jsonrpc: "2.0", id: 6, method: "extension/tool/call", params: { name: "nope_missing", arguments: {} } },
  ]);
  const init = replies.get(1)?.result;
  check("initialize replies protocolVersion 2", init?.protocolVersion === 2);
  check("initialize declares 36 tools", Array.isArray(init?.tools) && init.tools.length === 36, `${init?.tools?.length}`);
  check("initialize declares 10 intercepts", Array.isArray(init?.intercepts) && init.intercepts.length === 10, `${init?.intercepts?.length}`);
  const statusRes = replies.get(2)?.result;
  check("tool/call status returns kernel content", typeof statusRes?.content === "string" && /kernel|HyperNexus|version/i.test(statusRes.content), (statusRes?.content ?? "").slice(0, 80));
  const inp = replies.get(3)?.result;
  check("intercept input.receive continues (expand or pass)", ["continue", "replace"].includes(inp?.decision), inp?.decision);
  const tb = replies.get(4)?.result;
  check("intercept tool.before safe command continues", tb?.decision === "continue", tb?.decision);
  const pd = replies.get(5)?.result;
  check("intercept permission.decision continues in audit mode", pd?.decision === "continue", pd?.decision);
  const miss = replies.get(6);
  check("unknown tool answers capability_not_declared", !!miss?.error && /capability_not_declared/.test(miss.error.message ?? ""), miss?.error?.message ?? JSON.stringify(miss?.result ?? "").slice(0, 80));
} catch (e) {
  check("sidecar protocol round-trip", false, String(e.message).slice(0, 160));
}

console.log("=== T3: skills / commands / agent / hooks ===");
for (const s of SKILLS) {
  const body = read(path.join(ADDON, "skills", s, "SKILL.md")) ?? "";
  const fm = body.match(/^---\nname:\s*(\S+)\n(description:\s*".*")/);
  check(`skills/${s}/SKILL.md frontmatter (name+description)`, body.startsWith("---\nname: ") && /description:/.test(body.slice(0, 700)));
  check(`skills/${s} mentions ext__hypernexus__`, body.includes("ext__hypernexus__"));
}
for (const c of COMMANDS) {
  const body = read(path.join(ADDON, "commands", `${c}.md`)) ?? "";
  check(`commands/${c}.md frontmatter`, body.startsWith("---\n") && /description:/.test(body.slice(0, 600)) && /\$ARGUMENTS/.test(body), body.slice(0, 60).replace(/\n/g, " "));
}
check("agents/hypernexus-orchestrator.md exists", !!read(path.join(ADDON, "agents", "hypernexus-orchestrator.md")));
check("agents/hypernexus-researcher.md exists (read-only)", !!read(path.join(ADDON, "agents", "hypernexus-researcher.md")));
check("hooks/context/startup.md exists", !!read(path.join(ADDON, "hooks", "context", "startup.md")));
check("hooks/context/precompact.md exists", !!read(path.join(ADDON, "hooks", "context", "precompact.md")));
for (const h of ["hn-session-start.sh", "hn-post-tool-use.sh"]) {
  const body = read(path.join(ADDON, "hooks", "sh", h)) ?? "";
  check(`hooks/sh/${h} best-effort (exit 0, curl, never blocks)`, body.includes("exit 0") && /curl/.test(body));
}
{
  const body = read(path.join(ADDON, "hooks", "sh", "hn-pre-tool-use.sh")) ?? "";
  check("hooks/sh/hn-pre-tool-use.sh RBAC gate (exit 2 on destructive, pass-through otherwise)", /exit 2/.test(body) && /exit 0/.test(body) && /jq|command/.test(body));
}

console.log("=== T4: installer --check ===");
try {
  execFileSync(process.execPath, [path.join(ADDON, "install.mjs"), "--check"], { stdio: "pipe", timeout: 60000 });
  check("install --check exits 0", true);
} catch (e) {
  check("install --check exits 0", false, String(e.stdout ?? e.message).slice(0, 300));
}

console.log("=== T5: shared manifest reasonix bindings ===");
try {
  const shared = JSON.parse(read(path.join(REPO, "addons", "shared", "hypernexus.manifest.json")) ?? "null");
  check("harnesses.reasonix active", shared?.harnesses?.reasonix?.status === "active");
  check("reasonix installer registered", shared?.harnesses?.reasonix?.installer === "addons/reasonix/install.mjs");
  const bound = (shared?.capabilities ?? []).filter((c) => c?.harness?.reasonix);
  check("29 capabilities bound to reasonix", bound.length === 29, `${bound.length} bound`);
  const dead = ["memory_update", "kernel_routes"];
  check("dead endpoints intentionally unbound", dead.every((id) => !(shared?.capabilities ?? []).find((c) => c.id === id)?.harness?.reasonix), dead.join(","));
} catch (e) {
  check("shared manifest parses", false, String(e.message).slice(0, 120));
}

console.log("=== T6: MCP stdio (configured command) ===");
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
        if (!line) continue;
        if (!line.startsWith("{")) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined) replies.set(msg.id, msg);
        } catch { /* ignore non-JSON logs */ }
      }
    });
    child.on("error", reject);
    (async () => {
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test-reasonix", version: "1" } } }) + "\n");
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
  check("mcp initialize answers", !!replies.get(1)?.result?.serverInfo || !!replies.get(1)?.result?.protocolVersion, JSON.stringify(replies.get(1)?.result ?? replies.get(1)?.error ?? "").slice(0, 100));
  const tools = replies.get(2)?.result?.tools ?? [];
  check("mcp tools/list non-empty", Array.isArray(tools) && tools.length > 10, `${tools.length} tools`);
  const names = tools.map((t) => t.name);
  check("mcp has add_memory", names.includes("add_memory"), "");
  check("mcp has search_memory", names.includes("search_memory"), "");
  const noSchema = tools.filter((t) => t.inputSchema && t.inputSchema.type === "object" && Object.keys(t.inputSchema.properties ?? {}).length === 0 && (t.name === "code_interpreter" || t.name === "confluence_search"));
  check("no shadowed empty schemas on arg-taking tools", noSchema.length === 0, noSchema.map((t) => t.name).join(","));
} catch (e) {
  check("mcp stdio round-trip", false, String(e.message).slice(0, 160));
}

console.log("=== T7: kernel HTTP surface ===");
async function get(p, budget = 15000) {
  const r = await fetch(`${BASE}${p}`, { signal: AbortSignal.timeout(budget) });
  const t = await r.text();
  return { ok: r.ok, status: r.status, json: (() => { try { return JSON.parse(t); } catch { return null; } })(), text: t };
}
async function getOk(p, budget = 30000) {
  try {
    const r = await fetch(`${BASE}${p}`, { signal: AbortSignal.timeout(budget) });
    const t = await r.text();
    return { ok: r.ok, status: r.status, json: (() => { try { return JSON.parse(t); } catch { return null; } })(), text: t };
  } catch (e) {
    return { ok: false, status: 0, json: null, error: String(e.message).slice(0, 80) };
  }
}
{
  const h = await getOk("/health");
  check("GET /health ok v1.0.21", h.ok && h.json?.version === "1.0.21", h.json?.version ?? h.error ?? "");
  const ov = await getOk("/api/system/overview", 60000);
  check("GET /api/system/overview", ov.ok, ov.ok ? "" : (ov.error ?? `HTTP ${ov.status}`));
  const ms = await getOk("/api/mcp/status", 90000);
  check("GET /api/mcp/status connected 58 tools", ms.ok && ms.json?.data?.toolCount === 58, `tools=${ms.json?.data?.toolCount ?? ms.error ?? ("HTTP " + ms.status)}`);
  const mt = await getOk("/api/mcp/tools", 90000);
  const rows = Array.isArray(mt.json?.data) ? mt.json.data : Array.isArray(mt.json?.data?.tools) ? mt.json.data.tools : [];
  check("GET /api/mcp/tools registry non-empty", mt.ok && rows.length > 10, `${rows.length} tools${mt.error ? " err=" + mt.error : ""}`);
  const fts = await getOk("/api/memory/fts-search?q=hypernexus&limit=1");
  check("GET /api/memory/fts-search", fts.ok && fts.json?.success === true, fts.ok ? "" : (fts.error ?? `HTTP ${fts.status}`));
  const mem = await getOk("/api/memory/search?query=hypernexus&limit=1", 90000);
  check("GET /api/memory/search", mem.ok, mem.ok ? "" : (mem.error ?? `HTTP ${mem.status}`));
  const b = await getOk("/api/billing/status", 60000);
  check("GET /api/billing/status", b.ok, b.ok ? "" : (b.error ?? `HTTP ${b.status}`));
  const sk = await getOk("/api/skills", 60000);
  check("GET /api/skills", sk.ok, sk.ok ? "" : (sk.error ?? `HTTP ${sk.status}`));
  const se = await getOk("/api/sessions/summary?limit=3", 60000);
  check("GET /api/sessions/summary", se.ok, se.ok ? "" : (se.error ?? `HTTP ${se.status}`));
  const tag = `reasonix-battery-${Date.now().toString(36)}`;
  let addOk = false;
  let memId = null;
  try {
    const addRes = await fetch(`${BASE}/api/memory/facts/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "reasonix battery probe — safe to delete", tags: [tag], namespace: "project" }), signal: AbortSignal.timeout(45000) });
    addOk = addRes.ok;
    try {
      const j = await addRes.json();
      const d = j?.data?.data ?? j?.data ?? j;
      memId = d?.memory?.id ?? d?.id ?? d?.record?.id ?? null;
    } catch { /* ignore */ }
  } catch (e) {
    addOk = false;
    memId = null;
  }
  check("POST /api/memory/facts/add", addOk);
  check("round-trip memory id returned", !!memId, memId ?? "no id");
  if (memId) {
    let delOk = false;
    try {
      const del = await fetch(`${BASE}/api/agent-memory/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: memId }), signal: AbortSignal.timeout(45000) });
      delOk = del.ok;
    } catch { delOk = false; }
    check("POST /api/agent-memory/delete (cleanup)", delOk);
  } else {
    check("POST /api/agent-memory/delete (cleanup)", true, "skipped — no id");
  }
}

console.log("=== T8: meta wiring (env-ref only, no secrets in repo) ===");
{
  const cfg = read(path.join(RHOME, "config.toml")) ?? "";
  check("global config default_model meta/muse-spark-1.3-contributor", /^\s*default_model\s*=\s*"meta\/muse-spark-1\.3-contributor"/m.test(cfg));
  check("global config meta provider api_key_env", /api_key_env\s*=\s*"META_MUSE_API_KEY"/.test(cfg));
  const snip = read(path.join(ADDON, "meta-model.reasonix.toml")) ?? "";
  check("meta-model snippet is env-ref only", snip.includes("META_MUSE_API_KEY") && !/sk-|tp-|dca:/.test(snip));
  const sync = read(path.join(REPO, "scripts", "sync-meta-oauth-reasonix.ps1")) ?? "";
  check("sync-meta-oauth-reasonix.ps1 exists", sync.includes("pi\\agent\\auth.json") || sync.includes(".pi"));
  // repo must not contain live tokens: scan addon + scripts for token-shaped values
  const suspects = [];
  for (const f of [path.join(ADDON, "meta-model.reasonix.toml"), path.join(ADDON, "use-meta-model.ps1"), path.join(ADDON, "reasonix-plugin.json")]) {
    const body = read(f) ?? "";
    if (/sk-[A-Za-z0-9]{8,}/.test(body) || /dca:[A-Za-z0-9_-]{8,}/.test(body) || /LLM\|/.test(body)) suspects.push(path.basename(f));
  }
  check("no live tokens in repo files", suspects.length === 0, suspects.join(","));
}

console.log("=== T9: reasonix home wiring ===");
{
  const cfg = read(path.join(RHOME, "config.toml")) ?? "";
  check("config.toml [[plugins]] hypernexus MCP", /^\s*name\s*=\s*"hypernexus"/m.test(cfg));
  let hooksOk = false;
  try {
    const s = JSON.parse(read(path.join(RHOME, "settings.json")) ?? "null");
    hooksOk = ["SessionStart", "PostToolUse", "PreToolUse"].every((e) => Array.isArray(s?.hooks?.[e]) && s.hooks[e].length > 0);
  } catch { /* no */ }
  check("settings.json hooks merged", hooksOk);
  let mcpOk = false;
  try {
    const m = JSON.parse(read(path.join(REPO, ".mcp.json")) ?? "null");
    mcpOk = !!m?.mcpServers?.hypernexus?.command;
  } catch { /* no */ }
  check(".mcp.json hypernexus server", mcpOk);
}

console.log(`\n== RESULT: ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);
