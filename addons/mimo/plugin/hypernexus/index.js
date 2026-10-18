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

  return {
    // 1. TYPED TOOLS — first-class MiMoCode tools calling the HyperNexus kernel.
    tool: {
      hypernexus_status: tool({
        description: "HyperNexus kernel health, version, uptime, and MCP bridge status. Use to confirm the kernel is reachable before memory or catalog calls.",
        args: {},
        async execute() {
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
        async execute(args) {
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
        async execute() {
          const r = await hnFetch("/api/mcp/status", { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "mcp status"), null, 2) };
        },
      }),

      hypernexus_mcp_servers: tool({
        description: "List MCP servers registered with the HyperNexus kernel and their connection state.",
        args: {},
        async execute() {
          const r = await hnFetch("/api/mcp/servers", { budget: FAST_BUDGET });
          return { output: JSON.stringify(summarize(r, "mcp servers"), null, 2) };
        },
      }),

      hypernexus_mcp_tools: tool({
        description: "List the tools exposed by connected MCP servers via HyperNexus (live tool inventory).",
        args: {
          limit: z.number().int().min(1).max(50).optional().describe("Cap the returned tools (default 20)"),
        },
        async execute(args) {
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
        async execute(args) {
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
        async execute(args) {
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
        async execute(args) {
          const content = `${args.summary}${args.keyFiles && args.keyFiles.length ? `\nKey files: ${args.keyFiles.join(", ")}` : ""}`;
          const r = await hnFetch("/api/memory/facts/add", {
            method: "POST",
            body: { title: "context-harvest", content, tags: ["context-harvest"], namespace: "project" },
            budget: SLOW_BUDGET,
          });
          return { output: JSON.stringify(summarize(r, "context harvest"), null, 2) };
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
    //    knows the catalog/memory tools exist. Cheap and cached; never blocks long.
    "experimental.chat.system.transform": async (input, output) => {
      try {
        if (Date.now() - boot > 6000 && Math.random() > 0.25) return; // throttle after boot
        const r = await hnFetch("/health", { budget: HOOK_BUDGET });
        const ok = !!(r && r.ok);
        const ver = r && r.data && r.data.version ? r.data.version : "unknown";
        output.system.push(
          `HyperNexus kernel: ${ok ? `online (v${ver})` : "unavailable"}. ` +
            (ok
              ? "Typed tools available: hypernexus_search_tools (progressive catalog routing over 50K+ MCP tools), hypernexus_suggest_tools (LLM tool suggestions), hypernexus_memory_search/store, hypernexus_mcp_* . Prefer hypernexus_search_tools to discover integrations rather than guessing."
              : "Memory/catalog tools will degrade gracefully.")
        );
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
