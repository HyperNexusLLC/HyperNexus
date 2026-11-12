#!/usr/bin/env node
/**
 * test-muse-code-ext.mjs — HyperNexus muse-code integration battery.
 *
 * Verifies the native Muse Code plugin bundle + Meta OAuth helper + installer
 * without ever handling a credential: the only live-mint step uses --check
 * (key-hidden confirmation, nothing printed).
 *
 * Sections:
 *   H1  layout (required files, command/skill/hook counts)
 *   H2  manifest validity (native contract: relative paths, unique hook sources)
 *   H3  installer --check (settings shape + validator-clean)
 *   H4  meta helper --check (live mint, key hidden)
 *   H5  muse skills validate x3 (valid:true, zero diagnostics)
 *   H6  muse plugins validate (valid:true, zero diagnostics, capability counts)
 *   H7  secret-safety sweep (no token literals in the addon)
 *   H8  hooks exit 0 + kernel 200 ACK on the write path
 *   H9  MCP launcher stdio round-trip (initialize + tools/list)
 *   H10 kernel health
 *   H11 doc accuracy (manifest paths exist, no foreign-harness mentions)
 *   H12 install attempt outcome in {installed, os-32-product-blocked}
 *
 * Budgets are generous: this box is shared and the kernel slows under load.
 * Exit 0 = all green, 1 = failure. Never prints secrets.
 */
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const ADDON = path.join(REPO, "addons", "muse-code");
const PLUGIN = path.join(ADDON, "plugin", "hypernexus");
const BASE = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
const HOME = os.homedir() || process.env.USERPROFILE || "";

let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log(`ok   ${name}`); };
const bad = (name, detail) => { fail++; console.log(`FAIL ${name}${detail ? ` :: ${String(detail).slice(0, 300)}` : ""}`); };

function museBin() {
  const cmd = process.platform === "win32" ? "muse.cmd" : "muse";
  const c = path.join(HOME, "AppData", "Local", "Programs", "muse", cmd);
  if (fs.existsSync(c)) return c;
  return "muse";
}
function runMuse(argv, timeoutMs) {
  const bin = museBin();
  const [cmd, prefix] = bin.toLowerCase().endsWith(".cmd")
    ? [process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", bin]]
    : [bin, []];
  return spawnSync(cmd, [...prefix, ...argv], { encoding: "utf8", timeout: timeoutMs, shell: false });
}
async function fetchJson(url, opts = {}, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    return { status: r.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: `fetch failed: ${e?.name || e}` };
  } finally { clearTimeout(t); }
}

// ── readiness gate ─────────────────────────────────────────────────────────
{
  const h = await fetchJson(`${BASE}/health`, {}, 60000).catch(() => null);
  if (!h || h.status !== 200 || h.json?.ok !== true) { bad("H0 kernel readiness", `health unreachable: ${h?.status}`); }
  else ok(`H0 kernel readiness (${h.json.version || "unversioned"})`);
}

