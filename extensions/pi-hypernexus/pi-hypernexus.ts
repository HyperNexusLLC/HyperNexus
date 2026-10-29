import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// ─── HyperNexus pi companion extension (extensions/pi-hypernexus) ───────────
// Complements addons/pi/hypernexus.ts (the full bridge). This package is the
// installable companion: MCP stdio registration, hook observation logging to
// POST /api/memory/facts/add, slash commands, skills (via resources_discover),
// CLI flags, a keyboard shortcut, and status-bar presence.
//
// Kernel baseline: Go kernel http://127.0.0.1:7778 (port 7778 authoritative).
// Model: Meta muse-spark-1.3-contributor, wired by env-var reference only —
// this file never reads auth.json, token files, or secret env VALUES.
// Activate with: pi --provider meta --model meta/muse-spark-1.3-contributor
// (already the workspace default in ~/.pi/agent/settings.json).

const HN_BASE = "http://127.0.0.1:7778";
const HN_ROOT = "C:/Users/hyper/workspace/HyperNexus";
const HN_MCP_CMD = `${HN_ROOT}/bin/hypernexus.exe`;

const TN_TIMEOUT_MS = 2500;
const TN_FAST_TIMEOUT_MS = 400;

function hnFetchWithTimeout(path: string, timeoutMs: number, init?: RequestInit, signal?: AbortSignal) {
  let s: AbortSignal | undefined;
  try {
    const t = AbortSignal.timeout(timeoutMs);
    s = signal ? AbortSignal.any([signal, t]) : t;
  } catch {
    s = signal;
  }
  return fetch(`${HN_BASE}${path}`, { ...init, signal: s });
}

async function hnFetch(path: string, init?: RequestInit, signal?: AbortSignal): Promise<Response> {
  try {
    return await hnFetchWithTimeout(path, TN_TIMEOUT_MS, init, signal);
  } catch {
    return { ok: false, status: 0, json: async () => ({}), text: async () => "" } as unknown as Response;
  }
}

async function hnOk(path: string, init?: RequestInit, signal?: AbortSignal): Promise<boolean> {
  try {
    const r = await hnFetch(path, init, signal);
    return r.ok;
  } catch {
    return false;
  }
}

async function hnJson(path: string, init?: RequestInit, signal?: AbortSignal): Promise<any> {
  try {
    const r = await hnFetch(path, init, signal);
    if (!r.ok) return {};
    const d = await r.json();
    return d.data ?? d;
  } catch {
    return {};
  }
}

