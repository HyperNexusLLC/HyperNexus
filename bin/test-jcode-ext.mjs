#!/usr/bin/env node
/**
 * test-jcode-ext.mjs — Jcode extension battery
 * =============================================
 * Verifies the HyperNexus → Jcode integration end to end:
 *   T1  MCP config (project + global mcp.json) shape + resolvable command
 *   T2  Installer check mode passes in both scopes (idempotent)
 *   T3  Skills installed byte-identical to addons/jcode/skills/* with valid frontmatter
 *   T4  Prompt overlay + preferred-tools managed blocks present and balanced
 *   T5  Swarm prompt managed block (global scope)
 *   T6  stdio MCP server via the CONFIGURED command: initialize + tools/list
 *       (full merged inventory, core memory + routing tools present)
 *   T7  tools/call round-trips over stdio: hello_world, add_memory → search_memory
 *       → delete_memory, memory_stats
 *   T8  concurrent dispatch: interleaved tools/list + tools/call both complete
 *       (regression: stdio dispatch used to serialize behind one slow call)
 *   T9  stdio ↔ router parity: every /api/mcp/tools registry tool is advertised
 *
 * Run: node bin/test-jcode-ext.mjs
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

console.log("=== T1: MCP config ===");
const CONFIGS = {
  project: path.join(REPO_ROOT, ".jcode", "mcp.json"),
  global: path.join(HOME, ".jcode", "mcp.json"),
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
  }
}

console.log("=== T2: installer check mode (idempotent) ===");
for (const flags of [[], ["--global"]]) {
  try {
    execFileSync(process.execPath, [path.join(REPO_ROOT, "addons", "jcode", "install.mjs"), "--check", ...flags], { stdio: "pipe" });
    check(`install --check ${flags.join(" ") || "(project)"} exits 0`, true);
  } catch (e) {
    check(`install --check ${flags.join(" ") || "(project)"} exits 0`, false, String(e.stdout ?? e.message).slice(0, 120));
  }
}

console.log("=== T3: skills installed ===");
const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
for (const [scope, dir] of [["project", path.join(REPO_ROOT, ".jcode")], ["global", path.join(HOME, ".jcode")]]) {
  for (const name of SKILLS) {
    const src = path.join(REPO_ROOT, "addons", "jcode", "skills", name, "SKILL.md");
    const dst = path.join(dir, "skills", name, "SKILL.md");
    let ok = false;
    let detail = dst;
    try {
      const body = fs.readFileSync(dst, "utf8");
      const front = body.match(/^---\nname:\s*(\S+)\ndescription:/);
      ok = body === fs.readFileSync(src, "utf8") && front?.[1] === name;
      if (!ok) detail = front ? "differs from source" : "bad frontmatter";
    } catch {
      detail = "missing";
    }
    check(`${scope} skills/${name}/SKILL.md installed + valid`, ok, detail);
  }
}

console.log("=== T4: prompt surfaces ===");
for (const [scope, dir] of [["project", path.join(REPO_ROOT, ".jcode")], ["global", path.join(HOME, ".jcode")]]) {
  for (const f of ["prompt-overlay.md", "preferred-tools.md"]) {
    const body = fs.readFileSync(path.join(dir, f), "utf8");
    const begins = (body.match(/<!-- hypernexus:begin/g) ?? []).length;
    const ends = (body.match(/<!-- hypernexus:end -->/g) ?? []).length;
    check(`${scope} ${f} managed block balanced`, begins === 1 && ends === 1, `begin=${begins} end=${ends}`);
  }
}

console.log("=== T5: swarm prompt block ===");
{
  const body = fs.readFileSync(path.join(HOME, ".jcode", "swarm-prompt.md"), "utf8");
  const begins = (body.match(/<!-- hypernexus:begin/g) ?? []).length;
  const ends = (body.match(/<!-- hypernexus:end -->/g) ?? []).length;
  check("global swarm-prompt.md managed block balanced", begins === 1 && ends === 1, `begin=${begins} end=${ends}`);
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
  return (method, params, timeoutMs = 30000) => {
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
    clientInfo: { name: "jcode-ext-battery", version: "1" },
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
  const hello = await rpc("tools/call", { name: "hello_world", arguments: { name: "jcode-ext-battery" } });
  check("stdio hello_world round-trip", /jcode-ext-battery/i.test(JSON.stringify(hello?.result ?? hello)), JSON.stringify(hello).slice(0, 80));

  const probe = `jcode ext battery probe ${Date.now()} zebrasalad marshmallowcastle`;
  const add = await rpc("tools/call", { name: "add_memory", arguments: { content: probe, tags: "jcode-ext-test" } });
  const addText = JSON.stringify(add?.result ?? add);
  check("stdio add_memory accepts write", !/"isError"\s*:\s*true/.test(addText) && !/"error"/.test(addText), addText.slice(0, 80));

  // NOTE: search_memory keyword matching needs natural-language tokens — a single
  // hyphenated probe id will not match (tokenization), so query the full phrase.
  const found = await rpc("tools/call", { name: "search_memory", arguments: { query: probe, limit: 5 } });
  const foundText = JSON.stringify(found?.result ?? found);
  check("stdio search_memory finds stored probe", foundText.includes("zebrasalad"), foundText.slice(0, 100));

  // Cleanup: resolve the vectorstore id over HTTP, delete via stdio, verify gone.
  let probeId = null;
  try {
    const s = await fetch(`${BASE}/api/memory/search?query=${encodeURIComponent(probe)}&limit=5`).then((r) => r.json());
    probeId = (s?.data ?? []).find((d) => String(d.content ?? "").includes("zebrasalad"))?.id ?? null;
  } catch {
    /* ignore */
  }
  if (probeId) {
    const del = await rpc("tools/call", { name: "delete_memory", arguments: { id: probeId } });
    const delText = JSON.stringify(del?.result ?? del);
    check("stdio delete_memory cleanup", /deleted/i.test(delText) && !/"isError"\s*:\s*true/.test(delText), `id=${probeId}`);
    // Deletion propagates asynchronously across stores — poll briefly before failing.
    let still = true;
    for (let i = 0; i < 6 && still; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      const again = await fetch(`${BASE}/api/memory/search?query=${encodeURIComponent(probe)}&limit=5`).then((r) => r.json()).catch(() => null);
      still = (again?.data ?? []).some((d) => String(d.content ?? "").includes("zebrasalad"));
    }
    check("probe gone after delete (polled 6s)", !still);
  } else {
    console.log("  NOTE  probe id not resolvable over HTTP — tagged jcode-ext-test for later purge");
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
  // (regression: local-first name collision shadowed the authoritative registry schema,
  // leaving tools like code_interpreter/jira_create_issue unusable for model callers).
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

  child.kill();
}

console.log(`\n=== JCODE-EXT SUMMARY: ${pass + fail} checks — ${pass} pass, ${fail} fail ===`);
if (fail > 0) process.exit(1);