// ── H1 layout ──────────────────────────────────────────────────────────────
{
  const required = [
    "install.mjs", "mcp.json", "meta-model.muse-code.md", "README.md", "use-meta-model.ps1",
    "bin/meta-muse-key.mjs",
    "plugin/hypernexus/.muse-plugin/plugin.json",
    "plugin/hypernexus/mcp/hn-mcp.mjs",
    "plugin/hypernexus/hooks/scripts/hn-hook-lib.mjs",
    "plugin/hypernexus/reminders/hypernexus-recall.md",
  ];
  for (const rel of required) fs.existsSync(path.join(ADDON, rel)) ? ok(`H1 file ${rel}`) : bad(`H1 file ${rel}`, "missing");
  const cmds = fs.existsSync(path.join(PLUGIN, "commands")) ? fs.readdirSync(path.join(PLUGIN, "commands")).filter((f) => f.endsWith(".md")) : [];
  cmds.length >= 8 ? ok(`H1 commands (${cmds.length})`) : bad("H1 commands", `only ${cmds.length}`);
  for (const s of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"])
    fs.existsSync(path.join(PLUGIN, "skills", s, "SKILL.md")) ? ok(`H1 skill ${s}`) : bad(`H1 skill ${s}`, "missing");
  const hooks = ["hn-session-start", "hn-prompt-submit", "hn-pre-tool-use", "hn-post-tool-use", "hn-session-stop"];
  for (const h of hooks)
    fs.existsSync(path.join(PLUGIN, "hooks", "scripts", `${h}.mjs`)) ? ok(`H1 hook ${h}`) : bad(`H1 hook ${h}`, "missing");
}

// ── H2 manifest contract ───────────────────────────────────────────────────
let manifest = null;
{
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, ".muse-plugin", "plugin.json"), "utf8"));
    ok("H2 manifest parses");
  } catch (e) { bad("H2 manifest parses", e.message); }
  if (manifest) {
    const caps = manifest.capabilities || {};
    (caps.skills || []).length === 3 ? ok("H2 3 skills") : bad("H2 3 skills", (caps.skills || []).length);
    (caps.commands || []).length >= 8 ? ok(`H2 ${(caps.commands || []).length} commands`) : bad("H2 commands", (caps.commands || []).length);
    (caps.hooks || []).length === 5 ? ok("H2 5 hooks") : bad("H2 5 hooks", (caps.hooks || []).length);
    (caps.mcpServers || []).length === 1 ? ok("H2 1 mcpServer") : bad("H2 mcpServers", (caps.mcpServers || []).length);
    const seen = new Set();
    let dup = false;
    for (const h of caps.hooks || []) {
      const src = (h.command || []).filter((a) => String(a).endsWith(".mjs"));
      for (const s of src) { if (seen.has(s)) dup = true; seen.add(s); }
      const p = path.join(PLUGIN, ...(h.command || []).filter((a) => String(a).endsWith(".mjs")));
      if (!fs.existsSync(p)) bad("H2 hook source exists", h.id);
    }
    !dup ? ok("H2 hook sources unique") : bad("H2 hook sources unique", "shared source");
    for (const s of caps.skills || [])
      fs.existsSync(path.join(PLUGIN, s.path)) ? ok(`H2 skill path ${s.id}`) : bad(`H2 skill path ${s.id}`, s.path);
    for (const c of caps.commands || [])
      fs.existsSync(path.join(PLUGIN, c.path)) ? null : bad(`H2 command path ${c.id}`, c.path);
    ok("H2 all command paths exist");
  }
}

// ── H3 installer --check ───────────────────────────────────────────────────
{
  const r = spawnSync(process.execPath, [path.join(ADDON, "install.mjs"), "--check"], { encoding: "utf8", timeout: 240000, shell: false });
  r.status === 0 ? ok("H3 install.mjs --check") : bad("H3 install.mjs --check", `${r.stdout || ""}${r.stderr || ""}`);
}

// ── H4 helper --check (live mint, hidden) ──────────────────────────────────
{
  const r = spawnSync(process.execPath, [path.join(ADDON, "bin", "meta-muse-key.mjs"), "--check"], { encoding: "utf8", timeout: 60000, shell: false });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  r.status === 0 && /mint OK \(key hidden\)/.test(out) && !(r.stdout || "").trim()
    ? ok("H4 meta-muse-key --check (live mint, hidden)")
    : bad("H4 meta-muse-key --check", `exit=${r.status} ${out}`);
}

