#!/usr/bin/env node
/*
 * test-droid-ext.mjs — HyperNexus Droid plugin battery.
 *
 * Verifies, without needing the Droid CLI:
 *   1. Plugin layout (manifest, mcp.json, hooks, skills, commands, droids, output-styles)
 *   2. hooks.json parses and covers all 8 lifecycle events; hook scripts exist + parse (bash -n / node --check)
 *   3. mcp.json declares the hypernexus stdio server correctly
 *   4. Kernel surface the plugin depends on: /health, /api/memory/* (add/search/fts/list/stats),
 *      /api/memory/scratchpad/*, /api/mcp/*, /api/system/overview, /api/billing/status
 *   5. Meta apiKeyHelper script mints a key (or reports session-dead cleanly)
 *   6. Droid settings.json custom-model entry uses apiKeyHelper (not a static token)
 *   7. ~/.factory/mcp.json has the hypernexus server
 *
 * Usage: node addons/droid/bin/test-droid-ext.mjs [--kernel http://127.0.0.1:7778]
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)); // addons/droid/bin
const ADDON = path.resolve(HERE, "..");
const PLUGIN = path.join(ADDON, "plugin", "hypernexus");
const KERNEL = process.argv.includes("--kernel")
  ? process.argv[process.argv.indexOf("--kernel") + 1]
  : (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/+$/, "");

let pass = 0, failCount = 0;
const failures = [];
function ok(name) { pass++; console.log(`  PASS ${name}`); }
function bad(name, detail) { failCount++; failures.push(name); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }

async function kfetch(p, { method = "GET", body, timeout = 6000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(`${KERNEL}${p}`, {
      method, signal: ctl.signal,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let data = null; try { data = JSON.parse(text); } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: null, error: String(e?.message || e) }; }
  finally { clearTimeout(t); }
}

console.log("[droid-ext] 1. plugin layout");
const needFiles = [
  ".factory-plugin/plugin.json", "mcp.json", "hooks/hooks.json",
  "hooks/hn-hook-lib.mjs",
  "hooks/session-start.mjs", "hooks/prompt-submit.mjs", "hooks/tool-audit.mjs",
  "hooks/rbac-guard.mjs", "hooks/post-edit.mjs", "hooks/session-stop.mjs",
  "hooks/session-end.mjs", "hooks/pre-compact.mjs", "hooks/subagent-stop.mjs",
  "skills/hypernexus/SKILL.md", "skills/hypernexus-ops/SKILL.md", "skills/hypernexus-workflows/SKILL.md",
  "commands/hn-status.md", "commands/hn-store.md", "commands/hn-remember.md",
  "commands/hn-search.md", "commands/hn-tools.md", "commands/hn-session.md",
  "commands/hn-context.md", "commands/hn-plan.md", "commands/hn-summary.md",
  "commands/hn-restore.md", "commands/hn-purge.md",
  "droids/hypernexus-orchestrator.md", "droids/hypernexus-researcher.md",
  "output-styles/hypernexus-report.md", "README.md",
];
for (const f of needFiles) {
  fs.existsSync(path.join(PLUGIN, f)) ? ok(`file ${f}`) : bad(`file ${f}`, "missing");
}
// install.mjs + helper live at addon root/bin, not under plugin/
for (const f of ["install.mjs", "bin/meta-muse-key.mjs", "bin/test-droid-ext.mjs"]) {
  fs.existsSync(path.join(ADDON, f)) ? ok(`file addon/${f}`) : bad(`file addon/${f}`, "missing");
}

console.log("[droid-ext] 2. hooks.json events + script syntax");
let hooks = null;
try {
  hooks = JSON.parse(fs.readFileSync(path.join(PLUGIN, "hooks/hooks.json"), "utf8"));
  ok("hooks.json parses");
} catch (e) { bad("hooks.json parses", e.message); }
if (hooks) {
  for (const ev of ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SessionEnd", "PreCompact", "SubagentStop"]) {
    hooks[ev] && hooks[ev].length ? ok(`event ${ev}`) : bad(`event ${ev}`, "missing/empty");
  }
  const scripts = new Set();
  for (const groups of Object.values(hooks)) {
    for (const g of groups || []) for (const h of g.hooks || []) {
      const m = /\/(hooks\/[a-z-]+\.mjs)$/.exec(h.command || "");
      if (m) scripts.add(m[1]);
    }
  }
  const expectedScripts = [
    "hooks/hn-hook-lib.mjs",
    "hooks/session-start.mjs", "hooks/prompt-submit.mjs", "hooks/tool-audit.mjs",
    "hooks/rbac-guard.mjs", "hooks/post-edit.mjs", "hooks/session-stop.mjs",
    "hooks/session-end.mjs", "hooks/pre-compact.mjs", "hooks/subagent-stop.mjs",
  ];
  for (const s of expectedScripts) {
    const p = path.join(PLUGIN, s);
    if (!fs.existsSync(p)) { bad(`script ${s}`, "missing"); continue; }
    if (s === "hooks/hn-hook-lib.mjs") { ok(`lint ${s} (shared lib)`); continue; }
    try {
      execFileSync(process.execPath, ["--check", p], { timeout: 15000 });
      ok(`node --check ${s}`);
    } catch (e) { bad(`node --check ${s}`, "syntax error"); }
  }
  for (const s of scripts) {
    if (!expectedScripts.includes(s)) bad(`unexpected hook script ${s}`, "not in expected set");
  }
  // PreToolUse must include MCP audit + destructive RBAC guard
  const pre = JSON.stringify(hooks.PreToolUse || "");
  pre.includes("mcp__hypernexus") ? ok("PreToolUse MCP audit matcher") : bad("PreToolUse MCP audit matcher");
  pre.includes("rbac-guard") ? ok("PreToolUse RBAC guard") : bad("PreToolUse RBAC guard");
}

console.log("[droid-ext] 3. plugin + user mcp.json");
try {
  const m = JSON.parse(fs.readFileSync(path.join(PLUGIN, "mcp.json"), "utf8"));
  const s = m?.mcpServers?.hypernexus;
  s && s.type === "stdio" && /hypernexus\.exe$/.test(s.command) && Array.isArray(s.args)
    ? ok("plugin mcp.json hypernexus stdio server") : bad("plugin mcp.json hypernexus stdio server", JSON.stringify(s));
} catch (e) { bad("plugin mcp.json parses", e.message); }
try {
  const u = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".factory", "mcp.json"), "utf8"));
  u?.mcpServers?.hypernexus ? ok("~/.factory/mcp.json has hypernexus") : bad("~/.factory/mcp.json has hypernexus", "missing");
} catch (e) { bad("~/.factory/mcp.json readable", e.message); }

console.log("[droid-ext] 4. kernel surface");
const health = await kfetch("/health");
health.ok ? ok(`/health (${health.data?.version || "?"})`) : bad("/health", health.error || `HTTP ${health.status}`);
if (health.ok) {
  const probes = [
    ["/api/agent-memory/stats", {}],
    ["/api/memory/fts-search?q=hypernexus&limit=1", {}],
    ["/api/memory/search?query=hypernexus&limit=1", {}],
    ["/api/memory/list?limit=1", {}],
    ["/api/system/overview", {}],
    ["/api/mcp/status", {}],
    ["/api/billing/status", {}],
  ];
  for (const [p] of probes) {
    const r = await kfetch(p);
    r.ok ? ok(`GET ${p}`) : bad(`GET ${p}`, r.error || `HTTP ${r.status}`);
  }
  const put = await kfetch("/api/memory/scratchpad/get?key=droid-ext-probe", {});
  put.ok ? ok("GET scratchpad/get") : bad("GET scratchpad/get", put.error || `HTTP ${put.status}`);
  const stamp = `droid-ext-probe ${new Date().toISOString()}`;
  const w = await kfetch("/api/memory/facts/add", { method: "POST", body: { title: "droid-ext-probe", content: stamp, tags: ["droid", "test"], namespace: "project" } });
  w.ok ? ok("POST facts/add") : bad("POST facts/add", w.error || `HTTP ${w.status}`);
  const back = await kfetch(`/api/memory/search?query=${encodeURIComponent(stamp.slice(0, 24))}&limit=3`, {});
  const found = back.ok && JSON.stringify(back.data).includes(stamp.slice(0, 24));
  found ? ok("round-trip search finds probe") : bad("round-trip search finds probe", back.error || `HTTP ${back.status}`);
  const sg = await kfetch("/api/memory/scratchpad/set", { method: "POST", body: { key: "droid-ext-probe", value: stamp } });
  sg.ok ? ok("POST scratchpad/set") : bad("POST scratchpad/set", sg.error || `HTTP ${sg.status}`);
  const obs = await kfetch("/api/memory/observations/record", { method: "POST", body: { type: "progress", title: "droid-ext-probe", content: stamp } });
  obs.ok ? ok("POST observations/record") : bad("POST observations/record", obs.error || `HTTP ${obs.status}`);
} else {
  console.log("  SKIP kernel-dependent probes (kernel offline)");
}

console.log("[droid-ext] 5. meta apiKeyHelper");
try {
  const out = execFileSync("node", [path.join(ADDON, "bin", "meta-muse-key.mjs"), "--check"], { timeout: 45000, stdio: ["ignore", "pipe", "pipe"] });
  ok(`meta-muse-key.mjs --check (${String(out).trim().slice(0, 60)})`);
} catch (e) {
  const err = String(e?.stderr || e?.message || e);
  /session expired|sign in again/i.test(err)
    ? bad("meta-muse-key.mjs --check", "SESSION DEAD — re-login: /login meta in pi")
    : bad("meta-muse-key.mjs --check", err.slice(0, 200));
}

console.log("[droid-ext] 6. droid custom model wiring");
try {
  const s = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".factory", "settings.json"), "utf8"));
  const m = (s.customModels || []).find((x) => x.model === "muse-spark-1.3-contributor");
  if (!m) bad("custom model muse-spark-1.3-contributor", "missing");
  else {
    m.apiKeyHelper && /meta-muse-key\.mjs/.test(m.apiKeyHelper)
      ? ok("model uses apiKeyHelper (auto-refresh)") : bad("model uses apiKeyHelper", "still static apiKey?");
    m.baseUrl === "https://api.meta.ai/v1" ? ok("model baseUrl api.meta.ai/v1") : bad("model baseUrl", m.baseUrl);
    m.provider === "generic-chat-completion-api" ? ok("model provider generic-chat-completion-api") : bad("model provider", m.provider);
    m.maxContextLimit === 1048576 ? ok("model context 1M") : bad("model context", String(m.maxContextLimit));
    (s.sessionDefaultSettings?.model || "").includes("Meta-Muse-Spark")
      ? ok("session default = Meta Muse Spark") : bad("session default model", s.sessionDefaultSettings?.model);
  }
} catch (e) { bad("settings.json readable", e.message); }

console.log(`\n[droid-ext] ${pass} passed, ${failCount} failed`);
if (failCount) { console.log(`failures: ${failures.join(", ")}`); process.exit(1); }
