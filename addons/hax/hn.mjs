#!/usr/bin/env node
/**
 * hn.mjs — HyperNexus CLI driver for hax (and any shell)
 * ======================================================
 * hax deliberately has no MCP/extension/plugin/hook runtime: capabilities reach
 * the model as (1) skills (SKILL.md), (2) AGENTS.md project instructions, and
 * (3) CLI tools the model already knows how to run. This driver is surface (3):
 * a dependency-free (`node` stdlib only) CLI over every HyperNexus kernel
 * capability listed in addons/shared/hypernexus.manifest.json, so a hax session
 * can RECALL → DISCOVER → EXECUTE → PERSIST without leaving the terminal.
 *
 * Every command is bounded (default 25s, hot-path reads 5s), never throws an
 * unhandled rejection, and prints JSON to stdout — the shape hax's read/bash
 * tools consume naturally. Kernel-down degrades to a clear error object, never
 * reassuring fiction (Truth Pass).
 *
 * Usage:
 *   node hn.mjs status                        # kernel health + memory/mesh snapshot
 *   node hn.mjs search "query" [limit]        # L2 memory search (vector+keyword)
 *   node hn.mjs fts "query" [limit]           # hot-path FTS search (~15ms)
 *   node hn.mjs store "title" "content" "t1,t2" [category]
 *   node hn.mjs list [limit]
 *   node hn.mjs stats | handoff | routes | overview
 *   node hn.mjs update <id> "content" | delete <id>
 *   node hn.mjs tools "natural language query" # MCP tool discovery
 *   node hn.mjs suggest                        # preemptive tool suggestions
 *   node hn.mjs call <server> <tool> '{"k":"v"}'  # route a downstream MCP call
 *   node hn.mjs mcp-status | mcp-servers | mcp-tools [query]
 *   node hn.mjs sessions [limit] | session-get <id> | session-context [id]
 *   node hn.mjs skills [query] | skill-read <name>
 *   node hn.mjs code "query" [mode] | repomap [dir]
 *   node hn.mjs graph '{"entities":[{"name":"X","type":"T"}],"relations":[]}' | '{"action":"search","query":"..."}'
 *   node hn.mjs scratch-get <key> | scratch-set <key> "value"
 *   node hn.mjs harvest "task text" [limit]   # RECALL helper: L2 context pull
 *   node hn.mjs workflow-list | orchestrate '{"goal":"..."}'
 *   node hn.mjs browser [status | scrape <url> | <url>]
 *   node hn.mjs billing
 *
 * Env: HYPERNEXUS_URL (default http://127.0.0.1:7778), HN_TIMEOUT_MS,
 *   HN_FAST_MS (hot-path budget, default 5000), HN_RETRIES (default 1 on
 *   saturated hosts where the kernel answers slowly but correctly).
 */

const BASE = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
const TIMEOUT = parseInt(process.env.HN_TIMEOUT_MS || "25000", 10);
const FAST = parseInt(process.env.HN_FAST_MS || "5000", 10);
const RETRIES = Math.max(0, parseInt(process.env.HN_RETRIES || "1", 10));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
}
function fail(message, extra = {}) {
  out({ ok: false, error: message, base: BASE, ...extra });
  process.exitCode = 1;
}
async function reqOnce(method, path, body, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 2000) }; }
    return { ok: r.ok, status: r.status, data: data?.data ?? data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: `kernel unreachable: ${e.message}` } };
  } finally {
    clearTimeout(t);
  }
}
const get = (p, ms) => req("GET", p, undefined, ms);
const post = (p, b, ms) => req("POST", p, b, ms);
// Retry transport-level timeouts (status 0): on saturated hosts the kernel
// answers slowly but correctly, so one retry with backoff beats a false
// "unreachable". HTTP error statuses (4xx/5xx) are NOT retried.
async function req(method, path, body, ms = TIMEOUT, retries = RETRIES) {
  let last = await reqOnce(method, path, body, ms);
  for (let i = 0; i < retries && last.status === 0; i++) {
    await sleep(1500 * (i + 1));
    last = await reqOnce(method, path, body, ms);
  }
  return last;
}