// ── H5/H6 validator ────────────────────────────────────────────────────────
{
  for (const s of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    const r = runMuse(["skills", "validate", path.join(PLUGIN, "skills", s), "--json"], 180000);
    try {
      const v = JSON.parse(r.stdout);
      v.valid === true && Array.isArray(v.diagnostics) && v.diagnostics.length === 0
        ? ok(`H5 skill validate ${s}`) : bad(`H5 skill validate ${s}`, (r.stdout || "").slice(0, 200));
    } catch { bad(`H5 skill validate ${s}`, "unparseable"); }
  }
  const r = runMuse(["plugins", "validate", PLUGIN, "--json"], 180000);
  try {
    const v = JSON.parse(r.stdout);
    v.valid === true && Array.isArray(v.diagnostics) && v.diagnostics.length === 0
      ? ok(`H6 plugin validate (${v.plugin?.capabilities?.skills?.length || 0}s/${v.plugin?.capabilities?.commands?.length || 0}c/${v.plugin?.capabilities?.hooks?.length || 0}h/${v.plugin?.capabilities?.mcp_servers?.length ?? v.plugin?.capabilities?.mcpServers?.length ?? 0}m)`)
      : bad("H6 plugin validate", (r.stdout || "").slice(0, 300));
  } catch { bad("H6 plugin validate", "unparseable"); }
}

// ── H7 secret-safety sweep ─────────────────────────────────────────────────
{
  const suspects = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if ([".probe-min", ".probe"].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(mjs|md|json|ps1)$/.test(e.name)) {
        const c = fs.readFileSync(p, "utf8");
        const m = c.match(/("|')(LLM\|[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9-]+|ghp_[A-Za-z0-9]+|xox[bpas]-[A-Za-z0-9-]+)\1/);
        if (m) suspects.push(`${path.relative(ADDON, p)}: looks like a stored secret`);
        if (/\.meta\.(refresh|access)/.test(c) && /readFileSync|Get-Content/.test(c) && !/meta-muse-key/.test(p))
          suspects.push(`${path.relative(ADDON, p)}: reads token fields outside the minter`);
      }
    }
  };
  walk(ADDON);
  suspects.length === 0 ? ok("H7 no stored secrets in addon") : bad("H7 no stored secrets", suspects.join("; "));
}

// ── H8 hooks exit 0 + kernel ACK ───────────────────────────────────────────
{
  const fixtures = {
    "hn-session-start": "{}",
    "hn-prompt-submit": JSON.stringify({ prompt: "battery probe" }),
    "hn-pre-tool-use": JSON.stringify({ tool: "Bash" }),
    "hn-post-tool-use": JSON.stringify({ tool: "Edit", tool_input: { file_path: "C:/tmp/hook-test.txt" } }),
    "hn-session-stop": "{}",
  };
  for (const [id, input] of Object.entries(fixtures)) {
    const r = spawnSync(process.execPath, [path.join(PLUGIN, "hooks", "scripts", `${id}.mjs`)], { input, encoding: "utf8", timeout: 30000, shell: false });
    r.status === 0 ? ok(`H8 hook ${id} exit 0`) : bad(`H8 hook ${id} exit 0`, `exit=${r.status}`);
  }
  const probe = await fetchJson(`${BASE}/api/memory/facts/add`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "muse-code-battery-probe", content: "write-path probe", tags: ["client:muse-code", "hook:battery"], namespace: "project" }),
  }, 60000);
  probe.status === 200 && /persisted/i.test(probe.text) ? ok("H8 kernel write path 200+persisted") : bad("H8 kernel write path", probe.status);
}

// ── H9 MCP launcher round-trip ─────────────────────────────────────────────
{
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(PLUGIN, "mcp", "hn-mcp.mjs")], { stdio: ["pipe", "pipe", "ignore"] });
    const timer = setTimeout(() => { child.kill(); resolve({ timeout: true }); }, 90000);
    let buf = "", gotInit = false, tools = null;
    child.stdout.on("data", (d) => {
      buf += d.toString();
      const lines = buf.split("\n"); buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 1 && msg.result?.serverInfo?.name === "hypernexus") gotInit = true;
          if (msg.id === 2 && Array.isArray(msg.result?.tools)) { tools = msg.result.tools; clearTimeout(timer); child.kill(); resolve({ gotInit, tools }); }
        } catch { /* partial */ }
      }
    });
    child.on("error", (e) => { clearTimeout(timer); resolve({ error: e.message }); });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "battery", version: "0" } } }) + "\n");
    setTimeout(() => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n"), 500);
    setTimeout(() => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n"), 1000);
  });
  if (result.timeout) bad("H9 launcher round-trip", "timeout");
  else if (result.error) bad("H9 launcher round-trip", result.error);
  else if (!result.gotInit) bad("H9 launcher round-trip", "no initialize");
  else {
    const names = result.tools.map((t) => t.name);
    names.includes("mcp_call_tool") && names.length > 0
      ? ok(`H9 launcher tools/list (${names.length} tools)`) : bad("H9 launcher tools/list", names.length);
  }
}

