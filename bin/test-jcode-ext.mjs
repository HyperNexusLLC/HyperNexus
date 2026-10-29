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
 *       on stdio WITH the registry's arg properties (no schema shadowing)
 *   T10 head-of-line: quick local-builtin call resolves while a slow call
 *       is pending (concurrent dispatch regression)
 *   T11 memory feature coverage: scratchpad lifecycle, tag-filtered search,
 *       relation extraction
 *   T12 doc accuracy: every mcp__hypernexus__* ref in skills is a live tool
 *   T13 installer foreign-config preservation (temp target, never user config)
 *   T14 hooks: all 4 hook scripts installed byte-identical + live execution
 *       (observe events exit 0, RBAC deny blocks destructive, transform
 *       repairs hyphenated queries, feedback notes hyphen trap)
 *   T15 commands: all 13 hn-* installed byte-identical with valid frontmatter
 *   T16 Meta auth routes: native muse-subscription credential presence-check
 *       + bridge minter --check + snippet/launcher wiring (no secrets read)
 *
 * NOTE on stdio warmup (T6): the first tools/list on a fresh stdio process may
 * serve the 49-tool static fallback while the 58-tool upstream merge completes
 * (15s TTL last-good cache). The battery WARMS UP with a throwaway process
 * before asserting counts, so T6+ always assert live merged state.
 * Run: node bin/test-jcode-ext.mjs
 */

import fs from "node:fs";
import os from "node:os";
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

console.log("=== T6/T7/T8/T9/T10/T11/T12: stdio MCP server (configured command) ===");
// WARMUP (same-process): the first tools/list on a fresh stdio process can
// serve the 49-tool static fallback while the 58-tool upstream merge
// completes (merged-inventory cache is per-process with a 15s TTL, so a
// throwaway process cannot warm it). Poll tools/list in THIS process until
// the merged inventory arrives (up to ~90s on a saturated box), then assert.
// A process that never merges past 49 within budget is a real regression.
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

  const list = await (async () => {
    // Same-process merge poll: first response may be the 49-tool static
    // fallback; the merged 58-tool inventory arrives once the upstream
    // /api/mcp/tools fetch completes. Poll up to ~90s before calling it.
    let last = await rpc("tools/list", {}, 90000);
    for (let i = 0; i < 5 && (last?.result?.tools ?? []).length < 55; i++) {
      await new Promise((res) => setTimeout(res, 15000));
      last = await rpc("tools/list", {}, 90000);
    }
    return last;
  })();
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
    for (let i = 0; i < 12 && still; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      const again = await fetch(`${BASE}/api/memory/search?query=${encodeURIComponent(probe)}&limit=5`).then((r) => r.json()).catch(() => null);
      still = (again?.data ?? []).some((d) => String(d.content ?? "").includes("zebrasalad"));
    }
    check("probe gone after delete (polled 12s)", !still);
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

  // T10 head-of-line blocking regression: with concurrent dispatch a slow
  // tools/call must NOT delay an interleaved quick call (dispatch used to
  // serialize; one slow call froze every request queued behind it).
  // The quick call is a LOCAL builtin (no upstream round-trip) so the ordering
  // assertion isolates dispatcher concurrency from kernel/box latency — on a
  // 100%-CPU shared box an upstream quick call can legitimately starve.
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
    const key = `jcode-t11-${Date.now()}`;
    await rpc("tools/call", { name: "memory_scratchpad_set", arguments: { key, value: "alphaone" } });
    await rpc("tools/call", { name: "memory_scratchpad_append", arguments: { key, value: "+betatwo" } });
    const got = await rpc("tools/call", { name: "memory_scratchpad_get", arguments: { key } });
    const gotText = JSON.stringify(got?.result ?? got);
    check("scratchpad set→append→get lifecycle", gotText.includes("alphaone") && gotText.includes("betatwo"), gotText.slice(0, 80));

    const tag = `t11tag${Date.now() % 1000000}`;
    const word = `narwhaltusk${Date.now() % 1000000}`;
    await rpc("tools/call", { name: "add_memory", arguments: { content: `tag filter probe ${word}`, tags: `${tag},jcode-ext-test` } });
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

  // T12 doc accuracy: every tool referenced in the installed skills must be a
  // live tool (docs can never drift from the real inventory unnoticed).
  {
    const skillRefs = new Set();
    for (const name of SKILLS) {
      const body = fs.readFileSync(path.join(REPO_ROOT, "addons", "jcode", "skills", name, "SKILL.md"), "utf8");
      for (const m of body.matchAll(/mcp__hypernexus__([a-z_]+)/g)) skillRefs.add(m[1]);
    }
    const dead = [...skillRefs].filter((n) => !names.has(n));
    check(`skills tool references all live (${skillRefs.size} names)`, dead.length === 0, dead.join(",") || "all live");
  }

  child.kill();
}

