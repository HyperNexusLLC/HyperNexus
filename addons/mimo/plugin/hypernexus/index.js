// HyperNexus MiMoCode server plugin — maximally uses the @mimo-ai/plugin Hooks API.
// Mirrors the Pi extension's ExtensionAPI coverage: typed tools (zod), a
// non-blocking conversation monitor that surfaces MCP tool suggestions, L2 memory,
// session/actor lifecycle capture, permission hints, and progressive catalog routing
// (the 50K-tool library narrowed to a handful via /api/tools/search + tool-suggestions).
//
// Every kernel call is budgeted and never throws: a hung kernel degrades to a short
// note rather than stalling the agent's turn (per the hot-path-never-blocks rule).

import { tool } from "@mimo-ai/plugin";

// ── Kernel client ─────────────────────────────────────────────────────────────
// Base URL: options.baseUrl > HYPERNEXUS_URL env > local default.
const DEFAULT_BASE = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
let BASE = DEFAULT_BASE;
const SLOW_BUDGET = 8000; // memory/search may warm ONNX — allow longer
const FAST_BUDGET = 2500; // status/search must stay snappy
const HOOK_BUDGET = 400; // hot-path hooks: never block a turn

async function hnFetch(path, { method = "GET", body, budget = FAST_BUDGET } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), budget);
  try {
    const res = await fetch(BASE + path, {
      method,
      signal: ctrl.signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const msg = String(err && err.name === "AbortError" ? "timeout" : err);
    return { ok: false, status: 0, data: null, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

function summarize(r, fallback) {
  if (r && r.ok && r.data != null) return r.data;
  const why = r && r.error ? r.error : r && r.status ? `HTTP ${r.status}` : "unavailable";
  return { note: `${fallback} (${why})`, ok: false };
}

// POST with one retry on timeout. Memory writes matter more than the latency cap
// (the kernel memory endpoints stall under load / ONNX warmup).
async function hnPostRetry(path, body, budget = SLOW_BUDGET) {
  let r = await hnFetch(path, { method: "POST", body, budget });
  if (!r.ok && r.error === "timeout") {
    r = await hnFetch(path, { method: "POST", body, budget });
  }
  return r;
}

// Cache for the conversation monitor's latest suggestions (non-blocking writes).
let lastSuggestions = { query: null, tools: [], at: 0 };
// Cached system-context note. Refreshed at most every SYS_TTL ms so every turn gets
// the note deterministically (never random-skipped); only the health probe is throttled.
let sysCache = { note: "", at: 0 };
const SYS_TTL = 15_000;
// Cache for retrieval-augmented L2 memory (filled in the background by chat.message /
// session.pre, injected by experimental.chat.system.transform). Never blocks a turn.
let lastMemories = { query: null, items: [], at: 0 };
const MEM_TTL = 30_000; // don't re-search more than every 30s
const SUG_TTL = 60_000;

// Telemetry batcher: high-frequency fire-and-forget writes (tool-exec, llm-step,
// chat-params, etc.) are buffered and flushed in a single batch POST every 2s or
// at 20 items. Cuts HTTP round-trips from 8+/turn to ~1 batch. Never blocks.
const telemBuf = [];
let telemTimer = null;
const TELEM_FLUSH_MS = 2000;
const TELEM_MAX = 20;
function queueTelemetry(entry) {
  try {
    telemBuf.push(entry);
    if (telemBuf.length >= TELEM_MAX) { flushTelemetry(); return; }
    if (!telemTimer) telemTimer = setTimeout(flushTelemetry, TELEM_FLUSH_MS);
  } catch { /* ignore */ }
}
function flushTelemetry() {
  if (telemTimer) { clearTimeout(telemTimer); telemTimer = null; }
  if (!telemBuf.length) return;
  const batch = telemBuf.splice(0, TELEM_MAX);
  hnFetch("/api/memory/facts/add", {
    method: "POST",
    body: {
      title: `telemetry-batch:${batch.length}`,
      content: batch.map((e) => `${e.title}: ${e.content}`).join("\n").slice(0, 2000),
      tags: ["telemetry", "batch"],
      namespace: "global",
    },
    budget: HOOK_BUDGET,
  }).catch(() => {});
}

// Warm the L2 memory cache in the background. Uses FTS search (~15ms) instead of
// vector /api/memory/search (~800ms ONNX embed) so the result lands in time for the
// SAME turn's system.transform — the slow search always blew the 400ms hot-path
// budget and silently injected nothing. Falls back to vector search only when FTS
// is unavailable. Fire-and-forget: never blocks a turn.
function warmMemories(query) {
  const now = Date.now();
  if (now - lastMemories.at < MEM_TTL) return; // throttled
  if (!query || query.trim().length < 4) return;
  // FTS MATCH throws on unbalanced quotes/operators — keep only word chars + spaces.
  const safe = query.replace(/[^a-zA-Z0-9\s_-]/g, " ").trim().slice(0, 80);
  if (!safe) return;
  hnFetch(`/api/memory/fts-search?q=${encodeURIComponent(safe)}&limit=3`, { budget: FAST_BUDGET })
    .then((r) => {
      // FTS shape: {data: [{record: {content, tags, ...}}]} — normalize to {title, content}
      const raw = r.ok && r.data && r.data.data ? r.data.data : null;
      let items = [];
      if (Array.isArray(raw) && raw.length) {
        items = raw.slice(0, 3).map((x) => {
          const rec = x && x.record ? x.record : x;
          return {
            title: (rec && (rec.title || rec.tags || rec.name)) || "memory",
            content: String((rec && (rec.content || rec.text || rec.snippet || "")) || ""),
          };
        });
      }
      if (items.length) {
        lastMemories = { query, items, at: Date.now() };
        return;
      }
      // Fallback: slow vector search (only if FTS returned nothing, off hot path).
      hnFetch(`/api/memory/search?query=${encodeURIComponent(query.slice(0, 200))}&limit=3`, { budget: SLOW_BUDGET })
        .then((r2) => {
          const data = r2.ok && r2.data && r2.data.data ? r2.data.data : null;
          if (Array.isArray(data) && data.length) {
            lastMemories = { query, items: data.slice(0, 3), at: Date.now() };
          }
        })
        .catch(() => {});
    })
    .catch(() => {});
}

// ── Tool factory helpers ──────────────────────────────────────────────────────
const z = tool.schema;
const desc = (s) => s;

// ── Plugin ───────────────────────────────────────────────────────────────────
export const server = async (input, options = {}) => {
  if (options && options.baseUrl) BASE = String(options.baseUrl);
  const boot = Date.now();
  // Definitive load marker (also logged). Proves the factory ran at boot.
  try {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      "C:/Users/hyper/workspace/HyperNexus/addons/mimo/plugin/LOADED.marker",
      `hypernexus server plugin loaded at ${new Date().toISOString()} kernel=${BASE}\n`,
      "utf8"
    );
    console.error(`[hypernexus] server plugin active. kernel=${BASE}`);
  } catch { /* ignore */ }

  // 24. WORKSPACE ADAPTOR — HyperNexus-managed local worktrees (degrades silently
  //     when the experimental workspace API is absent in older runtimes).
  try {
    if (input && input.experimental_workspace && typeof input.experimental_workspace.register === "function") {
      input.experimental_workspace.register("hypernexus", {
        name: "HyperNexus Worktree",
        description: "Local directory worktree managed with HyperNexus session/memory linkage",
        configure(config) {
          return { ...config, extra: { ...(config.extra || {}), managedBy: "hypernexus" } };
        },
        async create(config) {
          try {
            const { mkdirSync, writeFileSync } = await import("node:fs");
            const dir = config.directory || config.name || "hypernexus-worktree";
            mkdirSync(dir, { recursive: true });
            writeFileSync(`${dir}/.hypernexus-worktree.json`, JSON.stringify({ id: config.id, projectID: config.projectID, created: Date.now() }), "utf8");
          } catch { /* ignore */ }
        },
        async remove(config) {
          try {
            const { rmSync } = await import("node:fs");
            const dir = config.directory;
            if (dir && dir.includes("hypernexus")) rmSync(`${dir}/.hypernexus-worktree.json`, { force: true });
          } catch { /* ignore */ }
        },
        target(config) {
          return { type: "local", directory: config.directory || "." };
        },
      });
    }
  } catch { /* ignore */ }

  return {
    // 1. TYPED TOOLS — first-class MiMoCode tools calling the HyperNexus kernel.
    tool: {
      hypernexus_status: tool({
        description: "HyperNexus kernel health, version, uptime, and MCP bridge status. Use to confirm the kernel is reachable before memory or catalog calls.",
        args: {},
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "HyperNexus status" }); } catch { /* ignore */ }
          const [h, m] = await Promise.all([
            hnFetch("/health", { budget: FAST_BUDGET }),
            hnFetch("/api/mcp/status", { budget: FAST_BUDGET }),
          ]);
          return {
            output: JSON.stringify({ health: summarize(h, "health"), mcp: summarize(m, "mcp status") }, null, 2),
            metadata: { kernelOk: !!h.ok },
          };
        },
      }),

      hypernexus_search_tools: tool({
        description:
          "Search the HyperNexus MCP tool catalog (50K+ tools) by free-text query and return the best-matching tool definitions. This is the progressive-routing entry point: call it to discover relevant tools, then invoke them directly. Prefer this over guessing tool names.",
        args: {
          query: z.string().describe("What you are trying to do (e.g. 'search memory', 'read a PDF', 'deploy to server')"),
          limit: z.number().int().min(1).max(25).optional().describe("Max tools to return (default 8)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Search tools: ${String(args.query).slice(0, 40)}` }); } catch { /* ignore */ }
          const limit = args.limit || 8;
          const r = await hnFetch(`/api/tools/search?query=${encodeURIComponent(args.query)}`, { budget: FAST_BUDGET });
          const data = r.ok && r.data && r.data.data ? r.data.data : [];
          const top = Array.isArray(data) ? data.slice(0, limit) : [];
          lastSuggestions = { query: args.query, tools: top, at: Date.now() };
          return {
            output: JSON.stringify({ count: top.length, tools: top }, null, 2),
            metadata: { count: top.length, source: (r.data && r.data.bridge && r.data.bridge.source) || "local-tool-db" },
          };
        },
      }),

      hypernexus_suggest_tools: tool({
        description:
          "Ask the HyperNexus local-LLM conversation monitor which MCP tools/servers best fit a phrase or question. Returns ranked suggestions from the advertiser. Use when deciding which integration to reach for.",
        args: {
          query: z.string().describe("The task or question in natural language"),
        },
        async execute(args) {
          // Trigger the predictor (POST), then poll for suggestions (GET). The local-LLM
          // advertiser is async — the first GET often returns null while it warms up.
          await hnFetch("/api/mcp/tool-suggestions", { method: "POST", body: { query: args.query }, budget: HOOK_BUDGET });
          let g = null;
          let data = null;
          for (let i = 0; i < 3; i++) {
            g = await hnFetch(`/api/mcp/tool-suggestions?query=${encodeURIComponent(args.query)}`, { budget: FAST_BUDGET });
            data = g.ok && g.data ? g.data.data : null;
            if (Array.isArray(data) && data.length) break;
            if (i < 2) await new Promise((res) => setTimeout(res, 350));
          }
          if (Array.isArray(data) && data.length) lastSuggestions = { query: args.query, tools: data, at: Date.now() };
          return {
            output: JSON.stringify(summarize(g, "suggestions"), null, 2),
            metadata: { found: Array.isArray(data) ? data.length : 0 },
          };
        },
      }),

      hypernexus_mcp_status: tool({
        description: "HyperNexus MCP bridge status: which upstream is active, fallback reason, and connected servers.",
        args: {},
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "HyperNexus MCP status" }); } catch { /* ignore */ }
          const r = await hnFetch("/api/mcp/status", { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "mcp status"), null, 2) };
        },
      }),

      hypernexus_mcp_servers: tool({
        description: "List MCP servers registered with the HyperNexus kernel and their connection state.",
        args: {},
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "HyperNexus MCP servers" }); } catch { /* ignore */ }
          const r = await hnFetch("/api/mcp/servers", { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "mcp servers"), null, 2) };
        },
      }),

      hypernexus_mcp_tools: tool({
        description: "List the tools exposed by connected MCP servers via HyperNexus (live tool inventory).",
        args: {
          limit: z.number().int().min(1).max(50).optional().describe("Cap the returned tools (default 20)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "HyperNexus MCP tools" }); } catch { /* ignore */ }
          const r = await hnFetch("/api/mcp/tools", { budget: FAST_BUDGET });
          const data = r.ok && r.data && r.data.data ? r.data.data : [];
          const top = Array.isArray(data) ? data.slice(0, args.limit || 20) : data;
          return {
            output: JSON.stringify({ count: Array.isArray(top) ? top.length : 0, tools: top }, null, 2),
            metadata: { total: Array.isArray(data) ? data.length : 0 },
          };
        },
      }),

      hypernexus_memory_search: tool({
        description: "Fast keyword search over the HyperNexus L2 memory vault (FTS-powered, ~15ms). Falls back to semantic vector search if no keyword matches.",
        args: {
          query: z.string().describe("What to look for in memory"),
          limit: z.number().int().min(1).max(20).optional().describe("Max results (default 5)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Memory search: ${String(args.query).slice(0, 40)}` }); } catch { /* ignore */ }
          const limit = args.limit || 5;
          const safe = String(args.query).replace(/[^a-zA-Z0-9\s_-]/g, " ").trim().slice(0, 80);
          // Fast path: FTS keyword search (~15ms)
          const fts = await hnFetch(`/api/memory/fts-search?q=${encodeURIComponent(safe)}&limit=${limit}`, { budget: FAST_BUDGET });
          const ftsData = fts.ok && fts.data && Array.isArray(fts.data.data) ? fts.data.data : [];
          if (ftsData.length) {
            const items = ftsData.map((x) => {
              const rec = x && x.record ? x.record : x;
              return { title: rec.title || rec.tags || "memory", content: rec.content || rec.text || "", score: rec.score || 0 };
            });
            return { output: JSON.stringify({ count: items.length, source: "fts", data: items }, null, 2) };
          }
          // Slow path: semantic vector search (ONNX embed, ~800ms+)
          const r = await hnFetch(`/api/memory/search?query=${encodeURIComponent(args.query)}&limit=${limit}`, { budget: SLOW_BUDGET });
          return { output: JSON.stringify(summarize(r, "memory search"), null, 2) };
        },
      }),

      hypernexus_memory_store: tool({
        description: "Store a fact/insight into the HyperNexus L2 memory vault so it persists across sessions. Provide a concise title, content, and tags.",
        args: {
          title: z.string().describe("Short label for the memory"),
          content: z.string().describe("The fact or insight to remember"),
          tags: z.array(z.string()).optional().describe("Topic tags"),
          namespace: z.string().optional().describe("project | global | user (default project)"),
        },
        async execute(args) {
          const r = await hnPostRetry("/api/memory/facts/add", {
            title: args.title,
            content: args.content,
            tags: args.tags || [],
            namespace: args.namespace || "project",
          });
          return { output: JSON.stringify(summarize(r, "memory store"), null, 2) };
        },
      }),

      hypernexus_context_harvest: tool({
        description: "Capture a concise snapshot of the current working context (goal, key files, decisions) into HyperNexus memory. Call at natural checkpoints.",
        args: {
          summary: z.string().describe("What was accomplished / current state"),
          keyFiles: z.array(z.string()).optional().describe("Important file paths touched"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "Context harvest" }); } catch { /* ignore */ }
          const content = `${args.summary}${args.keyFiles && args.keyFiles.length ? `\nKey files: ${args.keyFiles.join(", ")}` : ""}`;
          const r = await hnPostRetry("/api/memory/facts/add", {
            title: "context-harvest",
            content,
            tags: ["context-harvest"],
            namespace: "project",
          });
          return { output: JSON.stringify(summarize(r, "context harvest"), null, 2) };
        },
      }),

      hypernexus_memory_stats: tool({
        description: "Get HyperNexus L2 memory statistics: entry count, section breakdown, store health. Use to gauge memory capacity before bulk writes.",
        args: {},
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "Memory stats" }); } catch { /* ignore */ }
          const r = await hnFetch("/api/agent-memory/stats", { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "memory stats"), null, 2) };
        },
      }),

      hypernexus_memory_handoff: tool({
        description: "Write or read cross-session handoff notes. Call with summary to write a handoff at session end; call with pickup=true to resume from the last handoff.",
        args: {
          summary: z.string().optional().describe("Handoff summary to write (omit for pickup)"),
          pickup: z.boolean().optional().describe("Set true to read the last handoff"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: args.pickup ? "Memory pickup" : "Memory handoff" }); } catch { /* ignore */ }
          if (args.pickup) {
            const r = await hnFetch("/api/agent-memory/pickup", { method: "POST", body: {}, budget: FAST_BUDGET });
            return { output: JSON.stringify(summarize(r, "memory pickup"), null, 2) };
          }
          const r = await hnFetch("/api/agent-memory/handoff", {
            method: "POST",
            body: { summary: args.summary || "handoff", tags: ["handoff"], namespace: "project" },
            budget: SLOW_BUDGET,
          });
          return { output: JSON.stringify(summarize(r, "memory handoff"), null, 2) };
        },
      }),

      hypernexus_skills_search: tool({
        description: "Search the HyperNexus skill catalog. Returns matching skills with names and descriptions. Use to discover reusable skill modules.",
        args: {
          query: z.string().describe("What to search for (e.g. 'deploy', 'PDF generation', 'data analysis')"),
          limit: z.number().int().min(1).max(20).optional().describe("Max results (default 8)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Skills: ${String(args.query).slice(0, 40)}` }); } catch { /* ignore */ }
          const limit = args.limit || 8;
          const r = await hnFetch(`/api/skills/search?q=${encodeURIComponent(args.query)}&limit=${limit}`, { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "skills search"), null, 2) };
        },
      }),

      hypernexus_system_overview: tool({
        description: "Get a unified HyperNexus system overview: kernel health, MCP bridge, memory, sessions, providers, and runtime status in one call.",
        args: {},
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "System overview" }); } catch { /* ignore */ }
          const [h, m, rt] = await Promise.all([
            hnFetch("/health", { budget: FAST_BUDGET }),
            hnFetch("/api/mcp/status", { budget: FAST_BUDGET }),
            hnFetch("/api/runtime/status", { budget: FAST_BUDGET }),
          ]);
          return {
            output: JSON.stringify({
              health: summarize(h, "health"),
              mcp: summarize(m, "mcp"),
              runtime: summarize(rt, "runtime"),
            }, null, 2),
            metadata: { kernelOk: !!h.ok },
          };
        },
      }),

      hypernexus_memory_vector_search: tool({
        description: "Semantic vector search across L2 memory using local embeddings (384-dim). Finds conceptually related memories even without keyword overlap. Use for deep recall.",
        args: {
          query: z.string().describe("Concept or question to find related memories for"),
          limit: z.number().int().min(1).max(20).optional().describe("Max results (default 8)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Vector search: ${String(args.query).slice(0, 40)}` }); } catch { /* ignore */ }
          const limit = args.limit || 8;
          const r = await hnFetch(`/api/memory/search?q=${encodeURIComponent(args.query)}&limit=${limit}`, { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "vector search"), null, 2) };
        },
      }),

      hypernexus_memory_list: tool({
        description: "Browse recent L2 memories and stats. Use to review what's been stored or find a memory you can't recall the exact query for.",
        args: {
          limit: z.number().int().min(1).max(50).optional().describe("Max results (default 15)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "Recent memories" }); } catch { /* ignore */ }
          const limit = args.limit || 15;
          const r = await hnFetch(`/api/memory/list?limit=${limit}`, { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "memories"), null, 2) };
        },
      }),

      hypernexus_scratchpad: tool({
        description: "Read or write the L1 scratchpad — short-lived working memory for the current session. Use to remember goals, constraints, or intermediate state across turns.",
        args: {
          action: z.enum(["get", "set"]).describe("get = read scratchpad, set = write scratchpad"),
          key: z.string().describe("Scratchpad key (e.g. 'goal', 'current_task', 'constraints')"),
          value: z.string().optional().describe("Value to set (required when action=set)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Scratchpad ${args.action}: ${String(args.key).slice(0, 30)}` }); } catch { /* ignore */ }
          if (args.action === "set") {
            const r = await hnFetch("/api/memory/scratchpad/set", {
              method: "POST", body: { key: args.key, value: args.value || "" }, budget: FAST_BUDGET,
            });
            return { output: JSON.stringify(summarize(r, "scratchpad set"), null, 2) };
          }
          const r = await hnFetch(`/api/memory/scratchpad/get?key=${encodeURIComponent(args.key)}`, { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "scratchpad get"), null, 2) };
        },
      }),

      hypernexus_session_search: tool({
        description: "Search imported coding sessions (Claude Code, Aider, MiMoCode, etc.). Use to find how a problem was solved previously or recover context from past work.",
        args: {
          query: z.string().describe("Search query for session content"),
          limit: z.number().int().min(1).max(20).optional().describe("Max results (default 8)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Sessions: ${String(args.query).slice(0, 40)}` }); } catch { /* ignore */ }
          const limit = args.limit || 8;
          const r = await hnFetch(`/api/sessions/imported/list?query=${encodeURIComponent(args.query)}&limit=${limit}`, { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "session search"), null, 2) };
        },
      }),

      hypernexus_code_search: tool({
        description: "Search code via AST-grep symbols, definitions, or references. Modes: symbols | definitions | references. Use for codebase navigation and impact analysis.",
        args: {
          query: z.string().describe("Symbol name or code pattern to search for"),
          mode: z.enum(["symbols", "definitions", "references"]).optional().describe("Search mode (default: symbols)"),
          limit: z.number().int().min(1).max(20).optional().describe("Max results (default 10)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Code ${args.mode || "symbols"}: ${String(args.query).slice(0, 40)}` }); } catch { /* ignore */ }
          const mode = args.mode || "symbols";
          const limit = args.limit || 10;
          const r = await hnFetch(`/api/mcp/native/search?query=${encodeURIComponent(`${mode} ${args.query}`)}&limit=${limit}`, { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "code search"), null, 2) };
        },
      }),

      hypernexus_mcp_call: tool({
        description: "Invoke a discovered MCP tool through the HyperNexus kernel router. Use after hypernexus_search_tools or hypernexus_mcp_tools to execute a tool by name.",
        args: {
          tool: z.string().describe("Tool name (e.g. 'tormentnexus__hello_world' or 'server__tool')"),
          args: z.record(z.string(), z.any()).optional().describe("Arguments to pass to the tool"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `MCP call: ${String(args.tool).slice(0, 40)}` }); } catch { /* ignore */ }
          const r = await hnFetch("/api/agent/tool", {
            method: "POST", body: { name: args.tool, args: args.args || {} }, budget: 8000,
          });
          return { output: JSON.stringify(summarize(r, "mcp call"), null, 2) };
        },
      }),

      hypernexus_subagent: tool({
        description: "Record a task / TODO to L2 memory for tracking and later recall. This records intent — it does NOT spawn a live sub-agent. Retrieve stored tasks with hypernexus_memory_search (tag subagent).",
        args: {
          task: z.string().describe("What the subagent should accomplish"),
          context: z.string().optional().describe("Additional context or constraints for the subagent"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Subagent: ${String(args.task).slice(0, 40)}` }); } catch { /* ignore */ }
          const content = `[SUBAGENT TASK] ${args.task}` + (args.context ? `\n\nContext: ${args.context}` : "");
          const r = await hnFetch("/api/memory/add", {
            method: "POST", body: { content, category: "subagent", tags: ["subagent", "dispatch"] }, budget: FAST_BUDGET,
          });
          return {
            output: JSON.stringify({ ...summarize(r, "subagent dispatch"), note: "Task recorded to L2. Use hypernexus_memory_search to find results." }, null, 2),
          };
        },
      }),

      hypernexus_billing_status: tool({
        description: "Provider quotas, model pricing, and billing/usage status. Verify quotas before heavy model use.",
        args: {},
        async execute(_args, context) {
          try { if (context && context.metadata) context.metadata({ title: "Billing status" }); } catch { /* ignore */ }
          const r = await hnFetch("/api/billing/status", { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "billing status"), null, 2) };
        },
      }),

      hypernexus_add_fact: tool({
        description: "Persist a structured fact, observation, or decision to L2 memory with a kind + tags for precise recall. Prefer over memory_store when the item has a clear type.",
        args: {
          content: z.string().describe("The fact / observation / decision"),
          kind: z.enum(["fact", "observation", "decision", "gotcha"]).optional().describe("Item type (default fact)"),
          tags: z.array(z.string()).optional().describe("Tags for recall"),
          importance: z.number().min(0).max(1).optional().describe("0..1 importance (default 0.6)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Add ${args.kind || "fact"}` }); } catch { /* ignore */ }
          const r = await hnFetch("/api/memory/add", {
            method: "POST",
            body: { content: args.content, category: args.kind || "fact", tags: args.tags || [], importance: args.importance ?? 0.6 },
            budget: SLOW_BUDGET,
          });
          return { output: JSON.stringify(summarize(r, "add fact"), null, 2) };
        },
      }),

      hypernexus_memory_delete: tool({
        description: "Delete an L2 memory by ID. Use after hypernexus_memory_search or hypernexus_memory_list to remove stale or incorrect entries.",
        args: {
          id: z.string().describe("Memory ID to delete"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Delete memory ${args.id}` }); } catch { /* ignore */ }
          const r = await hnFetch("/api/memory/delete", {
            method: "POST",
            body: { id: args.id },
            budget: FAST_BUDGET,
          });
          return { output: JSON.stringify(summarize(r, "delete memory"), null, 2) };
        },
      }),

      hypernexus_kernel_routes: tool({
        description: "List all registered kernel API routes with categories and descriptions. Use to discover available kernel endpoints beyond the typed tools.",
        args: {
          category: z.string().optional().describe("Filter by category (e.g. 'memory', 'mcp', 'session', 'control')"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "List kernel routes" }); } catch { /* ignore */ }
          const r = await hnFetch("/api/routes", { budget: FAST_BUDGET });
          if (r.ok && r.data) {
            const routes = Array.isArray(r.data) ? r.data : (r.data.data || r.data.routes || []);
            const filtered = args.category
              ? routes.filter((x) => x.category === args.category || x.Category === args.category)
              : routes;
            return { output: JSON.stringify({ count: filtered.length, routes: filtered.slice(0, 80) }, null, 2) };
          }
          return { output: JSON.stringify(summarize(r, "kernel routes"), null, 2) };
        },
      }),

      hypernexus_memory_update: tool({
        description: "Update an existing L2 memory's content or tags. Use to correct or refine a stored fact.",
        args: {
          id: z.string().describe("Memory ID to update"),
          content: z.string().optional().describe("New content (omit to keep current)"),
          tags: z.array(z.string()).optional().describe("New tags (omit to keep current)"),
          title: z.string().optional().describe("New title (omit to keep current)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Update memory ${args.id}` }); } catch { /* ignore */ }
          const body = { id: args.id };
          if (args.content !== undefined) body.content = args.content;
          if (args.tags !== undefined) body.tags = args.tags;
          if (args.title !== undefined) body.title = args.title;
          const r = await hnFetch("/api/memory/update", {
            method: "POST",
            body,
            budget: SLOW_BUDGET,
          });
          return { output: JSON.stringify(summarize(r, "update memory"), null, 2) };
        },
      }),

      hypernexus_session_list: tool({
        description: "List active and recent HyperNexus sessions with their status and metadata. Use to discover other agents or sessions working on related tasks.",
        args: {
          limit: z.number().int().min(1).max(50).optional().describe("Max sessions to return (default 10)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "List sessions" }); } catch { /* ignore */ }
          const r = await hnFetch(`/api/sessions/summary?limit=${args.limit || 10}`, { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "session list"), null, 2) };
        },
      }),

      hypernexus_skill_manage: tool({
        description: "Manage HyperNexus skills: list, search, read, create. Skills are reusable SKILL.md modules.",
        args: {
          action: z.enum(["list", "search", "read", "create"]).describe("Action to perform"),
          id: z.string().optional().describe("Skill name for read/create"),
          query: z.string().optional().describe("Search query (for search)"),
          content: z.string().optional().describe("Full markdown content (for create)"),
          limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Skill ${args.action}` }); } catch { /* ignore */ }
          if (args.action === "list" || args.action === "search") {
            const r = await hnFetch("/api/skills", { budget: FAST_BUDGET });
            const skills = (r.ok && r.data && (r.data.data || r.data.skills)) || [];
            const q = (args.query || "").toLowerCase();
            const filtered = q ? skills.filter((s) => `${s.id || ""} ${s.name || ""} ${s.description || ""}`.toLowerCase().includes(q)) : skills;
            return { output: JSON.stringify({ action: args.action, count: Math.min(filtered.length, args.limit || 20), items: filtered.slice(0, args.limit || 20) }, null, 2) };
          }
          if (args.action === "read") {
            if (!args.id) return { output: JSON.stringify({ error: "Provide id" }) };
            const r = await hnFetch(`/api/skills/read?name=${encodeURIComponent(args.id)}`, { budget: FAST_BUDGET });
            return { output: JSON.stringify(summarize(r, "skill read"), null, 2) };
          }
          if (args.action === "create") {
            if (!args.id || !args.content) return { output: JSON.stringify({ error: "Provide id and content" }) };
            const r = await hnFetch("/api/skills/create", { method: "POST", body: { id: args.id, name: args.id, content: args.content }, budget: SLOW_BUDGET });
            return { output: JSON.stringify(summarize(r, "skill create"), null, 2) };
          }
          return { output: JSON.stringify({ error: "action must be list|search|read|create" }) };
        },
      }),

      hypernexus_repomap: tool({
        description: "Generate a repository map with file/symbol summaries to orient in a codebase quickly.",
        args: {
          dir: z.string().optional().describe("Directory to map (default workspace root)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: "Repo map" }); } catch { /* ignore */ }
          const r = await hnFetch("/api/agent/tool", { method: "POST", body: { name: "repomap", args: { dir: args.dir || "" } }, budget: SLOW_BUDGET });
          if (r.ok && r.data) {
            const c = r.data.data?.content;
            const text = Array.isArray(c) ? c.map((x) => x.text || "").join("\n") : JSON.stringify(r.data);
            return { output: text.slice(0, 4000) || "(empty map)" };
          }
          return { output: JSON.stringify(summarize(r, "repomap"), null, 2) };
        },
      }),

      hypernexus_knowledge_graph: tool({
        description: "Add entities, relations, or observations to the HyperNexus knowledge graph, or search it.",
        args: {
          action: z.enum(["add_entities", "add_relations", "add_observations", "search"]).describe("Action"),
          entities: z.array(z.any()).optional().describe("Entities [{name,type,observations}]"),
          relations: z.array(z.any()).optional().describe("Relations [{from,to,type}]"),
          query: z.string().optional().describe("Search query"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `KG ${args.action}` }); } catch { /* ignore */ }
          if (args.action === "search") {
            const r = await hnFetch(`/api/memory/search?q=${encodeURIComponent(args.query || "")}`, { budget: SLOW_BUDGET });
            return { output: JSON.stringify(summarize(r, "kg search"), null, 2) };
          }
          const r = await hnFetch("/api/knowledge/graph", { method: "POST", body: { action: args.action, entities: args.entities || [], relations: args.relations || [] }, budget: SLOW_BUDGET });
          return { output: JSON.stringify(summarize(r, "knowledge graph"), null, 2) };
        },
      }),

      hypernexus_session_context: tool({
        description: "Get or set the session goal/objective used by HyperNexus for context harvesting and handoff.",
        args: {
          action: z.enum(["get", "set"]).describe("Action"),
          goal: z.string().optional().describe("Goal text (for set)"),
          objective: z.string().optional().describe("Objective text (for set)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Session context ${args.action}` }); } catch { /* ignore */ }
          if (args.action === "get") {
            const r = await hnFetch("/api/sessions/context", { budget: FAST_BUDGET });
            return { output: JSON.stringify(summarize(r, "session context"), null, 2) };
          }
          const r = await hnFetch("/api/memory/context/save", { method: "POST", body: { goal: args.goal || "", objective: args.objective || "" }, budget: SLOW_BUDGET });
          return { output: JSON.stringify(summarize(r, "session context save"), null, 2) };
        },
      }),

      hypernexus_workflow: tool({
        description: "List or run HyperNexus engineering workflows.",
        args: {
          action: z.enum(["list", "run"]).describe("Action"),
          name: z.string().optional().describe("Workflow name (for run)"),
          args: z.record(z.string(), z.any()).optional().describe("Workflow arguments"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Workflow ${args.action}` }); } catch { /* ignore */ }
          if (args.action === "list") {
            const r = await hnFetch("/api/workflows", { budget: FAST_BUDGET });
            return { output: JSON.stringify(summarize(r, "workflow list"), null, 2) };
          }
          if (args.action === "run" && args.name) {
            const r = await hnFetch("/api/workflows/run", { method: "POST", body: { name: args.name, args: args.args || {} }, budget: SLOW_BUDGET });
            return { output: JSON.stringify(summarize(r, "workflow run"), null, 2) };
          }
          return { output: JSON.stringify({ error: "Provide action=list or action=run with name" }) };
        },
      }),
    },

    // 2. CONVERSATION MONITOR — non-blocking tool suggestions on each message.
    //    Fires the predictor in the background (never awaits a slow kernel on the turn),
    //    caching results for the hypernexus_suggest_tools / _search_tools tools.
    "chat.message": async (input, output) => {
      try {
        const text =
          (output && output.message && (output.message.content || (output.message.parts || []).map((p) => p.text).join(" "))) || "";
        if (text && text.trim().length > 4) {
          // Fire-and-forget: budgeted, cached, never throws, never blocks the turn.
          hnFetch("/api/mcp/tool-suggestions", {
            method: "POST",
            body: { query: String(text).slice(0, 500) },
            budget: HOOK_BUDGET,
          }).then((res) => {
            // Cache suggestions for system.transform injection (proactive tool hints).
            if (res && res.ok && res.data) {
              const items = Array.isArray(res.data) ? res.data
                : Array.isArray(res.data.suggestions) ? res.data.suggestions
                : Array.isArray(res.data.tools) ? res.data.tools : [];
              if (items.length > 0) {
                lastSuggestions = { query: String(text).slice(0, 500), tools: items.slice(0, 8), at: Date.now() };
              }
            }
          }).catch(() => {});
          // Also warm retrieval-augmented L2 memory (background, throttled).
          warmMemories(String(text));
        }
      } catch {
        /* monitor must never break the turn */
      }
    },

    // 3. SYSTEM CONTEXT — always inject a HyperNexus status note (cached) so the model
    //    knows the catalog/memory tools exist. The kernel probe is throttled to once
    //    per SYS_TTL; the note itself is served from cache every turn (cheap, deterministic).
    "experimental.chat.system.transform": async (input, output) => {
      try {
        const now = Date.now();
        if (now - sysCache.at > SYS_TTL) {
          const r = await hnFetch("/health", { budget: HOOK_BUDGET });
          const ok = !!(r && r.ok);
          const ver = r && r.data && r.data.version ? r.data.version : "unknown";
          sysCache.note =
            `HyperNexus kernel: ${ok ? `online (v${ver})` : "unavailable"}. ` +
            (ok
              ? "Typed tools: hypernexus_search_tools (50K+ catalog), hypernexus_suggest_tools, hypernexus_memory_search/store/update/delete/list, hypernexus_add_fact, hypernexus_memory_vector_search, hypernexus_context_harvest, hypernexus_session_search/list, hypernexus_code_search, hypernexus_kernel_routes, hypernexus_mcp_call/status/servers/tools, hypernexus_subagent, hypernexus_billing_status. Prefer hypernexus_search_tools to discover integrations."
              : "Memory/catalog tools will degrade gracefully.");
          sysCache.at = now;
        }
        if (sysCache.note) output.system.push(sysCache.note);
        // Proactive tool suggestions from the conversation monitor (feed the model up front).
        try {
          if (lastSuggestions.tools.length && Date.now() - lastSuggestions.at < SUG_TTL) {
            const sLines = lastSuggestions.tools
              .map((s) => {
                const name = (s && (s.name || s.tool || s.id)) || "tool";
                const why = String((s && (s.reason || s.description || s.summary || s.why)) || "").slice(0, 120);
                return why ? `- ${name}: ${why}` : `- ${name}`;
              })
              .join("\n");
            if (sLines) {
              output.system.push(
                `Relevant tools for this conversation (prefer these over guessing):\n${sLines}\n` +
                  `Use hypernexus_search_tools for more options or hypernexus_suggest_tools for fresh suggestions.`
              );
            }
          }
        } catch {
          /* ignore */
        }
        // Retrieval-augmented L2 memory: inject cached cross-session context (if fresh).
        try {
          if (lastMemories.items.length && Date.now() - lastMemories.at < 120_000) {
            const lines = lastMemories.items
              .map((m) => {
                const title = (m && (m.title || m.name)) || "memory";
                const content = String((m && (m.content || m.text || m.snippet || "")) || "").slice(0, 220);
                return `- ${title}: ${content}`;
              })
              .join("\n");
            if (lines) {
              output.system.push(
                `Relevant HyperNexus L2 memory (cross-session, use if helpful):\n${lines}\n` +
                  `For more, call hypernexus_memory_search. Store new durable facts with hypernexus_memory_store.`
              );
            }
          }
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
    },

    // 3b. MESSAGE OBSERVER — observe the message stream without mutating it.
    //     Safe by design: only reads, never writes to output.messages / output.parts.
    //     Feeds the per-step trajectory advertiser and logs a lightweight breadcrumb.
    "experimental.chat.messages.transform": async (input, output) => {
      try {
        const msgs = (output && output.messages) || [];
        const parts = (output && output.parts) || [];
        // Feed the last user text to the tool-suggestion monitor (PRIMARY design).
        // chat.message already fires this — only fire here when chat.message was
        // missed (e.g. replayed context) to avoid duplicate POSTs.
        const lastUser = [...msgs].reverse().find((m) => m && m.role === "user");
        const userText = lastUser
          ? typeof lastUser.content === "string"
            ? lastUser.content
            : JSON.stringify(lastUser.content || "").slice(0, 500)
          : "";
        if (userText.length > 10 && (!lastSuggestions.query || lastSuggestions.query !== userText.slice(0, 500))) {
          hnFetch("/api/mcp/tool-suggestions", {
            method: "POST",
            body: { query: userText.slice(0, 400) },
            budget: HOOK_BUDGET,
          }).then((res) => {
            if (res && res.ok && res.data) {
              const items = Array.isArray(res.data) ? res.data
                : Array.isArray(res.data.suggestions) ? res.data.suggestions
                : Array.isArray(res.data.tools) ? res.data.tools : [];
              if (items.length > 0) {
                lastSuggestions = { query: userText.slice(0, 500), tools: items.slice(0, 8), at: Date.now() };
              }
            }
          }).catch(() => {});
        }
        // Breadcrumb to kv (if available via context) — count only, no mutation.
        if (msgs.length || parts.length) {
          // Fire-and-forget observability log (never throws).
          console.error(
            `[hypernexus] messages.transform observed: ${msgs.length} msgs, ${parts.length} parts`
          );
        }
      } catch {
        /* never throw from a transform hook */
      }
    },

    // 4a. TOOL INTENT — observe tool calls before they run (batched telemetry).
    "tool.execute.before": async (input) => {
      try {
        queueTelemetry({ title: `tool-intent:${input.tool}`, content: `session=${input.sessionID} call=${input.callID} tool=${input.tool} (pre)` });
      } catch { /* ignore */ }
    },

    // 4. TOOL OBSERVATION — record tool calls as a signal for the monitor (batched).
    "tool.execute.after": async (input) => {
      try {
        queueTelemetry({ title: `tool-call:${input.tool}`, content: `session=${input.sessionID} call=${input.callID} tool=${input.tool}` });
      } catch { /* ignore */ }
    },

    // 5. PERMISSION HINTS — auto-allow read-only HyperNexus tools; leave the rest to policy.
    "permission.ask": async (input, output) => {
      try {
        const name = String((input && (input.tool || input.toolName)) || "");
        if (/^hypernexus_(status|search_tools|suggest_tools|mcp_status|mcp_servers|mcp_tools|memory_search|memory_vector_search|memory_list|memory_stats|context_harvest|skills_search|system_overview|session_search|code_search)$/.test(name)) {
          output.status = "allow";
        }
      } catch {
        /* ignore */
      }
    },

    // 6a. SESSION START — warm the L2 memory cache and note the session boundary so the
    //     first turn has cross-session context available (fire-and-forget).
    "session.pre": async (input) => {
      try {
        warmMemories(input && (input.task_id || input.agentID || "session"));
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: "session-start",
            content: `agent=${input.agentID} session=${input.sessionID}${input.task_id ? ` task=${input.task_id}` : ""}`,
            tags: ["session"],
            namespace: "project",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    },

    // 6. SESSION LIFECYCLE — harvest a compact snapshot at session boundaries.
    "session.post": async (input) => {
      try {
        if (input && input.outcome === "completed" && input.finalText) {
          hnFetch("/api/memory/facts/add", {
            method: "POST",
            body: {
              title: "session-summary",
              content: `agent=${input.agentID} outcome=${input.outcome}: ${String(input.finalText).slice(0, 800)}`,
              tags: ["session", input.outcome],
              namespace: "project",
            },
            budget: HOOK_BUDGET,
          }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
    },

    // 7. ACTOR LIFECYCLE — log subagent start/stop to the kernel for orchestration visibility.
    "actor.postStop": async (input) => {
      try {
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: `actor:${input.agentType}`,
            content: `actor ${input.actorID} (${input.agentType}/${input.mode}) outcome=${input.outcome}${input.task ? ` task=${String(input.task).slice(0, 200)}` : ""}`,
            tags: ["actor", input.outcome],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    },

    // 9. PER-STEP QUERY FEED — the PRIMARY conversation-monitor input. Each LLM step's
    //    query feeds the tool-suggestions advertiser + warms L2 memory (fire-and-forget).
    "session.userQuery.pre": async (input) => {
      try {
        const q = input && input.query ? String(input.query) : "";
        if (q.length > 4) {
          hnFetch("/api/mcp/tool-suggestions", {
            method: "POST",
            body: { query: q.slice(0, 500) },
            budget: HOOK_BUDGET,
          }).catch(() => {});
          warmMemories(q);
        }
      } catch { /* ignore */ }
    },

    // 10. PER-STEP OBSERVABILITY — batched telemetry after each LLM step.
    "session.userQuery.post": async (input) => {
      try {
        const q = input && input.query ? String(input.query).slice(0, 200) : "";
        const fin = input && input.finish ? input.finish : "";
        queueTelemetry({ title: "llm-step", content: `session=${input.sessionID} step=${input.step} finish=${fin} q=${q}` });
      } catch { /* ignore */ }
    },

    // 11. LLM REQUEST OBSERVABILITY — batched provider/model usage per request.
    "session.llm.request": async (input) => {
      try {
        queueTelemetry({ title: "llm-request", content: `session=${input.sessionID} model=${input.providerID}/${input.modelID} trajectory=${(input.trajectory || []).length} msgs` });
      } catch { /* ignore */ }
    },

    // 12. TOOL DEFINITION ENRICHMENT — append a short progressive-routing hint so the
    //     model knows the HyperNexus catalog exists when it sees a tool it might extend.
    "tool.definition": async (input, output) => {
      try {
        if (!output || !output.description) return;
        // Only enrich non-HyperNexus tools (ours already advertise the catalog).
        if (String(input.toolID || "").startsWith("hypernexus_")) return;
        if (output.description.includes("hypernexus_search_tools")) return;
        output.description = String(output.description).slice(0, 4000) +
          "\n\n(Relevant integrations/MCP tools may exist beyond this list — use hypernexus_search_tools to discover them from the 50K+ HyperNexus catalog.)";
      } catch { /* ignore */ }
    },

    // 13. SHELL ENVIRONMENT — inject HyperNexus connection hints into every shell call.
    "shell.env": async (input, output) => {
      try {
        if (output && output.env) {
          output.env.HYPERNEXUS_URL = BASE;
          if (input && input.sessionID) output.env.HYPERNEXUS_SESSION = input.sessionID;
        }
      } catch { /* ignore */ }
    },

    // 14. CHAT PARAMS — batched telemetry only (never overrides model params).
    "chat.params": async (input, output) => {
      try {
        queueTelemetry({ title: "chat-params", content: `session=${input.sessionID} model=${input.model && input.model.id} temp=${output && output.temperature}` });
      } catch { /* ignore */ }
    },

    // 15. CHAT HEADERS — attach HyperNexus correlation headers (harmless if unused).
    "chat.headers": async (input, output) => {
      try {
        if (output && output.headers) {
          output.headers["X-HyperNexus-Session"] = String(input.sessionID || "");
          output.headers["X-HyperNexus-Kernel"] = BASE;
        }
      } catch { /* ignore */ }
    },

    // 16. COMMAND TELEMETRY — batched slash-command usage.
    "command.execute.before": async (input) => {
      try {
        queueTelemetry({ title: "command", content: `session=${input.sessionID} cmd=${input.command} args=${String(input.arguments || "").slice(0, 120)}` });
      } catch { /* ignore */ }
    },

    // 17. EVENT BUS — throttled event telemetry (sampled to avoid flooding).
    event: async (input) => {
      try {
        const e = input && input.event;
        if (!e || !e.type) return;
        if (Math.random() > 0.1) return; // sample 10% of events (cold path, not context injection)
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: "event",
            content: `type=${e.type}`,
            tags: ["event", e.type],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
      } catch { /* ignore */ }
    },

    // 18. ACTOR PRE-DELIVERY — observe before finalText is delivered (never set
    //     continue=true; that would loop). Complements actor.postStop.
    "actor.preStop": async (input) => {
      try {
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: `actor-pre:${input.agentType}`,
            content: `actor ${input.actorID} (${input.agentType}/${input.mode}) iter=${input.iteration}${input.task ? ` task=${String(input.task).slice(0, 160)}` : ""}`,
            tags: ["actor", "pre"],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
      } catch { /* ignore */ }
    },

    // 19. COMPACTION CONTEXT — inject HyperNexus memory availability into the
    //     compaction prompt so condensed summaries retain cross-session pointers.
    "experimental.session.compacting": async (input, output) => {
      try {
        if (output && Array.isArray(output.context)) {
          output.context.push(
            "HyperNexus L2 memory vault holds cross-session project knowledge. " +
              "Preserve any hypernexus_memory_store facts, key file paths, and decisions in the summary. " +
              "Call hypernexus_memory_search to recover dropped details later."
          );
        }
      } catch { /* ignore */ }
    },

    // 20. AUTO-CONTINUE POLICY — leave the synthetic continue turn enabled (observe).
    "experimental.compaction.autocontinue": async (input, output) => {
      try {
        if (output && typeof output.enabled === "boolean") {
          // keep default true; only disable when kernel is explicitly in maintenance
          if (Date.now() - sysCache.at < SYS_TTL && sysCache.note && sysCache.note.includes("unavailable")) {
            output.enabled = true; // still allow continue; memory degrades gracefully
          }
        }
      } catch { /* ignore */ }
    },

    // 21. TEXT COMPLETE OBSERVABILITY — batched signal after completions.
    "experimental.text.complete": async (input) => {
      try {
        queueTelemetry({ title: "text-complete", content: `session=${input.sessionID} message=${input.messageID}` });
      } catch { /* ignore */ }
    },

    // 22. AUTH — HyperNexus API-key auth provider (validates against kernel api-keys).
    auth: {
      provider: "hypernexus",
      methods: [
        {
          type: "api",
          label: "HyperNexus API Key",
          prompts: [
            {
              type: "text",
              key: "apiKey",
              message: "HyperNexus API key (from the dashboard or /api/api-keys/create)",
              placeholder: "hn_...",
            },
          ],
          async authorize(inputs) {
            try {
              const key = (inputs && inputs.apiKey) || "";
              if (!key) return { type: "failed" };
              const r = await hnFetch("/api/api-keys/validate", {
                method: "POST",
                body: { key },
                budget: FAST_BUDGET,
              });
              if (r && r.ok && r.data && r.data.success !== false) {
                return { type: "success", key, provider: "hypernexus" };
              }
              return { type: "failed" };
            } catch {
              return { type: "failed" };
            }
          },
        },
      ],
    },

    // 23. PROVIDER — expose HyperNexus-routed models as a selectable provider.
    //     Degrades to zero models when the kernel is unavailable (never breaks the picker).
    provider: {
      id: "hypernexus",
      models: async () => {
        try {
          const r = await hnFetch("/api/providers/catalog", { budget: FAST_BUDGET });
          const entries = (r && r.ok && r.data && r.data.data) || [];
          const out = {};
          if (Array.isArray(entries)) {
            for (const e of entries.slice(0, 32)) {
              const id = String((e && (e.id || e.model || e.name)) || "").trim();
              if (!id) continue;
              out[id] = {
                id,
                name: String((e && (e.name || e.label)) || id),
                attachment: !!(e && e.attachment),
                reasoning: !!(e && e.reasoning),
                temperature: e && e.temperature !== undefined ? e.temperature : true,
                tool_call: !!(e && (e.tool_call || e.tools)),
                limit: {
                  context: Number((e && (e.context || e.context_length)) || 128000),
                  output: Number((e && (e.output || e.max_output)) || 8192),
                },
              };
            }
          }
          return out;
        } catch {
          return {};
        }
      },
    },

    // 8. CONFIG — surface the plugin's effective settings on load (visible in --print-logs).
    config: async (cfg) => {
      try {
        if (cfg && cfg.plugin && !cfg.plugin.some?.((p) => (Array.isArray(p) ? p[0] : p)?.includes?.("hypernexus"))) {
          // ensure we are present; install normally handles this, this is a safety net
        }
        console.error(`[hypernexus] server plugin active. kernel=${BASE}`);
      } catch {
        /* ignore */
      }
    },
  };
};

export default server;