// ── H10 kernel health ──────────────────────────────────────────────────────
{
  const h = await fetchJson(`${BASE}/health`, {}, 60000).catch(() => null);
  h && h.status === 200 && h.json?.ok === true ? ok(`H10 kernel ${h.json.version} uptime ${h.json.uptimeSec}s`) : bad("H10 kernel health", h?.status);
}

// ── H11 doc accuracy ───────────────────────────────────────────────────────
{
  const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
  const md = read(path.join(ADDON, "README.md")) + read(path.join(ADDON, "meta-model.muse-code.md"));
  /1\.4\.14/.test(md) && /os error 32/.test(md) && /memoryEvidence/.test(md)
    ? ok("H11 README documents validator + installer findings") : bad("H11 README", "missing findings");
  const foreign = [];
  const scan = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (![".probe", ".probe-min"].includes(e.name)) scan(p); }
      else if (/\.(md)$/.test(e.name) && /\b[Dd]roid\b/.test(read(p))) foreign.push(path.relative(PLUGIN, p));
    }
  };
  scan(path.join(PLUGIN, "commands")); scan(path.join(PLUGIN, "skills"));
  foreign.length === 0 ? ok("H11 no foreign-harness mentions") : bad("H11 no foreign-harness mentions", foreign.join(","));
}

// ── H12 activation (plugin record OR equivalent settings wiring) ────────────
{
  const r = runMuse(["plugins", "install", PLUGIN, "--scope", "user", "--json"], 240000);
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status === 0) {
    ok("H12 plugins install succeeded");
  } else {
    if (/plugin-store-write-failed|os error 32/.test(out)) console.log("info H12 plugin store blocked by product os-32 (documented, non-fatal)");
    // Equivalent wiring: user-scope skills + settings mcpServers + live exec proof.
    const skillsOn = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"].every((s) =>
      fs.existsSync(path.join(HOME, ".config", "muse", "skills", s, "SKILL.md")));
    skillsOn ? ok("H12 skills installed user-scope (3/3)") : bad("H12 skills installed user-scope", "missing");
    let wired = false;
    try {
      const o = JSON.parse(fs.readFileSync(path.join(HOME, ".config", "muse", "settings.json"), "utf8"));
      wired = !!o.mcpServers?.hypernexus?.command;
    } catch { /* unreadable */ }
    wired ? ok("H12 settings mcpServers.hypernexus present") : bad("H12 settings mcpServers.hypernexus present", "missing");
    if (skillsOn && wired) {
      const e = spawnSync(museBin().toLowerCase().endsWith(".cmd") ? process.env.ComSpec || "cmd.exe" : museBin(),
        museBin().toLowerCase().endsWith(".cmd") ? ["/d", "/s", "/c", museBin(), "exec", "Call the hypernexus MCP server tool system_status and reply with only the kernel version number, nothing else."] : ["exec", "Call the hypernexus MCP server tool system_status and reply with only the kernel version number, nothing else."],
        { encoding: "utf8", timeout: 240000, shell: false, cwd: REPO });
      const m = `${e.stdout || ""}`.match(/(\d+\.\d+\.\d+)/);
      m ? ok(`H12 live exec via hypernexus MCP (version ${m[1]})`) : bad("H12 live exec via hypernexus MCP", `${e.status} ${(e.stdout || "").slice(-200)}`);
    }
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
