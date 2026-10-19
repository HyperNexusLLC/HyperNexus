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

// Warm the L2 memory cache in the background. Fire-and-forget: the fetch runs up to
// SLOW_BUDGET off the hot path and the result is picked up by a later system.transform
// (eventual consistency across turns — acceptable per the hot-path-never-blocks rule).
function warmMemories(query) {
  const now = Date.now();
  if (now - lastMemories.at < MEM_TTL) return; // throttled
  if (!query || query.trim().length < 4) return;
  hnFetch(`/api/memory/search?query=${encodeURIComponent(query.slice(0, 200))}&limit=3`, { budget: SLOW_BUDGET })
    .then((r) => {
      const data = r.ok && r.data && r.data.data ? r.data.data : null;
      if (Array.isArray(data) && data.length) {
        lastMemories = { query, items: data.slice(0, 3), at: Date.now() };
      }
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
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Suggest tools: ${String(args.query).slice(0, 40)}` }); } catch { /* ignore */ }
          // Trigger the predictor (POST) then read suggestions (GET), both budgeted.
          await hnFetch("/api/mcp/tool-suggestions", { method: "POST", body: { query: args.query }, budget: HOOK_BUDGET });
          const g = await hnFetch(`/api/mcp/tool-suggestions?query=${encodeURIComponent(args.query)}`, { budget: FAST_BUDGET });
          const data = g.ok && g.data ? g.data.data : null;
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
        description: "Semantic + keyword search over the HyperNexus L2 memory vault (cross-session project knowledge). May be slow on first call (ONNX warmup).",
        args: {
          query: z.string().describe("What to look for in memory"),
          limit: z.number().int().min(1).max(20).optional().describe("Max results (default 5)"),
        },
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Memory search: ${String(args.query).slice(0, 40)}` }); } catch { /* ignore */ }
          const r = await hnFetch(`/api/memory/search?query=${encodeURIComponent(args.query)}&limit=${args.limit || 5}`, { budget: SLOW_BUDGET });
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
        async execute(args, context) {
          try { if (context && context.metadata) context.metadata({ title: `Store memory: ${String(args.title).slice(0, 40)}` }); } catch { /* ignore */ }
          const r = await hnFetch("/api/memory/facts/add", {
            method: "POST",
            body: {
              title: args.title,
              content: args.content,
              tags: args.tags || [],
              namespace: args.namespace || "project",
            },
            budget: SLOW_BUDGET,
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
          const r = await hnFetch("/api/memory/facts/add", {
            method: "POST",
            body: { title: "context-harvest", content, tags: ["context-harvest"], namespace: "project" },
            budget: SLOW_BUDGET,
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
            const r = await hnFetch("/api/agent-memory/pickup", { budget: FAST_BUDGET });
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
          const r = await hnFetch(`/api/skills/search?query=${encodeURIComponent(args.query)}&limit=${limit}`, { budget: FAST_BUDGET });
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
          }).catch(() => {});
          // Also warm retrieval-augmented L2 memory (background, throttled).
          warmMemories(String(text));
        }
      } catch {
        /* monitor must never break the turn */
      }
    },

    // 3. SYSTEM CONTEXT — inject a short, cached HyperNexus status note so the model
    //    knows the catalog/memory tools exist. Served from cache every turn
    //    (deterministic); the health probe refreshes at most per SYS_TTL.
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
              ? "Typed tools available: hypernexus_search_tools (progressive catalog routing over 50K+ MCP tools), hypernexus_suggest_tools (LLM tool suggestions), hypernexus_memory_search/store, hypernexus_mcp_* . Prefer hypernexus_search_tools to discover integrations rather than guessing."
              : "Memory/catalog tools will degrade gracefully.");
          sysCache.at = now;
        }
        if (sysCache.note) output.system.push(sysCache.note);
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
        // Feed the last user text to the tool-suggestion monitor (PRIMARY design: LLM
        // conversation monitor). Non-blocking, budgeted, degrades silently.
        const lastUser = [...msgs].reverse().find((m) => m && m.role === "user");
        const userText = lastUser
          ? typeof lastUser.content === "string"
            ? lastUser.content
            : JSON.stringify(lastUser.content || "").slice(0, 500)
          : "";
        if (userText.length > 10) {
          hnFetch("/api/mcp/tool-suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: userText.slice(0, 400) }),
            budget: HOOK_BUDGET,
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

    // 4a. TOOL INTENT — observe tool calls before they run (fire-and-forget, never
    //     mutates args or cancels). Completes the tool lifecycle alongside _after.
    "tool.execute.before": async (input) => {
      try {
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: `tool-intent:${input.tool}`,
            content: `session=${input.sessionID} call=${input.callID} tool=${input.tool} (pre)`,
            tags: ["tool-obs", input.tool],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    },

    // 4. TOOL OBSERVATION — record tool calls (fire-and-forget) as a signal for the monitor.
    "tool.execute.after": async (input) => {
      try {
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: `tool-call:${input.tool}`,
            content: `session=${input.sessionID} call=${input.callID} tool=${input.tool}`,
            tags: ["tool-obs", input.tool],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    },

    // 5. PERMISSION HINTS — auto-allow read-only HyperNexus tools; leave the rest to policy.
    "permission.ask": async (input, output) => {
      try {
        const name = String((input && (input.tool || input.toolName)) || "");
        if (/^hypernexus_(status|search_tools|suggest_tools|mcp_status|mcp_servers|mcp_tools|memory_search|context_harvest)$/.test(name)) {
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

    // 10. PER-STEP OBSERVABILITY — after each LLM step, record a compact signal to the
    //     kernel (never blocks; feed is the trajectory summary).
    "session.userQuery.post": async (input) => {
      try {
        const q = input && input.query ? String(input.query).slice(0, 200) : "";
        const fin = input && input.finish ? input.finish : "";
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: "llm-step",
            content: `session=${input.sessionID} step=${input.step} finish=${fin} q=${q}`,
            tags: ["llm-step", fin || "step"],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
      } catch { /* ignore */ }
    },

    // 11. LLM REQUEST OBSERVABILITY — record provider/model usage per request.
    "session.llm.request": async (input) => {
      try {
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: "llm-request",
            content: `session=${input.sessionID} model=${input.providerID}/${input.modelID} trajectory=${(input.trajectory || []).length} msgs`,
            tags: ["llm-request", input.providerID || "provider"],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
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

    // 14. CHAT PARAMS — observe (never override model params; telemetry only).
    "chat.params": async (input, output) => {
      try {
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: "chat-params",
            content: `session=${input.sessionID} model=${input.model && input.model.id} temp=${output && output.temperature}`,
            tags: ["chat-params"],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
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

    // 16. COMMAND TELEMETRY — record slash-command usage (fire-and-forget).
    "command.execute.before": async (input) => {
      try {
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: "command",
            content: `session=${input.sessionID} cmd=${input.command} args=${String(input.arguments || "").slice(0, 120)}`,
            tags: ["command", input.command],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
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

    // 21. TEXT COMPLETE OBSERVABILITY — fire-and-forget signal after completions.
    "experimental.text.complete": async (input) => {
      try {
        hnFetch("/api/memory/facts/add", {
          method: "POST",
          body: {
            title: "text-complete",
            content: `session=${input.sessionID} message=${input.messageID}`,
            tags: ["text-complete"],
            namespace: "global",
          },
          budget: HOOK_BUDGET,
        }).catch(() => {});
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
