#!/usr/bin/env node
/**
 * test-codewhale-ext.mjs — Codewhale extension battery
 * =====================================================
 * Verifies the HyperNexus → Codewhale integration end to end:
 *   T1  MCP config (project + global + bundle mcp.json) shape + resolvable command
 *   T2  Installer check mode passes in both scopes; install is idempotent
 *   T3  Skills installed byte-identical (bundle + direct mirror) with valid frontmatter
 *   T4  Plugin bundle manifest validity (plugin.json + legacy plugin.toml + commands)
 *   T5  AGENTS.md prompt-overlay managed block present and balanced
 *   T6  stdio MCP server via the CONFIGURED command: initialize + tools/list
 *       (full merged inventory, core memory + routing tools present)
 *   T7  tools/call round-trips over stdio: hello_world, add_memory → search_memory
 *       → delete_memory, memory_stats
 *   T8  concurrent dispatch: interleaved tools/list + tools/call both complete
 *   T9  stdio ↔ router parity: every /api/mcp/tools registry tool is advertised
 *   T10 head-of-line blocking regression (slow call must not freeze quick calls)
 *   T11 memory feature coverage (scratchpad lifecycle, tag filter, relations)
 *   T12 doc accuracy: every tool named in skills/commands is a live stdio tool
 *   T13 core WITHOUT extension: kernel HTTP surface fully usable with zero
 *       extension involvement (the with/without parity guarantee)
 *
 * Run: node bin/test-codewhale-ext.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const BASE = "http://127.0.0.1:7778";

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// Readiness gate: kernel boot can take 15s+ on a saturated box.
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) break;
  } catch {
    /* retry */
  }
  await new Promise((res) => setTimeout(res, 2000));
  if (i === 59) {
    console.error("kernel never became ready");
    process.exit(1);
  }
}

console.log("=== T1: MCP config (project + global + bundles) ===");
const CONFIGS = {
  project: path.join(REPO_ROOT, ".codewhale", "mcp.json"),
  global: path.join(HOME, ".codewhale", "mcp.json"),
  "bundle(project)": path.join(REPO_ROOT, ".codewhale", "plugins", "hypernexus", "mcp.json"),
  "bundle(global)": path.join(HOME, ".codewhale", "plugins", "hypernexus", "mcp.json"),
};
const entries = {};
for (const [scope, p] of Object.entries(CONFIGS)) {
  let entry = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
    entry = cfg.mcpServers?.hypernexus ?? null;
  } catch {
    /* leave null */
  }
  entries[scope] = entry;
  check(`${scope} mcp.json has hypernexus server`, !!entry, p);
  if (entry) {
    check(`${scope} command runs (exists or on PATH)`, entry.command === "hypernexus" || fs.existsSync(entry.command), entry.command);
    check(`${scope} args = ["mcp"]`, JSON.stringify(entry.args) === JSON.stringify(["mcp"]), JSON.stringify(entry.args));
    check(`${scope} env sets workspace root`, !!entry.env?.HYPERNEXUS_WORKSPACE_ROOT, entry.env?.HYPERNEXUS_WORKSPACE_ROOT ?? "");
    check(`${scope} env sets kernel URL`, entry.env?.HYPERNEXUS_URL === "http://127.0.0.1:7778", entry.env?.HYPERNEXUS_URL ?? "");
  }
}

console.log("=== T2: installer check mode (idempotent) ===");
for (const flags of [[], ["--global"]]) {
  try {
    execFileSync(process.execPath, [path.join(REPO_ROOT, "addons", "codewhale", "install.mjs"), "--check", ...flags], { stdio: "pipe" });
    check(`install --check ${flags.join(" ") || "(project)"} exits 0`, true);
  } catch (e) {
    check(`install --check ${flags.join(" ") || "(project)"} exits 0`, false, String(e.stdout ?? e.message).slice(0, 160));
  }
}
{
  const out = execFileSync(process.execPath, [path.join(REPO_ROOT, "addons", "codewhale", "install.mjs")], { stdio: "pipe" }).toString();
  check("re-install is idempotent (reports 'already up to date')", /already up to date/i.test(out), out.trim().split("\n").pop() ?? "");
}