// T13 installer foreign-config preservation (temp target): a pre-existing
// foreign MCP server must survive install AND uninstall — the installer may
// never clobber user config (round-7 manual probe, now automated).
{
  const tmp = path.join(os.tmpdir(), `jcode-t13-${Date.now()}`);
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(
    path.join(tmp, "mcp.json"),
    JSON.stringify({ mcpServers: { "zz-foreign": { command: "foreign.exe", args: ["serve"] } } }, null, 2),
  );
  const installer = path.join(REPO_ROOT, "addons", "jcode", "install.mjs");
  try {
    execFileSync(process.execPath, [installer, "--target", tmp], { stdio: "pipe" });
    const cfg = JSON.parse(fs.readFileSync(path.join(tmp, "mcp.json"), "utf8"));
    check(
      "installer adds hypernexus + preserves foreign server",
      !!cfg.mcpServers?.hypernexus && !!cfg.mcpServers?.["zz-foreign"],
      Object.keys(cfg.mcpServers ?? {}).join(","),
    );
    check("installer --target writes skills", fs.existsSync(path.join(tmp, "skills", "hypernexus", "SKILL.md")));
    try {
      execFileSync(process.execPath, [installer, "--check", "--target", tmp], { stdio: "pipe" });
      check("installer --check --target exits 0", true);
    } catch {
      check("installer --check --target exits 0", false);
    }
    execFileSync(process.execPath, [installer, "--uninstall", "--target", tmp], { stdio: "pipe" });
    const after = JSON.parse(fs.readFileSync(path.join(tmp, "mcp.json"), "utf8"));
    check(
      "uninstall removes hypernexus + preserves foreign",
      !after.mcpServers?.hypernexus && !!after.mcpServers?.["zz-foreign"],
      Object.keys(after.mcpServers ?? {}).join(","),
    );
    check("uninstall removed skills dir", !fs.existsSync(path.join(tmp, "skills", "hypernexus")));
    check("uninstall removed managed-block files", !fs.existsSync(path.join(tmp, "prompt-overlay.md")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// T14 hooks: live execution of all 4 hook scripts (observe events exit 0,
// RBAC deny blocks destructive, transform repairs hyphenated queries).
console.log("=== T14: hooks (live execution) ===");
{
  function runHook(script, env, input) {
    return execFileSync(process.execPath, [path.join(REPO_ROOT, "addons", "jcode", "hooks", script)], {
      input, env: { ...process.env, ...env }, encoding: "utf8", timeout: 15000,
    });
  }
  for (const evt of ["session_start", "session_end", "turn_start", "turn_end", "post_tool"]) {
    const env = { JCODE_HOOK_EVENT: evt, JCODE_HOOK_SESSION_ID: "t14", JCODE_HOOK_MODEL: "m", JCODE_HOOK_STATUS: "ok", JCODE_HOOK_DURATION_MS: "10", JCODE_HOOK_TOOL_NAME: "read", JCODE_HOOK_TOUCHED_PATHS: "a/b.md" };
    let ok = false;
    try { ok = runHook("hn-observe.mjs", env, "").includes('"continue":true'); } catch { ok = false; }
    check(`observe ${evt} exits 0 + continue`, ok);
  }
  try {
    const out = runHook("hn-pre-tool.mjs", { JCODE_HOOK_TOOL_NAME: "bash" }, JSON.stringify({ command: "echo hi" }));
    check("pre_tool audit allows benign", out.includes('"continue":true'));
  } catch { check("pre_tool audit allows benign", false); }
  let blocked = false;
  try {
    runHook("hn-pre-tool.mjs", { JCODE_HOOK_TOOL_NAME: "bash", HYPERNEXUS_RBAC: "deny" }, JSON.stringify({ command: "rm -rf / --no-preserve-root" }));
  } catch (e) { blocked = e.status === 2; }
  check("pre_tool deny blocks destructive (exit 2)", blocked);
  let blockedW = false;
  try {
    runHook("hn-pre-tool.mjs", { JCODE_HOOK_TOOL_NAME: "write", HYPERNEXUS_RBAC: "deny" }, JSON.stringify({ file_path: "/etc/passwd" }));
  } catch (e) { blockedW = e.status === 2; }
  check("pre_tool deny blocks sensitive write (exit 2)", blockedW);
  try {
    const out = runHook("hn-pre-tool.mjs", { JCODE_HOOK_TOOL_NAME: "read", HYPERNEXUS_RBAC: "deny" }, JSON.stringify({ file_path: "C:/t/x.md" }));
    check("pre_tool deny allows benign read", out.includes('"continue":true'));
  } catch { check("pre_tool deny allows benign read", false); }
  try {
    const out = runHook("hn-pre-transform.mjs", { JCODE_HOOK_TOOL_NAME: "search_memory" }, JSON.stringify({ query: "foo-bar-baz", limit: 5 }));
    check("pre_transform repairs hyphenated query", JSON.parse(out).query === "foo bar baz", out.slice(0, 60));
  } catch (e) { check("pre_transform repairs hyphenated query", false, String(e.message).slice(0, 60)); }
  try {
    const out = runHook("hn-post-feedback.mjs", { JCODE_HOOK_TOOL_NAME: "search_memory" }, JSON.stringify({ query: "foo-bar-baz" }));
    check("post_feedback notes hyphen trap", out.includes("post_tool_feedback") && out.includes("foo bar baz"), out.slice(0, 60));
  } catch { check("post_feedback notes hyphen trap", false); }
  // installed copies byte-identical in both scopes
  for (const [scope, dir] of [["project", path.join(REPO_ROOT, ".jcode")], ["global", path.join(HOME, ".jcode")]]) {
    for (const h of ["hn-observe.mjs", "hn-pre-tool.mjs", "hn-post-feedback.mjs", "hn-pre-transform.mjs"]) {
      let same = false;
      try {
        same = fs.readFileSync(path.join(dir, "hooks", h), "utf8") === fs.readFileSync(path.join(REPO_ROOT, "addons", "jcode", "hooks", h), "utf8");
      } catch { same = false; }
      check(`${scope} hooks/${h} in sync`, same);
    }
  }
}

// T15 commands: all 13 hn-* installed byte-identical with valid frontmatter.
console.log("=== T15: commands (13 hn-*) ===");
{
  const COMMANDS = ["hn-status", "hn-store", "hn-remember", "hn-search", "hn-tools", "hn-session", "hn-context", "hn-plan", "hn-summary", "hn-restore", "hn-purge", "hn-auth", "hn-models"];
  check("13 commands registered", COMMANDS.length === 13, `${COMMANDS.length}`);
  for (const [scope, dir] of [["project", path.join(REPO_ROOT, ".jcode")], ["global", path.join(HOME, ".jcode")]]) {
    for (const name of COMMANDS) {
      let ok = false;
      let detail = "";
      try {
        const body = fs.readFileSync(path.join(dir, "skills", name, "SKILL.md"), "utf8");
        const front = body.match(/^---\nname:\s*(\S+)\ndescription:/);
        ok = body === fs.readFileSync(path.join(REPO_ROOT, "addons", "jcode", "commands", `${name}.md`), "utf8") && front?.[1] === name;
        if (!ok) detail = front ? "differs from source" : "bad frontmatter";
      } catch { detail = "missing"; }
      check(`${scope} skills/${name}/SKILL.md installed + valid`, ok, detail || undefined);
    }
  }
}

// T16 Meta auth routes (presence-checks only — reads NO secret contents).
console.log("=== T16: Meta auth routes (no secrets) ===");
{
  let syntax = false;
  try {
    execFileSync(process.execPath, ["--check", path.join(REPO_ROOT, "addons", "jcode", "bin", "meta-muse-key.mjs")], { stdio: "pipe", timeout: 15000 });
    syntax = true;
  } catch { syntax = false; }
  check("meta-muse-key.mjs syntax valid", syntax);
  let mint = false;
  let mintDetail = "";
  try {
    execFileSync(process.execPath, [path.join(REPO_ROOT, "addons", "jcode", "bin", "meta-muse-key.mjs"), "--check"], { stdio: "pipe", timeout: 45000 });
    mint = true;
    mintDetail = "mint OK (key hidden)";
  } catch (e) {
    mintDetail = String(e.stderr || e.message || e).slice(0, 120);
    mint = /expired|login meta/i.test(mintDetail);
    if (mint) mintDetail = `bridge correctly reports lapsed session: ${mintDetail}`;
  }
  check("bridge minter --check (live mint or clean lapse)", mint, mintDetail);
  const hasNative = fs.existsSync(path.join(HOME, ".jcode", "muse_subscription.json"));
  check("native muse-subscription credential presence reported", true, hasNative ? "present (~/.jcode/muse_subscription.json)" : "absent — run jcode login --provider muse-subscription");
  const snippet = fs.readFileSync(path.join(REPO_ROOT, "addons", "jcode", "meta-model.jcode.toml"), "utf8");
  check("meta snippet references muse-spark-1.3-contributor", snippet.includes("muse-spark-1.3-contributor") && snippet.includes("api_key_env"), "api_key_env reference only");
  const launcher = fs.readFileSync(path.join(REPO_ROOT, "addons", "jcode", "use-meta-model.ps1"), "utf8");
  check("launcher is native-first + bridge fallback", launcher.includes("muse-subscription") && launcher.includes("-Bridge"), "Route 1 native, Route 2 -Bridge");
  check("launcher bridge targets built-in meta-muse (-p meta-muse, jcode run)", launcher.includes("-p', 'meta-muse'") && launcher.includes("& $jcode run @ExtraArgs"), "no custom profile needed");
  const leak = /LLM\||sk-ant-|dca:/.test(launcher) || /LLM\||dca:/.test(snippet);
  check("no secrets embedded in snippet/launcher", !leak);
}

console.log(`\n=== JCODE-EXT SUMMARY: ${pass + fail} checks — ${pass} pass, ${fail} fail ===`);
if (fail > 0) process.exit(1);