async function main() {
const [cmd, ...args] = process.argv.slice(2);
const q = (s) => encodeURIComponent(s || "");

switch (cmd) {
  case "status": {
    const [h, m, mesh, cold] = await Promise.all([
      get("/health", FAST), get("/api/memory/list?limit=1", FAST),
      get("/api/mesh/status", FAST), get("/api/memory/cold-archive/count", FAST),
    ]);
    out({ ok: h.ok, kernel: h.data, memory: m.data, mesh: mesh.data, coldArchive: cold.data });
    break;
  }
  case "search": {
    if (!args[0]) return fail("usage: hn.mjs search \"query\" [limit]");
    out(await get(`/api/memory/search?q=${q(args[0])}&limit=${args[1] || 8}`));
    break;
  }
  case "fts": { // hot-path variant for turn loops / session priming
    if (!args[0]) return fail("usage: hn.mjs fts \"query\" [limit]");
    out(await get(`/api/memory/fts-search?q=${q(args[0])}&limit=${args[1] || 5}`, FAST));
    break;
  }
  case "store": {
    if (!args[0] || !args[1]) return fail("usage: hn.mjs store \"title\" \"content\" \"tag1,tag2\" [category]");
    // facts/add is the searchable write path (agent-memory store, visible to
    // search/fts). /api/memory/add only appends to the gossip mirror (list-only).
    out(await post("/api/memory/facts/add", {
      title: args[0], content: args[1],
      tags: (args[2] || "").split(",").map((t) => t.trim()).filter(Boolean),
      category: args[3] || "general",
    }));
    break;
  }
  case "observe": {
    if (!args[0]) return fail("usage: hn.mjs observe \"text\" \"tag1,tag2\"");
    out(await post("/api/memory/facts/add", {
      content: args[0],
      tags: (args[1] || "observation").split(",").map((t) => t.trim()).filter(Boolean),
      category: "observation",
    }));
    break;
  }
  case "list": out(await get(`/api/memory/list?limit=${args[0] || 10}`)); break;
  case "stats": out(await get("/api/agent-memory/stats", FAST)); break;
  case "handoff": {
    // True paths: /api/agent-memory/handoff (POST artifact) for writes,
    // /api/agent-memory/pickup (POST) for reads. Older /api/memory/handoff
    // is not published by this kernel build. The artifact's `notes` field
    // carries the summary (payload key is `notes`).
    if (args[0]) out(await post("/api/agent-memory/handoff", { notes: args[0], summary: args[0], content: args[0] }));
    else out(await post("/api/agent-memory/pickup", {}));
    break;
  }
  case "update": {
    // No published in-place update route on this kernel build: delete then
    // re-store via the searchable facts/add path (mirrors pi tn-purge + store).
    if (!args[0] || !args[1]) return fail("usage: hn.mjs update <id> \"new content\" [\"new title\"]");
    const del = await post("/api/agent/tool", { name: "delete_memory", args: { id: args[0] } });
    if (!del.ok) return fail(`update: could not remove ${args[0]} first`, { detail: del.data });
    out(await post("/api/memory/facts/add", { title: args[2] || `updated ${args[0]}`, content: args[1], tags: ["updated"], category: "general" }));
    break;
  }
  case "delete": {
    if (!args[0]) return fail("usage: hn.mjs delete <id>");
    // True path (mirrors pi tn-purge): delete_memory via the universal dispatcher.
    // Older /api/memory/delete is not published by this kernel build.
    const r = await post("/api/agent/tool", { name: "delete_memory", args: { id: args[0] } });
    if (r.ok) { out(r); break; }
    out(await req("DELETE", `/api/memory/delete?id=${q(args[0])}`));
    break;
  }
  case "tools": {
    if (!args[0]) return fail("usage: hn.mjs tools \"natural language query\"");
    out(await get(`/api/mcp/native/search?query=${q(args[0])}`));
    break;
  }
  case "suggest": out(await get("/api/mcp/tool-suggestions", FAST)); break;
  case "call": {
    if (!args[0]) return fail("usage: hn.mjs call <tool-name> '{\"k\":\"v\"}'  OR  hn.mjs call <server> <tool> '{\"k\":\"v\"}'");
    let tool, toolArgs;
    if (args[1] && args[2]) { tool = args[1]; try { toolArgs = JSON.parse(args[2]); } catch { return fail("third argument must be valid JSON"); } }
    else { tool = args[0]; try { toolArgs = JSON.parse(args[1] || "{}"); } catch { return fail("second argument must be valid JSON"); } }
    out(await post("/api/agent/tool", { name: tool, args: toolArgs }));
    break;
  }
  case "mcp-status": out(await get("/api/mcp/status", FAST)); break;
  case "mcp-servers": out(await get("/api/mcp/servers", FAST)); break;
  case "mcp-tools": {
    out(args[0]
      ? await get(`/api/mcp/native/search?query=${q(args[0])}`)
      : await get("/api/mcp/tools", FAST));
    break;
  }
  case "routes": {
    // NOTE: /api/routes is referenced by older clients but not published by
    // this kernel build; fall back to the MCP tool inventory for discovery.
    const r = await get("/api/mcp/tools?limit=200", FAST);
    if (r.ok) { out(r); break; }
    out(await get("/api/mcp/native/search?query=kernel+routes", FAST));
    break;
  }
  case "overview": out(await get("/api/system/overview", FAST)); break;
  case "billing": out(await get("/api/billing/status", FAST)); break;
  case "sessions": out(await get(`/api/sessions/summary?limit=${args[0] || 10}`)); break;
  case "session-get": {
    if (!args[0]) return fail("usage: hn.mjs session-get <id>");
    out(await get(`/api/sessions/imported/get?id=${q(args[0])}`));
    break;
  }
  case "session-context": out(await get(`/api/sessions/context${args[0] ? `?id=${q(args[0])}` : ""}`)); break;
  case "skills": {
    out(args[0] ? await get(`/api/skills/search?q=${q(args[0])}`) : await get("/api/skills", FAST));
    break;
  }
  case "skill-read": {
    if (!args[0]) return fail("usage: hn.mjs skill-read <name>");
    out(await get(`/api/skills/read?name=${q(args[0])}`));
    break;
  }
  case "code": {
    if (!args[0]) return fail("usage: hn.mjs code \"query\" [mode]");
    out(await get(`/api/mcp/native/search?query=${q(`${args[1] || "code"} ${args[0]}`)}`));
    break;
  }
  case "repomap": {
    // Resolve relative dirs client-side: the kernel serves CWD-relative paths
    // against its own workspace root, so pass an absolute path through. If it
    // still fails, the server error (with the bad path) is returned verbatim.
    const path = await import("node:path");
    const dir = args[0] || "";
    const abs = /^(?:[a-zA-Z]:[\\/]|\\\\|\/)/.test(dir) ? dir : path.resolve(process.cwd(), dir);
    out(await post("/api/agent/tool", { name: "repomap", args: { dir: abs } }));
    break;
  }
  case "graph": {
    // Mirrors the pi extension: /api/knowledge/graph for writes, memory search for reads.
    if (!args[0]) return fail("usage: hn.mjs graph '{\"action\":\"search\",\"query\":\"...\"}' | '{\"entities\":[],\"relations\":[]}'");
    let g; try { g = JSON.parse(args[0]); } catch { return fail("argument must be valid JSON"); }
    if (g.action === "search" || g.query) {
      out(await get(`/api/memory/search?q=${q(g.query || "")}&limit=${g.limit || 8}`));
      break;
    }
    const action = g.action || (g.relations?.length ? "add_relations" : "add_entities");
    out(await post("/api/knowledge/graph", { action, entities: g.entities ?? [], relations: g.relations ?? [], observations: g.observations ?? [] }));
    break;
  }
  case "scratch-get": {
    if (!args[0]) return fail("usage: hn.mjs scratch-get <key>");
    out(await get(`/api/memory/scratchpad/get?key=${q(args[0])}`, FAST));
    break;
  }
  case "scratch-set": {
    if (!args[0] || args[1] === undefined) return fail("usage: hn.mjs scratch-set <key> \"value\"");
    out(await post("/api/memory/scratchpad/set", { key: args[0], value: args[1] }));
    break;
  }
  case "harvest": { // RECALL helper: one call pulls task-relevant L2 context
    if (!args[0]) return fail("usage: hn.mjs harvest \"task text\" [limit]");
    const n = args[1] || 8;
    const [mem, tools] = await Promise.all([
      get(`/api/memory/search?q=${q(args[0])}&limit=${n}`),
      get(`/api/mcp/native/search?query=${q(args[0])}`, FAST),
    ]);
    out({ ok: true, task: args[0], memories: mem.data, suggestedTools: tools.data });
    break;
  }
  case "workflow-list": out(await get("/api/workflows")); break;
  case "orchestrate": {
    if (!args[0]) return fail("usage: hn.mjs orchestrate '{\"goal\":\"...\"}'");
    let g; try { g = JSON.parse(args[0]); } catch { return fail("argument must be valid JSON"); }
    out(await post("/api/agent/orchestrate", g, 60000));
    break;
  }
  case "browser": {
    // Mirrors the pi extension: scrape <url> or status check.
    if (args[0] === "status" || !args[0]) { out(await get("/api/browser/status", FAST)); break; }
    if (args[0] === "scrape" && args[1]) { out(await post("/api/browser/scrape", { url: args[1] })); break; }
    if (args[0] && args[0].startsWith("{")) {
      let g; try { g = JSON.parse(args[0]); } catch { return fail("argument must be valid JSON"); }
      if (g.action === "status" || (!g.action && !g.url)) { out(await get("/api/browser/status", FAST)); break; }
      out(await post("/api/browser/scrape", { url: g.url || g }));
      break;
    }
    // Bare URL → scrape.
    out(await post("/api/browser/scrape", { url: args[0] }));
    break;
  }
  default:
    fail(`unknown command: ${cmd || "(none)"}`, {
      hint: "status|search|fts|store|observe|list|stats|handoff|update|delete|tools|suggest|call|mcp-status|mcp-servers|mcp-tools|routes|overview|billing|sessions|session-get|session-context|skills|skill-read|code|repomap|graph|scratch-get|scratch-set|harvest|workflow-list|orchestrate|browser",
    });
    break;
}
}

main().catch((e) => fail(e?.message || String(e)));