console.log("=== T3: skills installed (bundle + direct mirror) ===");
const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
for (const [scope, dir] of [["project", path.join(REPO_ROOT, ".codewhale")], ["global", path.join(HOME, ".codewhale")]]) {
  for (const name of SKILLS) {
    const src = fs.readFileSync(path.join(REPO_ROOT, "addons", "codewhale", "skills", name, "SKILL.md"), "utf8");
    for (const [where, dst] of [
      ["bundle", path.join(dir, "plugins", "hypernexus", "skills", name, "SKILL.md")],
      ["mirror", path.join(dir, "skills", name, "SKILL.md")],
    ]) {
      let ok = false;
      let detail = dst;
      try {
        const body = fs.readFileSync(dst, "utf8");
        const front = body.match(/^---\nname:\s*(\S+)\ndescription:/);
        ok = body === src && front?.[1] === name;
        if (!ok) detail = front ? "differs from source" : "bad frontmatter";
      } catch {
        detail = "missing";
      }
      check(`${scope} ${where} skills/${name}/SKILL.md installed + valid`, ok, detail);
    }
  }
}

console.log("=== T4: plugin bundle manifest validity ===");
{
  const version = fs.readFileSync(path.join(REPO_ROOT, "VERSION"), "utf8").trim();
  for (const [scope, dir] of [["project", path.join(REPO_ROOT, ".codewhale")], ["global", path.join(HOME, ".codewhale")]]) {
    const bundle = path.join(dir, "plugins", "hypernexus");
    let manifest = null;
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(bundle, "plugin.json"), "utf8"));
    } catch {
      /* null */
    }
    check(`${scope} plugin.json parses`, !!manifest);
    if (manifest) {
      check(`${scope} plugin.json name=hypernexus`, manifest.name === "hypernexus", manifest.name);
      check(`${scope} plugin.json version stamped from VERSION`, manifest.version === version, `${manifest.version} vs ${version}`);
      const ext = manifest.extensions?.["net.codewhale"] ?? {};
      check(`${scope} plugin.json declares commands+skills paths`, ext.commands?.path === "commands" && ext.skills?.path === "skills", JSON.stringify(ext).slice(0, 80));
    }
    const toml = fs.readFileSync(path.join(bundle, "plugin.toml"), "utf8");
    check(`${scope} plugin.toml exists + names hypernexus @ ${version}`, /^name = "hypernexus"/m.test(toml) && toml.includes(`version = "${version}"`));
    const cmdDir = path.join(bundle, "commands");
    let cmdOk = 0;
    for (const f of fs.existsSync(cmdDir) ? fs.readdirSync(cmdDir) : []) {
      const body = fs.readFileSync(path.join(cmdDir, f), "utf8");
      const fm = body.match(/^---\ndescription:.*\nusage:.*\n---/);
      if (fm) cmdOk++;
      else check(`${scope} commands/${f} frontmatter (description+usage)`, false);
    }
    check(`${scope} 8 commands with valid frontmatter`, cmdOk === 8, `${cmdOk}/8`);
  }
}

console.log("=== T5: prompt overlay (AGENTS.md managed block) ===");
{
  const body = fs.readFileSync(path.join(REPO_ROOT, "AGENTS.md"), "utf8");
  const begins = (body.match(/<!-- hypernexus:begin/g) ?? []).length;
  const ends = (body.match(/<!-- hypernexus:end -->/g) ?? []).length;
  check("AGENTS.md managed block balanced", begins === 1 && ends === 1, `begin=${begins} end=${ends}`);
  check("AGENTS.md block carries the discipline loop", body.includes("RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY"));
}

// ── stdio helpers: spawn EXACTLY what mcp.json configures ────────────────

function spawnConfigured(extraArgs = []) {
  const entry = entries.project ?? entries.global;
  const env = { ...process.env, ...(entry?.env ?? {}) };
  return spawn(entry?.command ?? "hypernexus", [...(entry?.args ?? ["mcp"]), ...extraArgs], {
    stdio: ["pipe", "pipe", "pipe"],
    env,
  });
}