async function hnFastJson(path: string, signal?: AbortSignal): Promise<any | null> {
  try {
    const r = await hnFetchWithTimeout(path, TN_FAST_TIMEOUT_MS, {}, signal);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function hnFastSearch(query: string, limit = 3, signal?: AbortSignal): Promise<any[]> {
  const q = (query || "").trim();
  if (!q) return [];
  const safe = q.replace(/[^a-zA-Z0-9\s_-]/g, " ").trim().slice(0, 80);
  if (!safe) return [];
  const body = await hnFastJson(
    `/api/memory/fts-search?q=${encodeURIComponent(safe)}&limit=${Math.max(1, Math.min(10, limit))}`,
    signal,
  );
  const data = body?.data ?? body ?? [];
  if (!Array.isArray(data)) return [];
  return data
    .map((d: any) => {
      const rec = d?.record ?? d;
      return { content: rec?.content ?? rec?.text ?? "", tags: rec?.tags ?? [], category: rec?.category ?? "" };
    })
    .filter((m: any) => m.content && typeof m.content === "string");
}

function now() {
  return new Date().toISOString();
}

// ─── Observation logging ────────────────────────────────────────────────────
// Every hook below records a hook observation via POST /api/memory/facts/add
// with a tags array. Fire-and-forget: logging must never stall or crash a turn.
function hnObserve(kind: string, text: string, tags: string[]): void {
  const content = `[pi-hook:${kind}] ${text}`.slice(0, 2000);
  hnOk("/api/memory/facts/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, tags: ["pi-hook", `hook:${kind}`, ...tags], type: "observation" }),
  }).catch(() => {});
}

function safeUi(ctx: any): any | null {
  try {
    return ctx?.hasUI ? (ctx.ui ?? null) : null;
  } catch {
    return null;
  }
}

export default function (pi: ExtensionAPI) {
  // ─── MCP stdio registration ─────────────────────────────────────────────
  // stdio transport: `<root>/bin/hypernexus.exe mcp` with workspace + URL env.
  pi.registerMcpServer("hypernexus", {
    command: HN_MCP_CMD,
    args: ["mcp"],
    env: {
      HYPERNEXUS_WORKSPACE_ROOT: HN_ROOT,
      HYPERNEXUS_URL: HN_BASE,
    },
    description:
      "HyperNexus control plane (Go kernel on :7778): persistent L2/L3 memory, MCP tool routing, agent dispatch, sessions, skills, system + billing status.",
  });

  // ─── Skills (via resources_discover) ─────────────────────────────────────
  // Pi loads skills from skillPaths; each dir holds a SKILL.md. Covers:
  // memory, L2, MCP routing, agent dispatch, status/billing, sessions, ops, workflows.
  pi.on("resources_discover", async (_event) => {
    const base = `${HN_ROOT}/extensions/pi-hypernexus/skills`;
    return {
      skillPaths: [
        `${base}/hypernexus-memory`,
        `${base}/hypernexus-l2`,
        `${base}/hypernexus-mcp-routing`,
        `${base}/hypernexus-agents`,
        `${base}/hypernexus-status-billing`,
        `${base}/hypernexus-sessions`,
        `${base}/hypernexus-ops`,
        `${base}/hypernexus-workflows`,
      ],
    };
  });

  // ─── CLI flags ───────────────────────────────────────────────────────────
  pi.registerFlag("hn-base", { description: "HyperNexus kernel base URL", type: "string", default: HN_BASE });
  pi.registerFlag("hn-verbose", { description: "Enable verbose HyperNexus hook logging", type: "boolean", default: false });

  // ─── Session lifecycle hooks ─────────────────────────────────────────────
  pi.on("session_start", async (event, ctx) => {
    const ui = safeUi(ctx);
    try {
      const r = await hnFetchWithTimeout("/health", 600);
      if (r.ok) {
        const h: any = await r.json().catch(() => ({}));
        ui?.setStatus?.("hn", `HyperNexus v${h.version ?? "?"}`);
      } else {
        ui?.setStatus?.("hn", "HyperNexus degraded");
      }
    } catch {
      ui?.setStatus?.("hn", "HyperNexus offline");
    }
    hnObserve("session_start", `reason=${event.reason}`, ["session"]);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    try {
      ctx.ui.setStatus("hn", "");
    } catch {
      /* headless */
    }
    hnObserve("session_shutdown", "pi session ended", ["session"]);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (event.messageType !== "user") return;
    const memories = await hnFastSearch(event.prompt.slice(0, 100), 3, ctx.signal);
    if (memories.length > 0) {
      hnObserve(
        "before_agent_start",
        `injected ${memories.length} L2 context(s) for prompt: ${event.prompt.slice(0, 120)}`,
        ["recall", "context"],
      );
    } else {
      hnObserve("before_agent_start", `no L2 context for prompt: ${event.prompt.slice(0, 120)}`, ["recall"]);
    }
  });

  pi.on("context", async (event, ctx) => {
    const lastUser = [...event.messages].reverse().find((m: any) => m.role === "user");
    const userText =
      typeof lastUser?.content === "string"
        ? lastUser.content
        : Array.isArray(lastUser?.content)
          ? lastUser.content.map((c: any) => c.text ?? "").join(" ")
          : "";
    if (!userText || userText.length < 8) return;
    const memories = await hnFastSearch(userText.slice(0, 100), 2, ctx.signal);
    if (memories.length > 0) {
      hnObserve("context", `injected ${memories.length} L2 context(s) pre-LLM`, ["recall", "context"]);
    }
  });

  // ─── Tool + bash + model hooks ───────────────────────────────────────────
  pi.on("tool_call", async (event, ctx) => {
    const dangerous = ["rm -rf", "sudo ", "chmod -R 777", "DROP TABLE", "mkfs", ":(){:|:&};:"];
    const inputStr = JSON.stringify(event.input ?? {}).toLowerCase();
    if (dangerous.some((p) => inputStr.includes(p.toLowerCase()))) {
      hnObserve("tool_call:blocked", `blocked dangerous ${event.toolName}: ${inputStr.slice(0, 200)}`, ["guard"]);
      return { block: true, reason: "Blocked by HyperNexus guard: dangerous pattern detected." } as any;
    }
    hnObserve("tool_call", `record ${event.toolName} ${JSON.stringify(event.input ?? {}).slice(0, 300)}`, [
      "record",
      `tool:${(event as any).toolName ?? "unknown"}`,
    ]);
    void ctx;
  });

  pi.on("tool_result", async (event, _ctx) => {
    const name = (event as any).toolName ?? "tool";
    if (!["bash", "read", "grep", "hn_mcp_call"].includes(name)) return;
    const text = (event as any).content?.map?.((c: any) => c.text).filter(Boolean).join(" ") ?? "";
    if (!text || text.length < 20) return;
    hnObserve("tool_result", `stored ${name} output (${text.length} chars): ${text.slice(0, 300)}`, [
      "record",
      `tool:${name}`,
    ]);
  });

  pi.on("user_bash", async (event, _ctx) => {
    hnObserve("user_bash", `audit: ${(event as any).command ?? ""}`.slice(0, 500), ["audit"]);
  });

  pi.on("model_select", async (event, _ctx) => {
    hnObserve("model_select", `model=${(event as any).model?.id ?? "unknown"}`, ["model"]);
  });

  pi.on("input", async (event, ctx) => {
    const text = (event as any).text ?? "";
    const matches = text.match(/@memory:([a-zA-Z0-9_-]+)/g);
    if (!matches) return;
    let expanded = text;
    for (const match of matches) {
      const key = match.replace("@memory:", "");
      const memories = await hnFastSearch(key, 3, ctx.signal);
      const context = memories
        .map((m: any) => String(m.content ?? "").slice(0, 150))
        .filter(Boolean)
        .join("\n");
      if (context) expanded = expanded.replace(match, `\n[HN Memory ${key}]: ${context}\n`);
    }
    if (expanded !== text) {
      hnObserve("input", `expanded @memory tokens: ${matches.join(",")}`, ["recall"]);
      return { text: expanded } as any;
    }
  });

  pi.on("turn_end", async (event, _ctx) => {
    const results = (event as any).toolResults ?? [];
    if (results.length === 0) return;
    const summary = (event as any).message?.content
      ?.filter((c: any) => c.type === "text")
      ?.map((c: any) => c.text)
      ?.join(" ")
      ?.slice(0, 500);
    if (!summary || summary.length < 50) return;
    hnObserve("turn_end", `turn ${(event as any).turnIndex}: ${summary.slice(0, 200)}`, ["session"]);
  });

  pi.on("session_before_compact", async (event, _ctx) => {
    const n = (event as any).branchEntries?.length ?? 0;
    hnObserve("session_before_compact", `compacting ${n} entries reason=${(event as any).reason}`, ["session"]);
  });

  pi.on("session_compact", async (_event, _ctx) => {
    hnObserve("session_compact", "compaction succeeded", ["session"]);
  });

  // ─── Tools ───────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "hn_memory_store",
    label: "HN Memory Store",
    description: "Store a fact/decision to HyperNexus L2 memory (POST /api/memory/facts/add).",
    promptSnippet: "Store a fact to HyperNexus L2",
    parameters: Type.Object({
      content: Type.String({ description: "Fact content" }),
      tags: Type.Optional(Type.Array(Type.String(), { description: "Tag array" })),
    }),
    annotations: { readOnlyHint: false, idempotentHint: false },
    async execute(_id, params, signal) {
      const ok = await hnOk(
        "/api/memory/facts/add",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: params.content, tags: params.tags ?? ["pi"], type: "fact" }),
        },
        signal,
      );
      return { content: [{ type: "text", text: ok ? "Stored to L2." : "Store failed (kernel offline?)." }] };
    },
  });

  pi.registerTool({
    name: "hn_memory_search",
    label: "HN Memory Search",
    description: "Recall HyperNexus L2 memory (fast FTS; falls back to vector search).",
    promptSnippet: "Recall HyperNexus memory",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      limit: Type.Optional(Type.Number({ description: "Max results (default 5)" })),
    }),
    annotations: { readOnlyHint: true },
    async execute(_id, params, signal) {
      const fast = await hnFastSearch(params.query, params.limit ?? 5, signal);
      if (fast.length > 0) {
        return {
          content: [
            { type: "text", text: fast.map((m: any, i: number) => `${i + 1}. ${m.content.slice(0, 300)}`).join("\n\n") },
          ],
        };
      }
      const body = await hnJson(`/api/memory/search?q=${encodeURIComponent(params.query)}&limit=${params.limit ?? 5}`, {}, signal);
      const items = Array.isArray(body) ? body : (body.data ?? []);
      const lines = (Array.isArray(items) ? items : []).map(
        (m: any, i: number) => `${i + 1}. ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 300)}`,
      );
      return { content: [{ type: "text", text: lines.length > 0 ? lines.join("\n\n") : "No memories found." }] };
    },
  });

  pi.registerTool({
    name: "hn_mcp_call",
    label: "HN MCP Call",
    description: "Route one tool call through the HyperNexus kernel universal tool endpoint (MCP routing).",
    promptSnippet: "Route a tool via HyperNexus",
    parameters: Type.Object({
      tool: Type.String({ description: "Tool name, e.g. mcp__docs__read" }),
      args: Type.Optional(Type.Any({ description: "Tool arguments object" })),
    }),
    annotations: { readOnlyHint: false, openWorldHint: true },
    async execute(_id, params, signal) {
      const body = await hnJson(
        "/api/agent/tool",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: params.tool, args: params.args ?? {} }),
        },
        signal,
      );
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 4000) }] };
    },
  });

  pi.registerTool({
    name: "hn_system_status",
    label: "HN System Status",
    description: "Kernel health, memory counts, and mesh status in one call.",
    promptSnippet: "HyperNexus system status",
    parameters: Type.Object({}),
    annotations: { readOnlyHint: true },
    async execute(_id, _params, signal) {
      const [health, mem, mesh] = await Promise.all([
        hnFetchWithTimeout("/health", TN_TIMEOUT_MS, {}, signal)
          .then((r: any) => (r.ok ? r.json() : {}))
          .catch(() => ({})),
        hnJson("/api/memory/list?limit=1", {}, signal),
        hnJson("/api/mesh/status", {}, signal),
      ]);
      const text = `health=${JSON.stringify(health).slice(0, 200)} memTotal=${(mem as any).total ?? (mem as any).count ?? "?"} peers=${(mesh as any).data?.peersCount ?? (mesh as any).peersCount ?? 0}`;
      return { content: [{ type: "text", text }] };
    },
  });

  pi.registerTool({
    name: "hn_billing_status",
    label: "HN Billing Status",
    description: "Billing/subscription state from the kernel.",
    promptSnippet: "HyperNexus billing status",
    parameters: Type.Object({}),
    annotations: { readOnlyHint: true },
    async execute(_id, _params, signal) {
      const body = await hnJson("/api/billing/status", {}, signal);
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 2000) || "Billing status unavailable." }] };
    },
  });

  pi.registerTool({
    name: "hn_session_list",
    label: "HN Session List",
    description: "List recent HyperNexus sessions for recall or handoff.",
    promptSnippet: "List HyperNexus sessions",
    parameters: Type.Object({ limit: Type.Optional(Type.Number({ description: "Max sessions (default 10)" })) }),
    annotations: { readOnlyHint: true },
    async execute(_id, params, signal) {
      const body = await hnJson(`/api/sessions`, {}, signal);
      const items = Array.isArray(body) ? body : (body.sessions ?? body.data ?? []);
      const list = (Array.isArray(items) ? items : []).slice(0, params.limit ?? 10);
      const lines = list.map(
        (s: any, i: number) =>
          `${i + 1}. ${(s.id ?? s.name ?? JSON.stringify(s)).toString().slice(0, 120)} [${s.status ?? s.cliType ?? "?"}]`,
      );
      return { content: [{ type: "text", text: lines.length > 0 ? lines.join("\n") : "No sessions found." }] };
    },
  });

  pi.registerTool({
    name: "hn_agent_dispatch",
    label: "HN Agent Dispatch",
    description:
      "Record a task to L2 for agent tracking, then harvest related context inline via ctx.executeTool (pi executes work inline; this persists intent + context).",
    promptSnippet: "Dispatch/track an agent task",
    parameters: Type.Object({
      task: Type.String({ description: "Task description" }),
      context: Type.Optional(Type.String({ description: "Extra context" })),
    }),
    annotations: { readOnlyHint: false },
    async execute(_id, params, signal, _onUpdate, ctx) {
      const taskId = `pi-task-${Date.now().toString(36)}`;
      await hnOk(
        "/api/memory/facts/add",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `[AGENT TASK] ${taskId}\nTask: ${params.task}\nContext: ${params.context ?? "none"}\nStatus: dispatched`,
            tags: ["agent:dispatch", `task:${taskId}`],
            type: "task",
          }),
        },
        signal,
      );
      let preview = "";
      try {
        const res = await ctx.executeTool("hn_memory_search", { query: params.task, limit: 3 });
        preview = res?.content?.map((c: any) => c.text ?? "").join("\n") ?? "";
      } catch {
        /* harvest optional */
      }
      return {
        content: [{ type: "text", text: `Task ${taskId} recorded.${preview ? `\n\nRelated L2 context:\n${preview.slice(0, 1500)}` : ""}` }],
      };
    },
  });

  pi.registerTool({
    name: "hn_workflow_status",
    label: "HN Workflow Status",
    description: "Show kernel workflow/job status (ops + workflows families).",
    promptSnippet: "HyperNexus workflow status",
    parameters: Type.Object({}),
    annotations: { readOnlyHint: true },
    async execute(_id, _params, signal) {
      const body = await hnJson("/api/workflows", {}, signal);
      const items = Array.isArray(body) ? body : (body.data ?? []);
      const text = (Array.isArray(items) ? items : [])
        .map((w: any) => `- ${(w.id ?? w.name ?? JSON.stringify(w)).toString().slice(0, 160)}`)
        .join("\n")
        .slice(0, 2000);
      return { content: [{ type: "text", text: text || "No workflows registered." }] };
    },
  });

  // ─── Slash commands ──────────────────────────────────────────────────────
  pi.registerCommand("hn-status", {
    description: "Show HyperNexus kernel health + memory counts",
    handler: async (_args, ctx) => {
      const [health, mem] = await Promise.all([
        hnFetchWithTimeout("/health", TN_TIMEOUT_MS).then((r: any) => (r.ok ? r.json() : {})).catch(() => ({})),
        hnJson("/api/memory/list?limit=1"),
      ]);
      ctx.ui.notify(
        `HyperNexus: v${(health as any).version ?? "?"} ok=${(health as any).ok ?? false} | L2 total=${(mem as any).total ?? (mem as any).count ?? "?"}`,
        "info",
      );
    },
  });

  pi.registerCommand("hn-remember", {
    description: "Store args as one L2 fact (POST /api/memory/facts/add)",
    handler: async (args, ctx) => {
      const content = args?.trim() || (await ctx.ui.input("Remember:", ""));
      if (!content) return;
      const ok = await hnOk("/api/memory/facts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags: ["pi", "quick"], type: "fact" }),
      });
      ctx.ui.notify(ok ? "Remembered to L2." : "Store failed.", ok ? "info" : "error");
    },
  });

  pi.registerCommand("hn-recall", {
    description: "Recall L2 memory for a query",
    handler: async (args, ctx) => {
      const query = args?.trim() || (await ctx.ui.input("Recall:", ""));
      if (!query) return;
      const hits = await hnFastSearch(query, 5);
      ctx.ui.notify(
        hits.length > 0
          ? hits.map((m: any, i: number) => `${i + 1}. ${m.content.slice(0, 160)}`).join("\n")
          : "No memories found.",
        hits.length > 0 ? "info" : "warning",
      );
    },
  });

  pi.registerCommand("hn-dispatch", {
    description: "Record an agent task to L2 with context harvest",
    handler: async (args, ctx) => {
      const task = args?.trim() || (await ctx.ui.input("Task:", ""));
      if (!task) return;
      const taskId = `pi-task-${Date.now().toString(36)}`;
      const ok = await hnOk("/api/memory/facts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `[AGENT TASK] ${taskId}\nTask: ${task}`, tags: ["agent:dispatch"], type: "task" }),
      });
      ctx.ui.notify(ok ? `Dispatched ${taskId}.` : "Dispatch failed.", ok ? "info" : "error");
    },
  });

  pi.registerCommand("hn-workflow", {
    description: "Show kernel workflow status",
    handler: async (_args, ctx) => {
      const body = await hnJson("/api/workflows");
      const items = Array.isArray(body) ? body : (body.data ?? []);
      ctx.ui.notify(
        (Array.isArray(items) ? items : []).map((w: any) => `- ${w.id ?? w.name ?? "?"}`).join("\n").slice(0, 1200) ||
          "No workflows.",
        "info",
      );
    },
  });

  // ─── Keyboard shortcut ───────────────────────────────────────────────────
  pi.registerShortcut("ctrl+shift+h", {
    description: "HyperNexus: kernel health check",
    handler: async (ctx) => {
      const r = await hnFetchWithTimeout("/health", TN_TIMEOUT_MS);
      ctx.ui.notify(r.ok ? "HyperNexus kernel reachable (:7778)." : "Kernel unreachable.", r.ok ? "info" : "error");
    },
  });
}
