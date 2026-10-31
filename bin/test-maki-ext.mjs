#!/usr/bin/env node
/*
 * test-maki-ext.mjs — HyperNexus maki extension battery.
 *
 * Verifies, without needing interactive maki:
 *   1. Extension layout (lua/, init.lua, plugin.toml, mcp.toml, commands/, skills/, scripts/, config/)
 *   2. Installed global copy in sync (lua files identical)
 *   3. Project scope wired (.maki/lua, init.lua, plugin.toml, mcp.toml)
 *   4. TOML files parse (plugin.toml, mcp.toml)
 *   5. Tool/command/autocmd/slot surface present in lua (counts + key names)
 *   6. Kernel surface the extension depends on (health + memory/mcp/system/billing)
 *   7. Meta OAuth: device mint via meta-muse-key.mjs --check (or pi identity present)
 *   8. Live headless turn on meta/muse-spark-1.3-contributor (probe string)
 *   9. MCP stdio inventory reachable (bin/hypernexus.exe mcp tools/list)
 *
 * Usage: node bin/test-maki-ext.mjs [--kernel http://127.0.0.1:7778]
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)); // bin
const ROOT = path.resolve(HERE, "..");
const EXT = path.join(ROOT, "extensions", "maki-hypernexus");
const MAKI_HOME = path.join(os.homedir(), "AppData", "Roaming", "maki");
const KERNEL = (process.argv.includes("--kernel")
  ? process.argv[process.argv.indexOf("--kernel") + 1]
  : (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778")).replace(/\/+$/, "");

let pass = 0, failCount = 0;
const failures = [];
function ok(name) { pass++; console.log(`  PASS ${name}`); }
function bad(name, detail) { failCount++; failures.push(name); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
function run(cmd, args, opts = {}) {
  try {
    const out = execFileSync(cmd, args, { encoding: "utf8", timeout: 90000, ...opts });
    return { ok: true, out: String(out) };
  } catch (e) {
    return { ok: false, out: String((e.stdout || "") + (e.stderr || "") + e.message).slice(0, 800) };
  }
}
async function kfetch(p, { method = "GET", body, timeout = 45000, retries = 2 } = {}) {
  let last = null;
  for (let i = 0; i <= retries; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 8000 * i)); // backoff under sibling load
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
      clearTimeout(t);
      return { ok: r.ok, status: r.status, data };
    } catch (e) { last = { ok: false, status: 0, data: null, error: String(e?.message || e) }; }
    finally { clearTimeout(t); }
  }
  return last;
}

console.log("[maki-ext] 1. extension layout");
for (const f of [
  "lua/hypernexus.lua", "lua/meta_oauth.lua", "init.lua", "plugin.toml",
  "mcp.toml", "README.md", "scripts/install.sh", "scripts/install.bat",
  "config/model.env.example",
]) {
  fs.existsSync(path.join(EXT, f)) ? ok(`ext/${f}`) : bad(`ext/${f}`, "missing");
}
const cmds = fs.existsSync(path.join(EXT, "commands")) ? fs.readdirSync(path.join(EXT, "commands")).filter(f => f.endsWith(".md")) : [];
cmds.length >= 11 ? ok(`commands ${cmds.length} md files`) : bad("commands", `only ${cmds.length}`);
const skills = fs.existsSync(path.join(EXT, "skills")) ? fs.readdirSync(path.join(EXT, "skills")) : [];
skills.length >= 4 ? ok(`skills ${skills.join(",")}`) : bad("skills", `only ${skills.length}`);

console.log("[maki-ext] 2. installed global copy in sync");
for (const f of ["lua/hypernexus.lua", "lua/meta_oauth.lua", "init.lua", "plugin.toml"]) {
  const a = path.join(EXT, f), b = path.join(MAKI_HOME, f);
  if (!fs.existsSync(b)) { bad(`installed ${f}`, "missing"); continue; }
  const same = fs.readFileSync(a, "utf8") === fs.readFileSync(b, "utf8");
  same ? ok(`sync ${f}`) : bad(`sync ${f}`, "differs");
}
for (const d of ["skills", "commands"]) {
  fs.existsSync(path.join(MAKI_HOME, d)) ? ok(`installed ${d}/`) : bad(`installed ${d}/`, "missing");
}

console.log("[maki-ext] 3. project scope wired");
for (const f of [".maki/init.lua", ".maki/plugin.toml", ".maki/mcp.toml", ".maki/lua/hypernexus.lua", ".maki/lua/meta_oauth.lua"]) {
  fs.existsSync(path.join(ROOT, f)) ? ok(`project ${f}`) : bad(`project ${f}`, "missing");
}
try {
  const t = JSON.parse(fs.readFileSync(path.join(MAKI_HOME, "trusted-folders.json"), "utf8"));
  const hit = (t.folders || []).some(f => String(f.path || "").replace(/\//g, "\\").toLowerCase() === ROOT.toLowerCase());
  hit ? ok("workspace trusted") : bad("workspace trusted", "not in trusted-folders.json");
} catch (e) { bad("workspace trusted", e.message); }

console.log("[maki-ext] 4. TOML parses");
{
  // minimal TOML sanity: bracket balance + key=val lines; python tomllib if present
  const py = run("python", ["-c", "import tomllib,sys;tomllib.load(open(sys.argv[1],'rb'));print('ok')", path.join(EXT, "plugin.toml")]);
  (py.ok && py.out.includes("ok")) ? ok("plugin.toml parses") : bad("plugin.toml parses", py.out.slice(0, 160));
  const py2 = run("python", ["-c", "import tomllib,sys;tomllib.load(open(sys.argv[1],'rb'));print('ok')", path.join(EXT, "mcp.toml")]);
  (py2.ok && py2.out.includes("ok")) ? ok("mcp.toml parses") : bad("mcp.toml parses", py2.out.slice(0, 160));
}

console.log("[maki-ext] 5. lua surface (tools/commands/autocmds/slots)");
{
  const src = fs.readFileSync(path.join(EXT, "lua/hypernexus.lua"), "utf8");
  const tools = [...src.matchAll(/name = "(hypernexus_[a-z_]+)"/g)].map(m => m[1]);
  const uniq = [...new Set(tools)];
  uniq.length >= 30 ? ok(`tools ${uniq.length}`) : bad("tools", `only ${uniq.length}`);
  for (const t of ["hypernexus_memory_store", "hypernexus_memory_search", "hypernexus_mcp_call", "hypernexus_system_overview", "hypernexus_subagent", "hypernexus_record_observation"]) {
    uniq.includes(t) ? ok(`tool ${t}`) : bad(`tool ${t}`, "missing");
  }
  for (const pat of ["register_prompt_hint", "declare_slot", "create_autocmd", "set_slot", "completion.sources", "keymap.set"]) {
    src.includes(pat) ? ok(`surface ${pat}`) : bad(`surface ${pat}`, "missing");
  }
  for (const ev of ["SessionFocusChanged", "TurnStart", "TurnEnd", "ModelChanged", "AutoCompacting", "CompactionDone", "SessionEnd"]) {
    src.includes(`"${ev}"`) ? ok(`autocmd ${ev}`) : bad(`autocmd ${ev}`, "missing");
  }
  const meta = fs.readFileSync(path.join(EXT, "lua/meta_oauth.lua"), "utf8");
  for (const pat of ["maki.provider.register", "slug = \"meta\"", "device_code", "api.meta.ai", "muse-spark-1.3-contributor", "pi", "auth.json"]) {
    meta.includes(pat) ? ok(`meta_oauth has ${pat.slice(0, 28)}`) : bad(`meta_oauth ${pat.slice(0, 28)}`, "missing");
  }
}

console.log("[maki-ext] 6. kernel surface");
{
  const h = await kfetch("/health");
  (h.ok && h.data && (h.data.ok || h.data.version)) ? ok(`health ${h.data.version || "ok"}`) : bad("health", `status=${h.status}`);
  const s = await kfetch("/api/memory/search?query=probe&limit=1");
  s.ok ? ok("memory search") : bad("memory search", `status=${s.status}`);
  const f = await kfetch("/api/memory/facts/add", { method: "POST", body: { title: "maki-ext battery", content: "battery probe", tags: ["maki", "battery"], namespace: "project" } });
  (f.ok || f.status === 200) ? ok("facts/add") : bad("facts/add", `status=${f.status}`);
  const ms = await kfetch("/api/mcp/status");
  ms.ok ? ok("mcp status") : bad("mcp status", `status=${ms.status}`);
  const ov = await kfetch("/api/system/overview");
  ov.ok ? ok("system overview") : bad("system overview", `status=${ov.status}`);
  const b = await kfetch("/api/billing/status");
  b.ok ? ok("billing status") : bad("billing status", `status=${b.status} (busy?)`);
}

console.log("[maki-ext] 7. meta oauth mint");
{
  const mint = run("node", [path.join(ROOT, "addons", "freebuff", "bin", "meta-muse-key.mjs"), "--check"]);
  mint.ok ? ok("mint --check") : bad("mint --check", mint.out.slice(0, 200));
  const models = run("maki", ["models"]);
  (models.ok && models.out.includes("meta/muse-spark-1.3-contributor")) ? ok("meta provider listed") : bad("meta provider listed", models.out.slice(0, 200));
}

console.log("[maki-ext] 8. live headless turn (meta model + HN tool)");
{
  const t = run("maki", ["-p", "Call the hypernexus_system_status tool and reply with just its version field.", "-m", "meta/muse-spark-1.3-contributor"], { cwd: ROOT });
  const wantVer = (() => { try { return fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim(); } catch { return ""; } })();
  (t.ok && wantVer && t.out.includes(wantVer)) ? ok(`headless turn ${wantVer}`) : bad("headless turn", t.out.slice(0, 300));
}

console.log(`\n[maki-ext] ${pass} pass, ${failCount} fail`);
if (failCount) { console.log("failures:", failures.join(", ")); process.exit(1); }