function rpcClient(child) {
  let buf = "";
  const pending = new Map();
  child.stdout.on("data", (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try {
        const m = JSON.parse(line);
        if (m.id !== undefined && pending.has(m.id)) {
          pending.get(m.id)(m);
          pending.delete(m.id);
        }
      } catch {
        /* ignore non-JSON */
      }
    }
  });
  let nextId = 1;
  return (method, params, timeoutMs = 90000) => {
    const id = nextId++;
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve({ timeout: true }), timeoutMs);
      pending.set(id, (m) => {
        clearTimeout(t);
        resolve(m);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  };
}

console.log("=== T6/T7/T8/T9: stdio MCP server (configured command) ===");
{
  const child = spawnConfigured();
  const rpc = rpcClient(child);

  const init = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "codewhale-ext-battery", version: "1" },
  });
  check("stdio initialize", init?.result?.serverInfo?.name === "hypernexus" || !!init?.result?.protocolVersion, JSON.stringify(init).slice(0, 80));
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const list = await rpc("tools/list", {});
  const tools = list?.result?.tools ?? [];
  const names = new Set(tools.map((t) => t.name));
  check("stdio tools/list non-empty", tools.length > 0, `${tools.length} tools`);
  check("full merged inventory (>= 55)", tools.length >= 55, `${tools.length}`);
  for (const required of ["search_memory", "add_memory", "delete_memory", "memory_stats", "memory_scratchpad_get", "mcp_call_tool", "mcp_list_tools", "system_status", "hello_world"]) {
    check(`tool present: ${required}`, names.has(required));
  }

  // T7 round-trips
  const hello = await rpc("tools/call", { name: "hello_world", arguments: { name: "codewhale-ext-battery" } });
  check("stdio hello_world round-trip", /codewhale-ext-battery/i.test(JSON.stringify(hello?.result ?? hello)), JSON.stringify(hello).slice(0, 80));

  const probe = `codewhale ext battery probe ${Date.now()} qagzflop trellisvine`;
  const add = await rpc("tools/call", { name: "add_memory", arguments: { content: probe, tags: "codewhale-ext-test" } });
  const addText = JSON.stringify(add?.result ?? add);
  check("stdio add_memory accepts write", !/"isError"\s*:\s*true/.test(addText) && !/"error"/.test(addText), addText.slice(0, 80));

  // NOTE: search_memory keyword matching needs natural-language tokens — a single
  // hyphenated probe id will not match (tokenization), so query the full phrase.
  const found = await rpc("tools/call", { name: "search_memory", arguments: { query: probe, limit: 5 } });
  const foundText = JSON.stringify(found?.result ?? found);
  check("stdio search_memory finds stored probe", foundText.includes("qagzflop"), foundText.slice(0, 100));

  // Cleanup: resolve the vectorstore id over HTTP, delete via stdio, verify gone.
  let probeId = null;
  try {
    const s = await fetch(`${BASE}/api/memory/search?query=${encodeURIComponent(probe)}&limit=5`).then((r) => r.json());
    probeId = (s?.data ?? []).find((d) => String(d.content ?? "").includes("qagzflop"))?.id ?? null;
  } catch {
    /* ignore */
  }
  if (probeId) {
    const del = await rpc("tools/call", { name: "delete_memory", arguments: { id: probeId } });
    const delText = JSON.stringify(del?.result ?? del);
    check("stdio delete_memory cleanup", /deleted/i.test(delText) && !/"isError"\s*:\s*true/.test(delText), `id=${probeId}`);
    // Deletion propagates asynchronously across stores — poll briefly before failing.
    let still = true;
    for (let i = 0; i < 12 && still; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      const again = await fetch(`${BASE}/api/memory/search?query=${encodeURIComponent(probe)}&limit=5`).then((r) => r.json()).catch(() => null);
      still = (again?.data ?? []).some((d) => String(d.content ?? "").includes("qagzflop"));
    }
    check("probe gone after delete (polled 12s)", !still);
  } else {
    console.log("  NOTE  probe id not resolvable over HTTP — tagged codewhale-ext-test for later purge");
  }

  const stats = await rpc("tools/call", { name: "memory_stats", arguments: {} });
  check("stdio memory_stats responds", !!stats?.result?.content, JSON.stringify(stats?.result ?? stats).slice(0, 80));

  // T8 concurrency: interleave slow list + quick calls; all must resolve
  const [c1, c2, c3] = await Promise.all([
    rpc("tools/list", {}, 30000),
    rpc("tools/call", { name: "hello_world", arguments: { name: "conc-a" } }, 30000),
    rpc("tools/call", { name: "memory_stats", arguments: {} }, 30000),
  ]);
  check("concurrent tools/list resolves", Array.isArray(c1?.result?.tools), `${c1?.result?.tools?.length ?? 0} tools`);
  check("concurrent hello_world resolves", /conc-a/i.test(JSON.stringify(c2?.result ?? c2)));
  check("concurrent memory_stats resolves", !!c3?.result?.content);

  // T9 parity against the router inventory
  const inv = await fetch(`${BASE}/api/mcp/tools`).then((r) => r.json()).catch(() => null);
  const invNames = (inv?.data ?? []).map((t) => t.name);
  const missing = invNames.filter((n) => !names.has(n));
  check(`parity: all ${invNames.length} registry tools advertised on stdio`, missing.length === 0, missing.join(",") || "complete");

  // T9b schema parity: stdio must not advertise EMPTY schemas for arg-taking tools
  // (regression: local-first name collision shadowed the authoritative registry schema).
  const stdioByName = new Map(tools.map((t) => [t.name, t]));
  const shadowed = [];
  for (const t of inv?.data ?? []) {
    const regProps = Object.keys(t.inputSchema?.properties ?? {});
    if (!regProps.length) continue;
    const stdProps = new Set(Object.keys(stdioByName.get(t.name)?.inputSchema?.properties ?? {}));
    const lacks = regProps.filter((p) => !stdProps.has(p));
    if (lacks.length) shadowed.push(`${t.name}:${lacks.join("+")}`);
  }
  check("schema parity: stdio covers registry properties", shadowed.length === 0, shadowed.join(",") || "complete");
  const ciProps = new Set(Object.keys(stdioByName.get("code_interpreter")?.inputSchema?.properties ?? {}));
  check("code_interpreter schema has code+language", ciProps.has("code") && ciProps.has("language"), [...ciProps].join(","));

  // T10 head-of-line blocking regression: a slow tools/call must NOT delay an
  // interleaved quick call (dispatch used to serialize). The quick call is a
  // LOCAL builtin so the ordering assertion isolates dispatcher concurrency.
  {
    const order = [];
    const slowP = rpc("tools/call", { name: "bash", arguments: { command: "ping -n 8 127.0.0.1", timeout: 30 } }, 90000).then((r) => {
      order.push("slow");
      return r;
    });
    await new Promise((res) => setTimeout(res, 200));
    const quick = await rpc("tools/call", { name: "list_surface_profiles", arguments: {} }, 90000);
    order.push("quick");
    check(
      "head-of-line: quick call resolves while slow call pending",
      order[0] === "quick" && /"id"\s*:\s*"default"|default/.test(JSON.stringify(quick?.result ?? quick)),
      order.join(" -> "),
    );
    await slowP;
    check("slow call still completes", order.includes("slow"), order.join(" -> "));
  }

  // T11 memory feature coverage: scratchpad lifecycle, tag-filtered search,
  // relation extraction — the documented feature surface must all work.
  {
    const key = `codewhale-t11-${Date.now()}`;
    await rpc("tools/call", { name: "memory_scratchpad_set", arguments: { key, value: "alphaone" } });
    await rpc("tools/call", { name: "memory_scratchpad_append", arguments: { key, value: "+betatwo" } });
    const got = await rpc("tools/call", { name: "memory_scratchpad_get", arguments: { key } });
    const gotText = JSON.stringify(got?.result ?? got);
    check("scratchpad set→append→get lifecycle", gotText.includes("alphaone") && gotText.includes("betatwo"), gotText.slice(0, 80));

    const tag = `t11tag${Date.now() % 1000000}`;
    const word = `glimmerfox${Date.now() % 1000000}`;
    await rpc("tools/call", { name: "add_memory", arguments: { content: `tag filter probe ${word}`, tags: `${tag},codewhale-ext-test` } });
    const byTag = await rpc("tools/call", { name: "search_memory", arguments: { query: word, tag, limit: 5 } });
    const byTagText = JSON.stringify(byTag?.result ?? byTag);
    check("search_memory tag filter finds stored probe", byTagText.includes(word), byTagText.slice(0, 100));

    const rel = await rpc("tools/call", {
      name: "memory_extract_relations",
      arguments: { text: `The ${word} module connects the T11Orion component to the T11Vega store.` },
    });
    const relText = JSON.stringify(rel?.result ?? rel);
    check("memory_extract_relations returns graph data", relText.includes("edges") && relText.includes("source"), relText.slice(0, 100));

    // cleanup the tagged probe
    let t11Id = null;
    try {
      const s = await fetch(`${BASE}/api/memory/search?query=${word}&limit=5`).then((r) => r.json());
      t11Id = (s?.data ?? []).find((d) => String(d.content ?? "").includes(word))?.id ?? null;
    } catch {
      /* ignore */
    }
    if (t11Id) await rpc("tools/call", { name: "delete_memory", arguments: { id: t11Id } });
  }

  // T12 doc accuracy: every tool referenced in the installed skills and commands
  // must be a live tool (docs can never drift from the real inventory unnoticed).
  {
    const refs = new Set();
    const scanDirs = [
      path.join(REPO_ROOT, "addons", "codewhale", "skills"),
      path.join(REPO_ROOT, "addons", "codewhale", "plugin", "commands"),
      path.join(REPO_ROOT, "addons", "codewhale", "prompt-overlay.md"),
    ];
    for (const d of scanDirs) {
      const files = fs.statSync(d).isDirectory()
        ? fs.readdirSync(d, { recursive: true }).map((f) => path.join(d, String(f)))
        : [d];
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const body = fs.readFileSync(f, "utf8");
        for (const m of body.matchAll(/mcp__hypernexus__([a-z_]+)/g)) refs.add(m[1]);
      }
    }
    const dead = [...refs].filter((n) => !names.has(n));
    check(`docs tool references all live (${refs.size} names)`, dead.length === 0, dead.join(",") || "all live");
  }

  child.kill();
}

console.log("=== T13: core WITHOUT extension (plain HTTP) ===");
{
  const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
  check("HTTP /health ok (no extension)", health?.ok === true, JSON.stringify(health).slice(0, 60));

  const inv = await fetch(`${BASE}/api/mcp/tools`).then((r) => r.json()).catch(() => null);
  check("HTTP /api/mcp/tools serves inventory (no extension)", (inv?.data ?? []).length > 0, `${(inv?.data ?? []).length} tools`);

  const mem = await fetch(`${BASE}/api/memory/search?query=test&limit=3`).then((r) => r.json()).catch(() => null);
  check("HTTP /api/memory/search responds (no extension)", mem?.success !== false && !mem?.error, JSON.stringify(mem).slice(0, 60));

  const fts = await fetch(`${BASE}/api/memory/fts-search?q=test&limit=3`).then((r) => r.json()).catch(() => null);
  check("HTTP /api/memory/fts-search responds (no extension)", fts?.success !== false && !fts?.error, JSON.stringify(fts).slice(0, 60));

  const call = await fetch(`${BASE}/api/agent/tool`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "hello_world", args: { name: "noext-probe" } }),
  }).then((r) => r.json()).catch(() => null);
  const callText = JSON.stringify(call ?? {});
  check("HTTP /api/agent/tool routes a call (no extension)", call?.success !== false && /noext-probe/.test(callText), callText.slice(0, 80));

  const billing = await fetch(`${BASE}/api/billing/status`).then((r) => r.json()).catch(() => null);
  check("HTTP /api/billing/status responds (no extension)", billing?.success !== false && !billing?.error, JSON.stringify(billing).slice(0, 60));
}

console.log(`\n=== CODEWHALE-EXT SUMMARY: ${pass + fail} checks — ${pass} pass, ${fail} fail ===`);
if (fail > 0) process.exit(1);
