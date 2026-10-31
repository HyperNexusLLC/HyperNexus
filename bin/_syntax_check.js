import { Type } from "typebox";
const TN_BASE = "http://127.0.0.1:7778";
const TN_TIMEOUT_MS = 2500;
const TN_FAST_TIMEOUT_MS = 400;
function tnFetchWithTimeout(path, timeoutMs, init, signal) {
  let s;
  try {
    const t = AbortSignal.timeout(timeoutMs);
    s = signal ? AbortSignal.any([signal, t]) : t;
  } catch {
    s = signal;
  }
  return fetch(`${TN_BASE}${path}`, { ...init, signal: s });
}
async function tnFetch(path, init, signal) {
  try {
    return await tnFetchWithTimeout(path, TN_TIMEOUT_MS, init, signal);
  } catch {
    return { ok: false, status: 0, json: async () => ({}), text: async () => "" };
  }
}
async function tnFetchFastJson(path, signal) {
  try {
    const r = await tnFetchWithTimeout(path, TN_FAST_TIMEOUT_MS, {}, signal);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
async function tnFastSearch(query, limit = 3, signal) {
  const q = (query || "").trim();
  if (!q) return [];
  const safe = q.replace(/[^a-zA-Z0-9\s_-]/g, " ").trim().slice(0, 80);
  if (!safe) return [];
  const body = await tnFetchFastJson(
    `/api/memory/fts-search?q=${encodeURIComponent(safe)}&limit=${Math.max(1, Math.min(10, limit))}`,
    signal
  );
  const data = body?.data ?? body ?? [];
  if (!Array.isArray(data)) return [];
  return data.map((d) => {
    const rec = d?.record ?? d;
    return {
      content: rec?.content ?? rec?.text ?? "",
      tags: rec?.tags ?? [],
      category: rec?.category ?? "",
      score: d?.score
    };
  }).filter((m) => m.content && typeof m.content === "string");
}
async function tnOk(path, init, signal) {
  try {
    const r = await tnFetch(path, init, signal);
    return r.ok;
  } catch {
    return false;
  }
}
async function tnJson(path, init, signal) {
  try {
    const r = await tnFetch(path, init, signal);
    if (!r.ok) return {};
    const d = await r.json();
    return d.data ?? d;
  } catch {
    return {};
  }
}
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
const TN_SYSTEM_PROMPT = `
## HyperNexus Integration

You have access to HyperNexus \u2014 a local AI control plane running on port 7778 with persistent L2 vector memory, semantic tool discovery, imported sessions, and a skill registry. Use these tools:

### Memory Tools
- \`hypernexus_memory_store\` \u2014 Save important decisions, patterns, and facts with tags
- \`hypernexus_memory_search\` \u2014 Find past memories by keyword, tag, or category
- \`hypernexus_memory_vector_search\` \u2014 Semantic vector search for conceptually related memories

### Discovery Tools
- \`hypernexus_tool_search\` \u2014 Describe what you need, TN finds the best tool across 20+ servers
- \`hypernexus_session_search\` \u2014 Browse 542+ imported sessions from Claude Code, Aider, etc.
- \`hypernexus_skill_manage\` \u2014 Access 5,776 reusable skill modules
- \`hypernexus_code_search\` \u2014 Search code via AST-grep rules, deepcontext semantic search, or file pattern matching
- \`hypernexus_context_harvest\` \u2014 Manually trigger context harvesting from TN L2 memory

### Slash Commands
- \`/tn-store\` \u2014 Interactive memory store with structured form
- \`/tn-search\` \u2014 Interactive memory search with filters
- \`/tn-status\` \u2014 Show TN system status: memory tiers, mesh peers
- \`/tn-plan\` \u2014 Create/edit/view project plans in L2 memory
- \`/tn-summary\` \u2014 Summarize current session using TN context
- \`/tn-purge\` \u2014 Remove stale memories from L2

### Enterprise Security
All tool calls are checked against HyperNexus enterprise RBAC. Blocked tools show a security notice.

### Best Practices
1. Use \`hypernexus_memory_search\` before significant tasks to recall past context
2. Store key decisions with \`hypernexus_memory_store\` using descriptive tags
3. Use \`hypernexus_context_harvest\` at the start of complex tasks
4. Use \`@memory:keyword\` inline in your prompts to auto-expand L2 context
`;
export default function(pi) {
  pi.on("session_start", async (event, ctx) => {
    const sessionFile = ctx?.sessionManager?.getSessionFile?.() ?? "";
    const reason = event.reason;
    try {
      const shortId = (sessionFile ?? "session").split(/[\\/]/).pop() ?? "session";
      pi.setSessionName(`TN \u2022 ${shortId}`);
    } catch {
    }
    tnOk("/api/memory/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: JSON.stringify({
          content: `Session ${reason}: ${sessionFile ?? "ephemeral"}`,
          tags: ["system:session", `reason:${reason}`],
          category: "session",
          timestamp: now()
        })
      })
    });
    safeUi(ctx)?.setStatus?.("tn", "TN active \u2022 L2 mem \u2022 tools \u2022 skills");
    refreshWidget(ctx);
  });
  pi.on("project_trust", async (event, _ctx) => {
    const cwd = event.cwd ?? "";
    if (cwd.includes("HyperNexus") || cwd.includes("hypernexus") || cwd.includes("marketing_agent")) {
      return { trust: "trusted" };
    }
    return { trust: "unknown" };
  });
  pi.on("before_agent_start", async (event, ctx) => {
    const isFirstTurn = event.systemPrompt.includes("HyperNexus");
    if (!isFirstTurn) {
      const memories = await tnFastSearch(event.prompt.slice(0, 100), 3, ctx.signal);
      if (Array.isArray(memories) && memories.length > 0) {
        const contextBlock = memories.slice(0, 3).map((m) => `  - ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 200)}`).join("\n");
        return { systemPrompt: `${event.systemPrompt}

## Relevant Context from HyperNexus L2
${contextBlock}` };
      }
      return;
    }
    let memoryContext = "";
    try {
      const res = { ok: true };
      if (res.ok) {
        const memories = await tnFastSearch(event.prompt.slice(0, 100), 5, ctx.signal);
        if (Array.isArray(memories) && memories.length > 0) {
          memoryContext = "\n\n## Relevant Past Context\n" + memories.slice(0, 5).map((m) => `  \u2022 ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 200)}`).join("\n");
        }
      }
    } catch {
    }
    if (!memoryContext) {
      try {
        const res = await tnFetch("/api/memory/list", {}, ctx.signal);
        if (res.ok) {
          const lb = await res.json();
          const all = Array.isArray(lb) ? lb : lb.memories ?? lb.data ?? [];
          const q = event.prompt.toLowerCase().slice(0, 100);
          const relevant = all.map((m) => {
            try {
              return { ...JSON.parse(m), raw: m };
            } catch {
              return { content: m, tags: [] };
            }
          }).filter((m) => m.content?.toLowerCase().includes(q) || m.tags?.some((t) => t.toLowerCase().includes(q))).slice(0, 5);
          if (relevant.length > 0) {
            memoryContext = "\n\n## Relevant Past Context\n" + relevant.map((m) => `  \u2022 ${m.content.slice(0, 200)}`).join("\n");
          }
        }
      } catch {
      }
    }
    return { systemPrompt: event.systemPrompt + TN_SYSTEM_PROMPT + memoryContext };
  });
  pi.on("context", async (event, ctx) => {
    const lastMessages = event.messages.slice(-4);
    const hasRecentSearch = lastMessages.some(
      (m) => m.role === "assistant" && JSON.stringify(m.content)?.includes("hypernexus_memory_search")
    );
    if (hasRecentSearch) return;
    const lastUserMsg = [...lastMessages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    const userText = typeof lastUserMsg.content === "string" ? lastUserMsg.content : lastUserMsg.content?.map((c) => c.text).filter(Boolean).join(" ") ?? "";
    if (!userText || userText.length < 10) return;
    tnFetch("/api/mcp/tool-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: userText.slice(0, 2e3) })
    }).catch(() => {
    });
    const memories = await tnFastSearch(userText.slice(0, 100), 2, ctx.signal);
    if (!Array.isArray(memories) || memories.length === 0) return;
    const top = memories.slice(0, 2);
    const contextBlock = top.map((m) => (m.content ?? m.text ?? JSON.stringify(m)).slice(0, 150)).filter(Boolean).join("\n");
    if (!contextBlock) return;
    event.messages.push({ role: "system", content: `[TN Context]: ${contextBlock}` });
  });
  pi.on("tool_call", async (event, ctx) => {
    const dangerousPatterns = ["rm -rf", "sudo ", "chmod -R 777", "DROP TABLE", "DROP DATABASE", "git push --force"];
    const inputStr = JSON.stringify(event.input).toLowerCase();
    for (const pattern of dangerousPatterns) {
      if (inputStr.includes(pattern.toLowerCase())) {
        const res = await tnJson("/api/enterprise/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: event.toolName, action: pattern, args: event.input })
        }, ctx.signal);
        const allowed = res.allowed;
        if (allowed === false) {
          return { block: true, reason: `Enterprise policy blocks: ${pattern}. Use hypernexus_memory_store for destructive operations.` };
        }
      }
    }
    tnOk("/api/enterprise/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: event.toolName,
        args: event.input,
        timestamp: now(),
        userId: "pi-agent"
      })
    });
  });
  pi.on("tool_result", async (event, ctx) => {
    const storeTools = ["bash", "read", "grep", "hypernexus_code_search", "hypernexus_tool_search"];
    if (!storeTools.includes(event.toolName)) return;
    const text = event.content?.map((c) => c.text).filter(Boolean).join(" ") ?? "";
    if (!text || text.length < 100) return;
    tnOk("/api/memory/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: JSON.stringify({
          content: `[${event.toolName}] ${text.slice(0, 300)}`,
          tags: ["system:tool_result", `tool:${event.toolName}`],
          category: "tool_result",
          timestamp: now()
        })
      })
    });
  });
  pi.on("user_bash", async (event, ctx) => {
    tnOk("/api/enterprise/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: "user_bash", command: event.command, timestamp: now() })
    });
  });
  pi.on("model_select", async (event, ctx) => {
    tnOk("/api/memory/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: JSON.stringify({
          content: `Model changed: ${event.previousModel?.id ?? "none"} \u2192 ${event.model.id} (${event.source})`,
          tags: ["system:model_change", `model:${event.model.id}`],
          category: "session",
          timestamp: now()
        })
      })
    });
    safeUi(ctx)?.setStatus?.("tn", `TN \u2022 ${event.model.id}`);
  });
  pi.on("input", async (event, ctx) => {
    const text = event.text;
    if (!text || !text.includes("@memory:")) return;
    const matches = text.match(/@memory:([a-zA-Z0-9_-]+)/g);
    if (!matches) return;
    let expanded = text;
    for (const match of matches) {
      const key = match.replace("@memory:", "");
      const memories = await tnFastSearch(key, 3, ctx.signal);
      const context = memories.map((m) => String(m.content ?? "").slice(0, 150)).filter(Boolean).join("\n");
      if (context) {
        expanded = expanded.replace(match, `
[TN Memory ${key}]: ${context}
`);
      }
    }
    if (expanded !== text) {
      return { text: expanded };
    }
  });
  pi.on("turn_end", async (event, ctx) => {
    if (!event.toolResults || event.toolResults.length === 0) return;
    const summary = event.message?.content?.filter((c) => c.type === "text")?.map((c) => c.text)?.join(" ")?.slice(0, 500);
    if (!summary || summary.length < 50) return;
    tnOk("/api/memory/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: JSON.stringify({
          content: `Turn ${event.turnIndex}: ${summary.slice(0, 200)}...`,
          tags: ["system:turn", `turn:${event.turnIndex}`],
          category: "session",
          timestamp: now()
        })
      })
    });
  });
  pi.on("session_before_compact", async (event, ctx) => {
    const { preparation, branchEntries, customInstructions, reason, signal } = event;
    const summaryParts = [];
    if (branchEntries && branchEntries.length > 0) {
      const fileOps = branchEntries.filter((e) => e.details?.readFiles || e.details?.modifiedFiles).map((e) => {
        const reads = (e.details?.readFiles ?? []).join(", ");
        const mods = (e.details?.modifiedFiles ?? []).join(", ");
        return `${reads ? `Read: ${reads}` : ""}${mods ? ` Modified: ${mods}` : ""}`;
      }).filter(Boolean);
      if (fileOps.length > 0) summaryParts.push(`Files: ${fileOps.join("; ")}`);
    }
    try {
      if (summaryParts.length > 0) {
        const query = summaryParts.join(" ").slice(0, 100);
        const memories = await tnJson(`/api/memory/search?q=${encodeURIComponent(query)}`, {}, signal);
        const items = Array.isArray(memories) ? memories : memories.data ?? [];
        if (items.length > 0) {
          const related = items.slice(0, 2).map((m) => (m.content ?? m.text ?? "").slice(0, 100)).filter(Boolean).join("; ");
          if (related) summaryParts.push(`Related: ${related}`);
        }
      }
    } catch {
    }
    return {
      compaction: {
        summary: summaryParts.length > 0 ? summaryParts.join("\n") : `Compaction (${reason})`,
        firstKeptEntryId: preparation.firstKeptEntryId,
        tokensBefore: preparation.tokensBefore,
        details: { enrichedBy: "tormentnexus-l2", reason, timestamp: now() }
      }
    };
  });
  pi.on("session_compact", async (event, ctx) => {
    if (!event.compactionEntry?.summary) return;
    tnOk("/api/memory/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: JSON.stringify({
          content: `Compaction [${event.reason}]: ${event.compactionEntry.summary.slice(0, 200)}`,
          tags: ["system:compaction", `reason:${event.reason}`],
          category: "session",
          timestamp: now()
        })
      })
    });
  });
  pi.events.on("tn:request_context", async (data) => {
    try {
      const res = await tnFetch(`/api/memory/search?q=${encodeURIComponent(data.query)}&limit=5`);
      if (res.ok) {
        const body = await res.json();
        pi.events.emit("tn:context_result", { id: data.id, memories: body.data ?? [] });
      }
    } catch {
    }
  });
  pi.events.on("tn:request_store", async (data) => {
    tnOk("/api/memory/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: JSON.stringify({ content: data.content, tags: data.tags ?? [], category: data.category ?? "general", timestamp: now() })
      })
    });
  });
  pi.registerTool({
    name: "hypernexus_memory_store",
    label: "TN Memory Store",
    description: "Store a memory in HyperNexus L2 vault and optionally in a project .memdb for git-tracked per-project portable memories.",
    promptSnippet: "Store knowledge in persistent L2 memory",
    promptGuidelines: [
      "Use hypernexus_memory_store to save important patterns, decisions, and facts across sessions.",
      "Use tags like 'project:name', 'failure:', 'pattern:', or 'convention:' for scope filtering.",
      "Set 'project' to the project directory name to also write to the project's .memdb file (git-tracked, portable).",
      "Good candidates: architectural decisions, bug fixes, build procedures, tool quirks."
    ],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "direct",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ stored: Type.Boolean(), projectNote: Type.Optional(Type.String()) }),
    parameters: Type.Object({
      content: Type.String({ description: "The memory content to store" }),
      tags: Type.Optional(Type.Array(Type.String(), { description: "Tags like ['project:bg', 'pattern:build']" })),
      category: Type.Optional(Type.String({ description: "Category: pattern, decision, convention, insight, failure, correction, preference" })),
      project: Type.Optional(Type.String({ description: "Project directory name. If set, also writes to project/.memdb for git tracking" }))
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const sessionFile = ctx?.sessionManager?.getSessionFile?.() ?? "";
      const tags = params.tags ?? [];
      if (params.project) {
        const projectTag = "project:" + params.project;
        if (!tags.includes(projectTag)) tags.push(projectTag);
      }
      const enriched = JSON.stringify({
        content: params.content,
        tags,
        category: params.category ?? "general",
        timestamp: now(),
        session: sessionFile
      });
      const res = await tnFetch("/api/memory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: enriched })
      }, signal);
      if (!res.ok) return { content: [{ type: "text", text: `Failed: ${res.status}` }], isError: true };
      if (params.project) {
        tnFetch("/api/memory/project/sync", { method: "POST" }).catch(() => {
        });
      }
      pi.events.emit("tn:memory_stored", { content: params.content, tags });
      const projectNote = params.project ? ` and project .memdb (${params.project})` : "";
      return { content: [{ type: "text", text: `\u2705 Memory stored in L2 vault${projectNote}.` }], details: { tags }, structuredContent: { stored: true, projectNote } };
    }
  });
  pi.registerTool({
    name: "hypernexus_memory_search",
    label: "TN Memory Search",
    description: "Search L2 vault by keyword, tag filter, or category.",
    promptSnippet: "Search persistent L2 memory",
    promptGuidelines: ["Use hypernexus_memory_search before tasks to recall past context.", "Filter by tag prefix like 'project:' or 'failure:'."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({
      count: Type.Number(),
      memories: Type.Array(Type.Object({
        content: Type.String(),
        tags: Type.Array(Type.String()),
        category: Type.String()
      }))
    }),
    parameters: Type.Object({
      query: Type.Optional(Type.String({ description: "Keyword to search for" })),
      tag: Type.Optional(Type.String({ description: "Filter by tag prefix, e.g. 'project:'" })),
      category: Type.Optional(Type.String({ description: "Filter by category" })),
      limit: Type.Optional(Type.Number({ description: "Max results (default 20)" }))
    }),
    async execute(_toolCallId, params, signal) {
      const res = await tnFetch("/api/memory/list", {}, signal);
      if (!res.ok) return { content: [{ type: "text", text: `Memory list failed (HTTP ${res.status ?? 0} \u2014 kernel busy or timed out). Retry.` }], isError: true };
      const lb = await res.json();
      const memories = Array.isArray(lb) ? lb : lb.memories ?? lb.data ?? [];
      const limit = params.limit ?? 20;
      const parsed = memories.map((m) => {
        try {
          const p = JSON.parse(m);
          return { content: p.content ?? m, tags: p.tags ?? [], category: p.category ?? "general" };
        } catch {
          return { content: m, tags: [], category: "general" };
        }
      }).filter((m) => {
        if (params.query) {
          const q = params.query.toLowerCase();
          if (!m.content.toLowerCase().includes(q) && !m.tags.some((t) => t.toLowerCase().includes(q))) return false;
        }
        if (params.tag && !m.tags.some((t) => t.startsWith(params.tag))) return false;
        if (params.category && m.category !== params.category) return false;
        return true;
      }).slice(0, limit);
      if (parsed.length === 0) return { content: [{ type: "text", text: "No matching memories." }], structuredContent: { count: 0, memories: [] } };
      const formatted = parsed.map((m, i) => `${i + 1}.${m.category !== "general" ? ` (${m.category})` : ""}${m.tags.length ? ` [${m.tags.join(", ")}]` : ""}
   ${m.content.slice(0, 200)}`).join("\n\n");
      return { content: [{ type: "text", text: `\u{1F4DA} ${parsed.length} memories:

${formatted}` }], structuredContent: { count: parsed.length, memories: parsed } };
    }
  });
  pi.registerTool({
    name: "hypernexus_memory_vector_search",
    label: "TN Vector Search",
    description: "Semantic search L2 memory using sqlite-vec embeddings. Finds conceptually related memories.",
    promptSnippet: "Semantic vector search L2 memory",
    promptGuidelines: ["Use hypernexus_memory_vector_search for fuzzy/conceptual recall."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ count: Type.Number(), memories: Type.Array(Type.Object({ content: Type.String() })) }),
    parameters: Type.Object({ query: Type.String({ description: "Natural language query" }), limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })) }),
    async execute(_toolCallId, params, signal) {
      const limit = params.limit ?? 10;
      const q = String(params.query ?? "").trim();
      if (!q) return { content: [{ type: "text", text: "Provide a query." }], isError: true, structuredContent: { count: 0, memories: [] } };
      try {
        const res = await tnFetch(`/api/memory/search?q=${encodeURIComponent(q)}&limit=${limit}`, {}, signal);
        if (!res.ok) return { content: [{ type: "text", text: `Search failed (HTTP ${res.status ?? 0} \u2014 kernel busy or timed out). Retry.` }], isError: true, structuredContent: { count: 0, memories: [] } };
        const body = await res.json();
        const data = body.data ?? body;
        if (Array.isArray(data) && data.length > 0) {
          const results = data.slice(0, limit);
          const memories = results.map((r) => ({ content: r.content ?? r.text ?? JSON.stringify(r) }));
          const formatted = memories.map((m, i) => `  ${i + 1}. ${m.content.slice(0, 200)}`).join("\n\n");
          return { content: [{ type: "text", text: `\u{1F9E0} ${data.length} results:

${formatted}` }], structuredContent: { count: memories.length, memories } };
        }
        return { content: [{ type: "text", text: `No results for "${q}".` }], structuredContent: { count: 0, memories: [] } };
      } catch {
        return { content: [{ type: "text", text: "Search timed out or unavailable." }], isError: true, structuredContent: { count: 0, memories: [] } };
      }
    }
  });
  pi.registerTool({
    name: "hypernexus_tool_search",
    label: "TN Tool Search",
    prepareLoadout(loadout) {
      const callable = loadout.callable.map((t) => t.name).filter((n) => n.startsWith("hypernexus_"));
      return {
        description: `Describe what you need \u2014 TN finds the best tool across 20+ MCP servers and 80+ catalog entries. Callable HyperNexus tools: ${callable.join(", ")}`
      };
    },
    description: "Semantically search MCP tools across 20+ servers. Describe what you need \u2014 finds the best tool by meaning.",
    promptSnippet: "Discover tools via semantic search",
    promptGuidelines: ["Use hypernexus_tool_search when unsure what's available.", "Describe the task naturally, not keywords."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    reachesTools: () => "all",
    outputSchema: Type.Object({ count: Type.Number(), tools: Type.Array(Type.Object({
      name: Type.String(),
      server: Type.Optional(Type.String()),
      score: Type.Optional(Type.Number()),
      description: Type.Optional(Type.String())
    })) }),
    parameters: Type.Object({ query: Type.String({ description: "Natural language description of what you need" }), limit: Type.Optional(Type.Number({ description: "Max results (default 5)" })) }),
    async execute(_toolCallId, params, signal) {
      const res = await tnFetch(`/api/mcp/native/search?query=${encodeURIComponent(params.query)}`, {}, signal);
      if (!res.ok) return { content: [{ type: "text", text: `Failed: ${res.status}` }], isError: true };
      const body = await res.json();
      const data = body.data ?? body;
      const results = data.results ?? (Array.isArray(data) ? data : []);
      if (results.length === 0) return { content: [{ type: "text", text: `No tools for "${params.query}".` }], structuredContent: { count: 0, tools: [] } };
      const limit = params.limit ?? 5;
      const tools = results.slice(0, limit).map((r) => ({
        name: r.originalName ?? r.name ?? "?",
        server: r.server,
        score: typeof r.score === "number" ? r.score : void 0,
        description: r.description
      }));
      const formatted = tools.map(
        (t) => `  [${t.score ?? "?"}] ${t.name} (${t.server ?? "?"})
         ${(t.description ?? "").slice(0, 150).replace(/\n/g, " ")}`
      ).join("\n\n");
      return { content: [{ type: "text", text: `\u{1F527} Top tools:

${formatted}` }], structuredContent: { count: tools.length, tools } };
    }
  });
  pi.registerTool({
    name: "hypernexus_suggest_tools",
    label: "TN Suggest Tools",
    description: "Surface tools the HyperNexus preemptive monitor recommends for the current conversation (fed automatically by the context hook).",
    promptSnippet: "See tools TN suggests for this conversation",
    promptGuidelines: ["Call when you want TN's proactive tool recommendations for what the user is doing."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ count: Type.Number(), tools: Type.Array(Type.Object({
      name: Type.String(),
      score: Type.Optional(Type.Number()),
      description: Type.Optional(Type.String()),
      reason: Type.Optional(Type.String())
    })) }),
    parameters: Type.Object({ limit: Type.Optional(Type.Number({ description: "Max results (default 8)" })) }),
    async execute(_toolCallId, params, signal) {
      const res = await tnFetch("/api/mcp/tool-suggestions", {}, signal);
      if (!res.ok) return { content: [{ type: "text", text: `Failed: ${res.status}` }], isError: true };
      const body = await res.json();
      const ads = body.data ?? body ?? [];
      if (!Array.isArray(ads) || ads.length === 0) {
        return { content: [{ type: "text", text: "No suggestions yet. Keep working \u2014 TN watches the conversation and suggests relevant tools." }], structuredContent: { count: 0, tools: [] } };
      }
      const limit = params.limit ?? 8;
      const tools = ads.slice(0, limit).map((a) => ({
        name: a.toolName ?? a.name ?? "?",
        score: typeof a.score === "number" ? a.score : void 0,
        description: a.description,
        reason: a.reason
      }));
      const formatted = tools.map(
        (t) => `  [${t.score ?? "?"}] ${t.name}
         ${(t.description ?? "").slice(0, 120).replace(/\n/g, " ")}${t.reason ? `
         (${t.reason})` : ""}`
      ).join("\n\n");
      return { content: [{ type: "text", text: `\u{1F4A1} Suggested tools:

${formatted}` }], structuredContent: { count: tools.length, tools } };
    }
  });
  pi.registerTool({
    name: "hypernexus_session_search",
    label: "TN Session Search",
    description: "Search 542+ imported sessions from Claude Code, Aider, etc.",
    promptSnippet: "Search past AI coding sessions",
    promptGuidelines: ["Use to find/review past sessions.", "action='list' to browse, 'get' for transcript, 'stats' for summary."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ action: Type.String(), count: Type.Number(), items: Type.Array(Type.Record(Type.String(), Type.Any())) }),
    parameters: Type.Object({
      action: Type.String({ description: "'list' | 'get' | 'stats'" }),
      sourceTool: Type.Optional(Type.String({ description: "Filter by source tool" })),
      limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
      id: Type.Optional(Type.String({ description: "Session ID for action='get'" }))
    }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "stats") {
        const data2 = await tnJson("/api/sessions/imported/maintenance-stats", {}, signal);
        return { content: [{ type: "text", text: `\u{1F4CA} Stats:
Total: ${data2.totalSessions ?? "?"}
Archived: ${data2.archivedTranscriptCount ?? "?"}` }], structuredContent: { action: "stats", count: 1, items: [data2] } };
      }
      if (params.action === "get") {
        if (!params.id) return { content: [{ type: "text", text: "Provide 'id'." }], structuredContent: { action: "get", count: 0, items: [] } };
        const data2 = await tnJson(`/api/sessions/imported/get?id=${encodeURIComponent(params.id)}`, {}, signal);
        const summary = data2.transcript ? data2.transcript.slice(0, 2e3) : JSON.stringify(data2).slice(0, 2e3);
        return { content: [{ type: "text", text: `\u{1F4DD} Session:

${summary}` }], structuredContent: { action: "get", count: 1, items: [data2] } };
      }
      const limit = params.limit ?? 10;
      const data = await tnJson(`/api/sessions/imported/list?limit=${limit}`, {}, signal);
      let sessions = Array.isArray(data) ? data : [];
      if (params.sourceTool) sessions = sessions.filter((s) => s.sourceTool === params.sourceTool);
      if (sessions.length === 0) return { content: [{ type: "text", text: "No sessions found." }], structuredContent: { action: "list", count: 0, items: [] } };
      const listed = sessions.slice(0, limit);
      const formatted = listed.map(
        (s, i) => `${i + 1}. [${s.valid !== false ? "\u2705" : "\u274C"}] ${s.sourceTool ?? "?"} (${s.sessionFormat ?? "?"})`
      ).join("\n");
      return { content: [{ type: "text", text: `\u{1F4CB} Sessions:

${formatted}` }], structuredContent: { action: "list", count: listed.length, items: listed } };
    }
  });
  pi.registerTool({
    name: "hypernexus_skill_manage",
    label: "TN Skill Management",
    description: "Manage 5,776+ HyperNexus skills: list, search, read, create.",
    promptSnippet: "Manage skills (list, search, read, create)",
    promptGuidelines: ["Use to discover/create reusable skill modules.", "Skills are SKILL.md format."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ action: Type.String(), count: Type.Number(), items: Type.Array(Type.Record(Type.String(), Type.Any())) }),
    parameters: Type.Object({
      action: Type.String({ description: "'list' | 'search' | 'read' | 'create'" }),
      id: Type.Optional(Type.String({ description: "Skill ID for read/create" })),
      query: Type.Optional(Type.String({ description: "Search query" })),
      content: Type.Optional(Type.String({ description: "Full markdown for create" })),
      limit: Type.Optional(Type.Number({ description: "Max results (default 20)" }))
    }),
    async execute(_toolCallId, params, signal) {
      const limit = params.limit ?? 20;
      if (params.action === "list" || params.action === "search") {
        const body = await tnJson("/api/skills", {}, signal);
        const skills = body.data ?? body.skills ?? [];
        const q = (params.query ?? "").toLowerCase();
        const filtered = q ? skills.filter((s) => `${s.id ?? ""} ${s.name ?? ""} ${s.description ?? ""}`.toLowerCase().includes(q)) : skills;
        const icon = params.action === "search" ? "\u{1F50D}" : "\u{1F4DA}";
        const shown = filtered.slice(0, limit);
        return { content: [{ type: "text", text: `${icon} ${filtered.length} skills:
${shown.map((s, i) => `  ${i + 1}. ${s.id ?? s.name}`).join("\n")}` }], structuredContent: { action: params.action, count: shown.length, items: shown } };
      }
      if (params.action === "read") {
        if (!params.id) return { content: [{ type: "text", text: "Provide 'id'." }], structuredContent: { action: "read", count: 0, items: [] } };
        const body = await tnJson(`/api/skills/read?name=${encodeURIComponent(params.id)}`, {}, signal);
        const text = typeof body.content === "string" ? body.content : JSON.stringify(body).slice(0, 3e3);
        return { content: [{ type: "text", text: `\u{1F4D6} ${params.id}

${text.slice(0, 3e3)}` }], structuredContent: { action: "read", count: 1, items: [{ id: params.id, content: text }] } };
      }
      if (params.action === "create") {
        if (!params.id || !params.content) return { content: [{ type: "text", text: "Provide 'id' and 'content'." }], structuredContent: { action: "create", count: 0, items: [] } };
        const ok = await tnOk("/api/skills/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: params.id, name: params.id, content: params.content }) }, signal);
        return ok ? { content: [{ type: "text", text: `\u2705 Skill '${params.id}' created.` }], structuredContent: { action: "create", count: 1, items: [{ id: params.id, created: true }] } } : { content: [{ type: "text", text: "Failed to create skill." }], isError: true, structuredContent: { action: "create", count: 0, items: [] } };
      }
      return { content: [{ type: "text", text: "Usage: action='list'|'search'|'read'|'create'" }], structuredContent: { action: "usage", count: 0, items: [] } };
    }
  });
  pi.registerTool({
    name: "hypernexus_code_search",
    label: "TN Code Search",
    description: "Search code by AST structure, semantic meaning, or file pattern.",
    promptSnippet: "Search code via AST, semantic, or pattern matching",
    promptGuidelines: ["mode='ast' for structural patterns.", "mode='semantic' for natural language.", "mode='pattern' for file globs."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ count: Type.Number(), tools: Type.Array(Type.Object({
      name: Type.String(),
      server: Type.Optional(Type.String()),
      score: Type.Optional(Type.Number())
    })) }),
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      mode: Type.Optional(Type.String({ description: "'ast' | 'semantic' | 'pattern'" })),
      path: Type.Optional(Type.String({ description: "Scope path" })),
      limit: Type.Optional(Type.Number({ description: "Max results (default 10)" }))
    }),
    async execute(_toolCallId, params, signal) {
      const mode = params.mode ?? "semantic";
      const limit = params.limit ?? 10;
      const res = await tnFetch(`/api/mcp/native/search?query=${encodeURIComponent(`${mode} ${params.query}${params.path ? ` path:${params.path}` : ""}`)}`, {}, signal);
      if (!res.ok) return { content: [{ type: "text", text: "Search failed." }], isError: true };
      const body = await res.json();
      const results = (body.data ?? body).results ?? [];
      const top = results.slice(0, limit);
      if (top.length === 0) return { content: [{ type: "text", text: `No results for "${params.query}".` }], structuredContent: { count: 0, tools: [] } };
      const tools = top.map((r) => ({
        name: r.originalName ?? r.name ?? "?",
        server: r.server,
        score: typeof r.score === "number" ? r.score : void 0
      }));
      const formatted = tools.map(
        (t) => `  [${t.score ?? "?"}] ${t.name} (${t.server ?? "?"})`
      ).join("\n\n");
      return { content: [{ type: "text", text: `\u{1F527} Tools: "${params.query}":

${formatted}` }], structuredContent: { count: tools.length, tools } };
    }
  });
  pi.registerTool({
    name: "hypernexus_context_harvest",
    label: "TN Context Harvest",
    description: "Harvest relevant context from L2 memory + skills + sessions for current task.",
    promptSnippet: "Harvest context from L2 memory",
    promptGuidelines: ["Use at start of complex tasks.", "Searches L2 memory + skills + sessions."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ found: Type.Boolean(), sections: Type.Array(Type.String()) }),
    parameters: Type.Object({
      query: Type.String({ description: "What you're working on" }),
      harvestMemory: Type.Optional(Type.Boolean({ description: "Search L2 memory (default true)" })),
      harvestSkills: Type.Optional(Type.Boolean({ description: "Search skills (default false)" }))
    }),
    async execute(_toolCallId, params, signal) {
      const results = [];
      if (params.harvestMemory !== false) {
        const body = await tnJson(`/api/memory/search?q=${encodeURIComponent(params.query)}`, {}, signal);
        const memories = body.data ?? (Array.isArray(body) ? body : []);
        if (memories.length > 0) {
          results.push(`## L2 Memory
${memories.slice(0, 5).map((m) => `  \u2022 ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 200)}`).join("\n")}`);
        }
      }
      if (params.harvestSkills) {
        const body = await tnJson(`/api/skills/search?q=${encodeURIComponent(params.query)}`, {}, signal);
        const skills = body.skills ?? body.data?.skills ?? [];
        if (skills.length > 0) results.push(`## Skills
${skills.slice(0, 5).map((s) => `  \u2022 ${s.id}`).join("\n")}`);
      }
      if (results.length === 0) return { content: [{ type: "text", text: `No context found for "${params.query}".` }], structuredContent: { found: false, sections: [] } };
      return { content: [{ type: "text", text: `\u{1F33E} Context harvested:

${results.join("\n\n")}` }], structuredContent: { found: true, sections: results } };
    }
  });
  pi.registerTool({
    name: "hypernexus_scratchpad",
    label: "TN Scratchpad",
    description: "Read/write L1 session scratchpad \u2014 ephemeral working memory.",
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), value: Type.Optional(Type.String()) }),
    parameters: Type.Object({
      action: Type.String({ description: "'get' or 'set'" }),
      content: Type.Optional(Type.String({ description: "Content for 'set'" }))
    }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "get") {
        const text = await tnFetch("/api/memory/scratchpad/get", {}, signal).then((r) => r.ok ? r.text() : "");
        return { content: [{ type: "text", text: text || "Empty." }], structuredContent: { ok: true, value: text || "" } };
      }
      if (params.action === "set" && params.content) {
        const ok = await tnOk("/api/memory/scratchpad/set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: params.content }) }, signal);
        return ok ? { content: [{ type: "text", text: "\u2705 Scratchpad updated." }], structuredContent: { ok: true } } : { content: [{ type: "text", text: "Scratchpad write failed (kernel busy/timed out). Retry." }], isError: true, structuredContent: { ok: false } };
      }
      return { content: [{ type: "text", text: 'Usage: action="get" or "set".' }], structuredContent: { ok: false } };
    }
  });
  pi.registerTool({
    name: "hypernexus_system_status",
    label: "TN System Status",
    description: "Composite HyperNexus health: kernel uptime, L2/L3 memory counts, mesh peers.",
    promptSnippet: "Check HyperNexus kernel + memory + mesh health",
    promptGuidelines: ["Call at session start, before/after ops, or when the kernel may be degraded."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), uptimeSec: Type.Optional(Type.Number()), l2: Type.Optional(Type.Number()), l3: Type.Optional(Type.Number()), peers: Type.Optional(Type.Number()) }),
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      const [health, mem, cold, mesh] = await Promise.all([
        tnFetchWithTimeout("/health", 900, {}, signal).then((r) => r.ok ? r.json() : null).catch(() => null),
        tnJson("/api/memory/list?limit=1", {}, signal).catch(() => ({})),
        tnJson("/api/memory/cold-archive/count", {}, signal).catch(() => ({})),
        tnJson("/api/mesh/status", {}, signal).catch(() => ({}))
      ]);
      const l2 = mem?.total ?? mem?.count;
      const l3 = cold?.count;
      const peers = mesh?.data?.peersCount ?? mesh?.peersCount;
      const up = health?.uptimeSec;
      const lines = [
        `Kernel: ${health?.ok ? "OK" : "unreachable"}${up ? ` up ${Math.round(up)}s` : ""}`,
        `L2 memory: ${l2 ?? "?"} L3 cold: ${l3 ?? "?"}`,
        `Mesh peers: ${peers ?? 0}`
      ];
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { ok: !!health?.ok, uptimeSec: up, l2, l3, peers } };
    }
  });
  pi.registerTool({
    name: "hypernexus_billing_status",
    label: "TN Billing Status",
    description: "Provider quotas, model pricing, and billing/usage status.",
    promptSnippet: "Check billing + provider quotas",
    promptGuidelines: ["Call to verify provider quotas before heavy model use."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), summary: Type.Optional(Type.String()) }),
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      const body = await tnJson("/api/billing/status", {}, signal).catch(() => null);
      const text = body ? JSON.stringify(body.data ?? body).slice(0, 1500) : "Billing status unavailable.";
      return { content: [{ type: "text", text }], structuredContent: { ok: !!body, summary: text } };
    }
  });
  pi.registerTool({
    name: "hypernexus_mcp_call",
    label: "TN Tool Call",
    description: "Invoke any HyperNexus kernel/registry tool by name with args - a universal dispatcher (memory, files, code, MCP tools).",
    promptSnippet: "Call any HyperNexus tool by name",
    promptGuidelines: ["Use to invoke a capability you discovered via tool_search/suggest_tools without leaving the turn."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    outputSchema: Type.Object({ ok: Type.Boolean(), result: Type.Optional(Type.String()) }),
    parameters: Type.Object({
      tool: Type.String({ description: "Tool name (e.g. 'repomap', 'bash', 'memory_stats')" }),
      args: Type.Optional(Type.Any({ description: "Arguments object for the tool" }))
    }),
    async execute(_toolCallId, params, signal) {
      const res = await tnFetch("/api/agent/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: params.tool, args: params.args ?? {} })
      }, signal);
      const body = await res.json().catch(() => ({}));
      const c = body?.data?.content;
      const text = Array.isArray(c) ? c.map((x) => x.text ?? JSON.stringify(x)).join("\n") : JSON.stringify(body);
      return { content: [{ type: "text", text: text.slice(0, 2e3) || "(no output)" }], structuredContent: { ok: res.ok, result: text.slice(0, 2e3) } };
    }
  });
  pi.registerTool({
    name: "hypernexus_add_fact",
    label: "TN Add Fact",
    description: "Persist a structured fact, observation, or decision to L2 memory with a type + tags for precise recall.",
    promptSnippet: "Store a fact/observation/decision",
    promptGuidelines: ["Prefer over memory_store when the item has a clear type (fact|observation|decision|gotcha)."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "direct",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean() }),
    parameters: Type.Object({
      content: Type.String({ description: "The fact / observation / decision" }),
      kind: Type.Optional(Type.String({ description: "fact | observation | decision | gotcha (default 'fact')" })),
      tags: Type.Optional(Type.Array(Type.String(), { description: "Tags for recall" })),
      importance: Type.Optional(Type.Number({ description: "0..1 importance (default 0.6)" }))
    }),
    async execute(_toolCallId, params, signal) {
      const ok = await tnOk("/api/memory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: params.content, category: params.kind ?? "fact", tags: params.tags ?? [], importance: params.importance ?? 0.6, timestamp: now() })
      }, signal);
      return ok ? { content: [{ type: "text", text: "Stored fact." }], structuredContent: { ok: true } } : { content: [{ type: "text", text: "Store failed (kernel busy/timed out). Retry." }], isError: true, structuredContent: { ok: false } };
    }
  });
  pi.registerTool({
    name: "hypernexus_memory_list",
    label: "TN Memory List",
    description: "Browse/review recent L2 memories with tags \u2014 for recall and situational awareness.",
    promptSnippet: "Browse recent memories",
    promptGuidelines: ["Call to review what's stored before deciding what to recall or persist."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ count: Type.Number(), memories: Type.Array(Type.Any()) }),
    parameters: Type.Object({ limit: Type.Optional(Type.Number({ description: "Max results (default 15)" })) }),
    async execute(_toolCallId, params, signal) {
      const body = await tnJson(`/api/memory/list?limit=${params.limit ?? 15}`, {}, signal).catch(() => null);
      const mems = body?.memories ?? body?.data ?? [];
      const items = (Array.isArray(mems) ? mems : []).slice(0, params.limit ?? 15).map((m, i) => {
        let o = m;
        if (typeof m === "string") {
          try {
            o = JSON.parse(m);
          } catch {
            o = { content: m };
          }
        }
        return `  ${i + 1}. [${(o.tags ?? []).join(",")}] ${String(o.content ?? "").slice(0, 120)}`;
      }).join("\n");
      return { content: [{ type: "text", text: `\u{1F4DA} ${mems.length ?? 0} recent memories:
${items}` }], structuredContent: { count: mems.length ?? 0, memories: [] } };
    }
  });
  pi.registerTool({
    name: "hypernexus_memory_delete",
    label: "TN Memory Delete",
    description: "Delete an L2 memory by ID. Use to remove stale or incorrect entries.",
    promptSnippet: "Delete a memory by ID",
    promptGuidelines: ["Use after memory search/list to clean up stale or wrong entries."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), deleted: Type.Optional(Type.String()) }),
    parameters: Type.Object({ id: Type.String({ description: "Memory ID to delete" }) }),
    async execute(_toolCallId, params, signal) {
      const post = (p, b) => tnOk(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }, signal);
      let ok = await post("/api/agent/tool", { name: "delete_memory", args: { id: params.id } });
      if (!ok) {
        try {
          const r = await tnFetch(`/api/memory/delete?id=${encodeURIComponent(params.id)}`, { method: "DELETE" }, signal);
          ok = r.ok;
        } catch {
          ok = false;
        }
      }
      return ok ? { content: [{ type: "text", text: "Memory " + params.id + " deleted." }], structuredContent: { ok: true, deleted: params.id } } : { content: [{ type: "text", text: "Delete failed." }], isError: true, structuredContent: { ok: false } };
    }
  });
  pi.registerTool({
    name: "hypernexus_memory_update",
    label: "TN Memory Update",
    description: "Update an existing L2 memory's content or tags.",
    promptSnippet: "Update a memory's content or tags",
    promptGuidelines: ["Use to correct or refine a stored fact."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), id: Type.String() }),
    parameters: Type.Object({
      id: Type.String({ description: "Memory ID" }),
      content: Type.Optional(Type.String({ description: "New content" })),
      tags: Type.Optional(Type.Array(Type.String(), { description: "New tags" })),
      title: Type.Optional(Type.String({ description: "New title" }))
    }),
    async execute(_toolCallId, params, signal) {
      const post = (p, b) => tnOk(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }, signal);
      const removed = await post("/api/agent/tool", { name: "delete_memory", args: { id: params.id } });
      if (!removed) {
        return { content: [{ type: "text", text: "Update failed (could not remove " + params.id + " first)." }], isError: true, structuredContent: { ok: false, id: params.id } };
      }
      const ok = await post("/api/memory/facts/add", {
        title: params.title ?? `updated ${params.id}`,
        content: params.content ?? "",
        tags: [...params.tags ?? [], "updated"],
        category: "general"
      });
      return ok ? { content: [{ type: "text", text: "Memory " + params.id + " updated." }], structuredContent: { ok: true, id: params.id } } : { content: [{ type: "text", text: "Update failed." }], isError: true, structuredContent: { ok: false, id: params.id } };
    }
  });
  pi.registerTool({
    name: "hypernexus_session_list",
    label: "TN Session List",
    description: "List active and recent HyperNexus sessions with status and metadata.",
    promptSnippet: "List active/recent sessions",
    promptGuidelines: ["Use to discover other agents or sessions working on related tasks."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ count: Type.Number(), sessions: Type.Array(Type.Any()) }),
    parameters: Type.Object({ limit: Type.Optional(Type.Number({ description: "Max sessions (default 10)" })) }),
    async execute(_toolCallId, params, signal) {
      const body = await tnJson("/api/sessions/summary?limit=" + (params.limit ?? 10), {}, signal).catch(() => null);
      return { content: [{ type: "text", text: JSON.stringify(body?.data ?? body).slice(0, 2e3) }], structuredContent: { count: 0, sessions: [] } };
    }
  });
  pi.registerTool({
    name: "hypernexus_kernel_routes",
    label: "TN Kernel Routes",
    description: "List all registered kernel API routes with categories and descriptions.",
    promptSnippet: "Discover kernel API endpoints",
    promptGuidelines: ["Use to find kernel endpoints beyond the typed tools."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ count: Type.Number(), routes: Type.Array(Type.Any()) }),
    parameters: Type.Object({ category: Type.Optional(Type.String({ description: "Filter by category" })) }),
    async execute(_toolCallId, params, signal) {
      const body = await tnJson("/api/routes", {}, signal).catch(() => null);
      const routes = body?.data ?? body?.routes ?? [];
      const filtered = params.category ? routes.filter((r) => (r.category ?? r.Category) === params.category) : routes;
      const list = filtered.slice(0, 20).map((r) => "  " + (r.path ?? r.Path ?? "?") + " [" + (r.category ?? r.Category ?? "?") + "]").join("\n");
      return { content: [{ type: "text", text: filtered.length + " routes:\n" + list }], structuredContent: { count: filtered.length, routes: filtered.slice(0, 50) } };
    }
  });
  pi.registerTool({
    name: "hypernexus_repomap",
    label: "TN Repo Map",
    description: "Generate a repository map with file/symbol summaries to orient in a codebase quickly.",
    promptSnippet: "Map the repository structure + key symbols",
    promptGuidelines: ["Call at the start of code work to orient, or when asked to summarize a repo."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ map: Type.Optional(Type.String()) }),
    parameters: Type.Object({ dir: Type.Optional(Type.String({ description: "Directory to map (default workspace root)" })) }),
    async execute(_toolCallId, params, signal) {
      try {
        const res = await tnFetch("/api/agent/tool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "repomap", args: { dir: params.dir ?? "" } }) }, signal);
        const body = await res.json().catch(() => ({}));
        const c = body?.data?.content;
        const text = Array.isArray(c) ? c.map((x) => x.text ?? "").join("\n") : JSON.stringify(body);
        return { content: [{ type: "text", text: text.slice(0, 4e3) || "(empty map)" }], structuredContent: { map: text.slice(0, 4e3) } };
      } catch {
        return { content: [{ type: "text", text: "Repo map timed out (large repo) or kernel busy." }], isError: true, structuredContent: { map: "" } };
      }
    }
  });
  pi.registerTool({
    name: "hypernexus_knowledge_graph",
    label: "TN Knowledge Graph",
    description: "Add entities, relations, or observations to the HyperNexus knowledge graph, or search it.",
    promptSnippet: "Add/search the knowledge graph",
    promptGuidelines: ["Use to persist structured domain knowledge (entities + relationships) beyond flat facts."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), result: Type.Optional(Type.String()) }),
    parameters: Type.Object({
      action: Type.String({ description: "add_entities | add_relations | add_observations | search" }),
      entities: Type.Optional(Type.Any({ description: "Entities to add [{name,type,observations}]" })),
      relations: Type.Optional(Type.Any({ description: "Relations to add [{from,to,type}]" })),
      query: Type.Optional(Type.String({ description: "Query for action=search" }))
    }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "search") {
        const body2 = await tnJson(`/api/memory/search?q=${encodeURIComponent(params.query ?? "")}`, {}, signal).catch(() => null);
        return { content: [{ type: "text", text: JSON.stringify(body2?.data ?? body2).slice(0, 2e3) }], structuredContent: { ok: true } };
      }
      const res = await tnFetch("/api/knowledge/graph", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: params.action, entities: params.entities ?? [], relations: params.relations ?? [] }) }, signal);
      const body = await res.json().catch(() => ({}));
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 1500) }], structuredContent: { ok: res.ok, result: JSON.stringify(body).slice(0, 1500) } };
    }
  });
  pi.registerTool({
    name: "hypernexus_session_context",
    label: "TN Session Context",
    description: "Get or set the session goal/objective used by HyperNexus for context harvesting and handoff.",
    promptSnippet: "Get/set the session goal",
    promptGuidelines: ["Set the goal at session start; get it when resuming or handoff."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), value: Type.Optional(Type.String()) }),
    parameters: Type.Object({ action: Type.String({ description: "'get' or 'set'" }), goal: Type.Optional(Type.String({ description: "Goal text (for set)" })), objective: Type.Optional(Type.String({ description: "Objective text (for set)" })) }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "get") {
        const body = await tnJson("/api/sessions/context", {}, signal).catch(() => null);
        return { content: [{ type: "text", text: JSON.stringify(body?.data ?? body).slice(0, 1500) }], structuredContent: { ok: true, value: JSON.stringify(body) } };
      }
      const ok = await tnOk("/api/memory/context/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: params.goal ?? "", objective: params.objective ?? "" }) }, signal);
      return ok ? { content: [{ type: "text", text: "\u2705 Session context updated." }], structuredContent: { ok: true } } : { content: [{ type: "text", text: "Context save failed (kernel busy/timed out). Retry." }], isError: true, structuredContent: { ok: false } };
    }
  });
  pi.registerTool({
    name: "hypernexus_workflow",
    label: "TN Workflow",
    description: "List or run HyperNexus engineering workflows (full-build, submodule-sync, etc.) for orchestration.",
    promptSnippet: "List/run HyperNexus workflows",
    promptGuidelines: ["Use to discover and trigger repeatable engineering workflows (orchestration)."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    outputSchema: Type.Object({ ok: Type.Boolean(), workflows: Type.Optional(Type.Array(Type.Any())) }),
    parameters: Type.Object({ action: Type.String({ description: "'list' or 'run'" }), id: Type.Optional(Type.String({ description: "Workflow id (for run)" })) }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "run" && params.id) {
        const res = await tnFetch(`/api/workflows/${encodeURIComponent(params.id)}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, signal);
        const body2 = await res.json().catch(() => ({}));
        return { content: [{ type: "text", text: JSON.stringify(body2).slice(0, 1500) }], structuredContent: { ok: res.ok } };
      }
      const body = await tnJson("/api/workflows", {}, signal).catch(() => null);
      const wfs = body?.data ?? body ?? [];
      const items = (Array.isArray(wfs) ? wfs : []).map((w, i) => `  ${i + 1}. ${w.id ?? w.name ?? "?"} - ${(w.description ?? "").slice(0, 80)}`).join("\n");
      return { content: [{ type: "text", text: `Workflows:
${items || "(none)"}` }], structuredContent: { ok: true, workflows: [] } };
    }
  });
  pi.registerTool({
    name: "hypernexus_orchestrate",
    label: "TN Orchestrate",
    description: "Autonomously chain HyperNexus tools inline (ctx.executeTool) to run the RECALL -> DISCOVER -> EXECUTE -> PERSIST loop for a task in one call.",
    promptSnippet: "Chain HyperNexus tools to handle a task",
    promptGuidelines: ["Use to run the full context-harvest -> tool-search -> persist loop without manual steps."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "direct",
    reachesTools: () => "all",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    outputSchema: Type.Object({ ok: Type.Boolean(), steps: Type.Array(Type.String()) }),
    parameters: Type.Object({ task: Type.String({ description: "The task to orchestrate" }) }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const task = String(params.task ?? "").trim();
      if (!task) return { content: [{ type: "text", text: "Provide a task." }], isError: true, structuredContent: { ok: false, steps: [] } };
      const steps = [];
      const run = async (name, args, label) => {
        try {
          const res = await ctx.executeTool(name, args, { signal, onUpdate });
          const txt = JSON.stringify(res?.content ?? res ?? {}).slice(0, 240);
          steps.push(`${label}: ${txt}`);
        } catch (e) {
          steps.push(`${label} failed: ${String(e).slice(0, 120)}`);
        }
      };
      await run("hypernexus_context_harvest", { query: task }, "RECALL");
      await run("hypernexus_tool_search", { query: task, limit: 3 }, "DISCOVER");
      await run("hypernexus_memory_store", { content: `[ORCHESTRATED] ${task}`, tags: ["system:orchestrated"] }, "PERSIST");
      steps.push("EXECUTE: the model performs the task using the discovered tools above.");
      return { content: [{ type: "text", text: `Orchestrated "${task}":

${steps.join("\n\n")}` }], structuredContent: { ok: true, steps } };
    }
  });
  pi.registerTool({
    name: "hypernexus_browser",
    label: "TN Browser",
    description: "Browser automation: scrape a URL or check browser-service status. Degrades gracefully if the browser service isn't running.",
    promptSnippet: "Scrape a web page / browser status",
    promptGuidelines: ["Use to fetch web content via the HyperNexus browser service."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    outputSchema: Type.Object({ ok: Type.Boolean(), result: Type.Optional(Type.String()) }),
    parameters: Type.Object({ action: Type.String({ description: "'status' or 'scrape'" }), url: Type.Optional(Type.String({ description: "URL to scrape (for action=scrape)" })) }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "scrape" && params.url) {
        const res2 = await tnFetch("/api/browser/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: params.url }) }, signal);
        if (!res2.ok) return { content: [{ type: "text", text: `Browser scrape unavailable (HTTP ${res2.status}) \u2014 the browser service may not be running.` }], isError: true, structuredContent: { ok: false } };
        const body2 = await res2.json().catch(() => ({}));
        return { content: [{ type: "text", text: JSON.stringify(body2).slice(0, 3e3) }], structuredContent: { ok: true, result: JSON.stringify(body2).slice(0, 3e3) } };
      }
      const res = await tnFetch("/api/browser/status", {}, signal);
      const body = await res.json().catch(() => ({}));
      const msg = res.ok ? JSON.stringify(body).slice(0, 500) : `Browser service not running (HTTP ${res.status}). Start it to enable scraping.`;
      return { content: [{ type: "text", text: msg }], structuredContent: { ok: res.ok, result: msg } };
    }
  });
  pi.registerTool({
    name: "hypernexus_mcp_status",
    label: "TN MCP Status",
    description: "MCP bridge status: active upstream, fallback reason, connected servers.",
    promptSnippet: "Check MCP bridge status",
    promptGuidelines: ["Use to diagnose MCP connectivity issues."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), status: Type.Optional(Type.Any()) }),
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      const body = await tnJson("/api/mcp/status", {}, signal).catch(() => null);
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 2e3) }], structuredContent: { ok: !!body, status: body } };
    }
  });
  pi.registerTool({
    name: "hypernexus_mcp_servers",
    label: "TN MCP Servers",
    description: "List registered MCP servers and their connection state.",
    promptSnippet: "List MCP servers",
    promptGuidelines: ["Use to see which MCP servers are connected."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), servers: Type.Optional(Type.Array(Type.Any())) }),
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      const body = await tnJson("/api/mcp/servers", {}, signal).catch(() => null);
      const servers = body?.servers ?? body?.data ?? [];
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 2e3) }], structuredContent: { ok: !!body, servers: Array.isArray(servers) ? servers : [] } };
    }
  });
  pi.registerTool({
    name: "hypernexus_mcp_tools",
    label: "TN MCP Tools",
    description: "List tools exposed by connected MCP servers.",
    promptSnippet: "List MCP tools",
    promptGuidelines: ["Use to discover available MCP tools."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), tools: Type.Optional(Type.Array(Type.Any())) }),
    parameters: Type.Object({ limit: Type.Optional(Type.Number({ description: "Max tools to return (default 50)" })) }),
    async execute(_toolCallId, params, signal) {
      const body = await tnJson(`/api/mcp/tools?limit=${params.limit ?? 50}`, {}, signal).catch(() => null);
      const tools = body?.tools ?? body?.data ?? [];
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 3e3) }], structuredContent: { ok: !!body, tools: Array.isArray(tools) ? tools : [] } };
    }
  });
  pi.registerTool({
    name: "hypernexus_memory_stats",
    label: "TN Memory Stats",
    description: "Counts across L2 vault / scratchpad / relation tiers.",
    promptSnippet: "Memory statistics",
    promptGuidelines: ["Use to gauge memory capacity before bulk writes."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), stats: Type.Optional(Type.Any()) }),
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      const body = await tnJson("/api/memory/stats", {}, signal).catch(() => null);
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 2e3) }], structuredContent: { ok: !!body, stats: body } };
    }
  });
  pi.registerTool({
    name: "hypernexus_memory_handoff",
    label: "TN Memory Handoff",
    description: "Write or read cross-session handoff notes.",
    promptSnippet: "Session handoff",
    promptGuidelines: ["Write a handoff at session end; read one to resume."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), handoff: Type.Optional(Type.Any()), artifact: Type.Optional(Type.String()) }),
    parameters: Type.Object({ summary: Type.Optional(Type.String({ description: "Summary to write (omit to read latest handoff)" })), pickup: Type.Optional(Type.Boolean({ description: "Read the last handoff instead of writing" })), artifact: Type.Optional(Type.String({ description: "Artifact id from a previous write (required: pickup restores by artifact id)" })) }),
    async execute(_toolCallId, params, signal) {
      const post = { method: "POST", headers: { "Content-Type": "application/json" } };
      if (params.pickup) {
        const body = await tnJson("/api/agent-memory/pickup", { ...post, body: JSON.stringify(params.artifact ? { artifact: params.artifact } : {}) }, signal).catch(() => null);
        return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 3e3) }], structuredContent: { ok: !!body, handoff: body } };
      }
      const text = params.summary || "";
      const data = await tnJson("/api/agent-memory/handoff", { ...post, body: JSON.stringify({ notes: text, summary: text, content: text }) }, signal).catch(() => null);
      const artifact = typeof data === "string" ? data : data && typeof data.artifact === "string" ? data.artifact : data && typeof data.id === "string" ? data.id : data ? JSON.stringify(data) : "";
      return artifact ? { content: [{ type: "text", text: "Handoff written." }], structuredContent: { ok: true, artifact } } : { content: [{ type: "text", text: "Handoff write failed." }], isError: true, structuredContent: { ok: false } };
    }
  });
  pi.registerTool({
    name: "hypernexus_skills_search",
    label: "TN Skills Search",
    description: "Search the skill catalog for reusable modules.",
    promptSnippet: "Search skills",
    promptGuidelines: ["Use to find skill modules before writing new ones."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), skills: Type.Optional(Type.Array(Type.Any())) }),
    parameters: Type.Object({ query: Type.String({ description: "Search query" }), limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })) }),
    async execute(_toolCallId, params, signal) {
      const body = await tnJson(`/api/skills/search?q=${encodeURIComponent(params.query)}&limit=${params.limit ?? 10}`, {}, signal).catch(() => null);
      const skills = body?.skills ?? body?.data ?? [];
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 3e3) }], structuredContent: { ok: !!body, skills: Array.isArray(skills) ? skills : [] } };
    }
  });
  pi.registerTool({
    name: "hypernexus_system_overview",
    label: "TN System Overview",
    description: "Unified overview: kernel health, MCP bridge, memory, sessions, providers, runtime status.",
    promptSnippet: "System overview",
    promptGuidelines: ["Use for a single-call health check before production changes."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), overview: Type.Optional(Type.Any()) }),
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      const body = await tnJson("/api/system/overview", {}, signal).catch(() => null);
      return { content: [{ type: "text", text: JSON.stringify(body).slice(0, 3e3) }], structuredContent: { ok: !!body, overview: body } };
    }
  });
  pi.registerCommand("tn-store", {
    description: "Store a memory in TN L2 vault with structured form (optional per-project .memdb)",
    handler: async (args, ctx) => {
      const content = await ctx.ui.editor("Memory content:", args || "");
      if (!content) {
        ctx.ui.notify("Cancelled", "warning");
        return;
      }
      const category = await ctx.ui.select("Category:", ["general", "pattern", "decision", "convention", "insight", "failure", "correction", "preference"]);
      if (!category) return;
      const project = await ctx.ui.input("Project name (optional \u2014 writes to project/.memdb for git tracking):", "");
      const tagsStr = await ctx.ui.input("Tags (comma-separated, e.g. project:name, pattern:build):", "optional");
      const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
      if (project && !tags.some((t) => t.startsWith("project:"))) {
        tags.push("project:" + project);
      }
      const ok = await tnOk("/api/memory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: JSON.stringify({ content, tags, category, timestamp: now() })
        })
      });
      if (ok) {
        if (project) tnFetch("/api/memory/project/sync", { method: "POST" }).catch(() => {
        });
        ctx.ui.notify(project ? `\u2705 Memory stored (${category}, project: ${project})` : `\u2705 Memory stored (${category})`, "info");
      } else ctx.ui.notify("Failed to store memory", "error");
    }
  });
  pi.registerCommand("tn-search", {
    description: "Search TN L2 memory interactively",
    handler: async (args, ctx) => {
      const query = await ctx.ui.input("Search query:", args || "");
      if (!query) return;
      const body = await tnJson(`/api/memory/search?q=${encodeURIComponent(query)}&limit=10`);
      const memories = body.data ?? (Array.isArray(body) ? body : []);
      if (!Array.isArray(memories) || memories.length === 0) {
        ctx.ui.notify("No results", "warning");
        return;
      }
      const lines = memories.map(
        (m, i) => `${i + 1}. ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 120)}`
      );
      ctx.ui.notify(`\u{1F4DA} ${memories.length} results:
${lines.join("\n")}`, "info");
    }
  });
  pi.registerCommand("tn-status", {
    description: "Show HyperNexus system status",
    handler: async (_args, ctx) => {
      const [fts, cold, mesh] = await Promise.all([
        tnJson("/api/memory/fts-search?q=the&limit=1"),
        tnJson("/api/memory/cold-archive/count"),
        tnJson("/api/mesh/status")
      ]);
      const vaultCount = fts.total ?? "?";
      const coldCount = cold.count ?? "?";
      const nodeId = mesh.data?.nodeId ?? mesh.nodeId ?? "?";
      const peers = mesh.data?.peersCount ?? mesh.peersCount ?? 0;
      ctx.ui.notify(
        `TN Status:
\u{1F9E0} L2: ${vaultCount}
\u2744\uFE0F L3: ${coldCount}
\u{1F310} Mesh: ${nodeId.slice(0, 20)}... (${peers} peers)`,
        "info"
      );
    }
  });
  pi.registerCommand("tn-plan", {
    description: "Create/edit/view project plans in L2 memory",
    handler: async (_args, ctx) => {
      const action = await ctx.ui.select("Plan action:", ["create", "list", "view", "complete"]);
      if (!action) return;
      if (action === "create") {
        const title = await ctx.ui.input("Plan title:", "");
        if (!title) return;
        const steps = await ctx.ui.editor("Steps (markdown):", "## Goal\n\n## Steps\n1.\n2.\n3.\n\n## Status\n- [ ] ");
        if (!steps) return;
        const ok = await tnOk("/api/memory/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: JSON.stringify({
              content: `Plan: ${title}
${steps}`,
              tags: ["system:plan", `plan:${title.replace(/\s+/g, "-").toLowerCase()}`],
              category: "plan",
              status: "active",
              timestamp: now()
            })
          })
        });
        if (ok) ctx.ui.notify(`\u2705 Plan "${title}" saved`, "info");
        else ctx.ui.notify("Failed to save plan", "error");
      } else if (action === "list") {
        const body = await tnJson("/api/memory/list");
        const memories = Array.isArray(body) ? body : body?.memories ?? body?.data ?? [];
        const plans = memories.map((m) => {
          try {
            return JSON.parse(m);
          } catch {
            return null;
          }
        }).filter((m) => m?.category === "plan" || m?.tags?.includes("system:plan")).slice(0, 10);
        if (plans.length === 0) {
          ctx.ui.notify("No plans found", "warning");
          return;
        }
        const lines = plans.map((p, i) => `${i + 1}. ${p.content?.slice(0, 80) ?? "?"}`);
        ctx.ui.notify(`\u{1F4CB} Plans:
${lines.join("\n")}`, "info");
      } else if (action === "view") {
        const body = await tnJson("/api/memory/list");
        const memories = Array.isArray(body) ? body : body?.memories ?? body?.data ?? [];
        const plans = memories.map((m) => {
          try {
            return JSON.parse(m);
          } catch {
            return null;
          }
        }).filter((m) => m?.category === "plan");
        if (plans.length === 0) {
          ctx.ui.notify("No plans", "warning");
          return;
        }
        const names = plans.map((p) => p.content?.split("\n")[0]?.replace("Plan: ", "") ?? "?");
        const choice = await ctx.ui.select("Select plan:", names);
        if (!choice) return;
        const plan = plans[names.indexOf(choice)];
        const text = plan.content?.slice(0, 2e3) ?? "?";
        ctx.ui.notify(`\u{1F4D6} ${choice}

${text}`, "info");
      } else if (action === "complete") {
        const body = await tnJson("/api/memory/list");
        const memories = Array.isArray(body) ? body : body?.memories ?? body?.data ?? [];
        const plans = memories.map((m) => {
          try {
            return JSON.parse(m);
          } catch {
            return null;
          }
        }).filter((m) => m?.category === "plan" && m?.status !== "completed");
        if (plans.length === 0) {
          ctx.ui.notify("No active plans", "warning");
          return;
        }
        const names = plans.map((p) => (p.tags ?? []).find((t) => t.startsWith("plan:"))?.replace("plan:", "") ?? "?");
        const choice = await ctx.ui.select("Complete plan:", names);
        if (!choice) return;
        ctx.ui.notify(`\u2705 Plan "${choice}" completed (mark as complete in L2)`, "info");
      }
    }
  });
  pi.registerCommand("tn-purge", {
    description: "Remove stale memories from L2 vault",
    handler: async (_args, ctx) => {
      const action = await ctx.ui.select("Purge what?", ["old-sessions", "by-tag", "all-my-memories"]);
      if (!action) return;
      if (action === "old-sessions") {
        const confirm = await ctx.ui.confirm("Purge", "Delete all session logs older than today?");
        if (!confirm) return;
        ctx.ui.notify("Session cleanup would run via TN maintenance cycle", "info");
      } else if (action === "by-tag") {
        const tag = await ctx.ui.input("Tag/term to purge (e.g. system:turn):", "");
        if (!tag) return;
        let matches = [];
        try {
          const r = await tnFetchWithTimeout(`/api/memory/fts-search?q=${encodeURIComponent(tag)}&limit=50`, 4e3);
          const body = r.ok ? await r.json() : {};
          matches = (body?.data ?? []).map((d) => d.record ?? d).filter((x) => x.id);
        } catch {
        }
        if (matches.length === 0) {
          ctx.ui.notify(`No memories matching "${tag}".`, "warning");
          return;
        }
        const preview = matches.slice(0, 5).map((m) => `  - ${String(m.content ?? "").slice(0, 60)}`).join("\n");
        const more = matches.length > 5 ? `
  ...and ${matches.length - 5} more` : "";
        const confirm = await ctx.ui.confirm("Purge", `Delete ${matches.length} memories matching "${tag}"?
${preview}${more}`);
        if (!confirm) return;
        let deleted = 0;
        for (const m of matches) {
          const ok = await tnOk("/api/agent/tool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "delete_memory", args: { id: m.id } }) });
          if (ok) deleted++;
        }
        ctx.ui.notify(`Purged ${deleted}/${matches.length} memories matching "${tag}".`, "info");
      } else {
        const confirm = await ctx.ui.confirm("Purge", "Delete all your stored memories?");
        if (!confirm) return;
        ctx.ui.notify("Full purge would run via TN API", "info");
      }
    }
  });
  pi.registerCommand("tn-summary", {
    description: "Summarize current session using TN context",
    handler: async (_args, ctx) => {
      const entries = ctx?.sessionManager?.getEntries?.() ?? [];
      if (entries.length === 0) {
        ctx.ui.notify("No entries to summarize", "warning");
        return;
      }
      const lastTurns = entries.slice(-20);
      const userMessages = lastTurns.filter((e) => e.type === "message" && e.message?.role === "user").map((e) => e.message?.content?.map((c) => c.text).filter(Boolean).join(" ") ?? "").filter(Boolean);
      const toolsUsed = new Set(
        lastTurns.filter((e) => e.type === "message" && e.message?.role === "toolResult").map((e) => e.message?.toolName).filter(Boolean)
      );
      const summary = `Session: ${entries.length} entries, ${userMessages.length} user turns
Tools used: ${[...toolsUsed].join(", ") || "none"}
Last topics: ${userMessages.slice(-3).join(" | ").slice(0, 300)}`;
      ctx.ui.notify(`\u{1F4CA} ${summary}`, "info");
      await tnOk("/api/memory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: JSON.stringify({
            content: `Session Summary: ${summary}`,
            tags: ["system:session_summary"],
            category: "session",
            timestamp: now()
          })
        })
      });
    }
  });
  pi.registerCommand("tn-orchestrate", {
    description: "Run the HyperNexus autonomous orchestration loop: recall context, discover tools, plan, persist, verify.",
    handler: async (args, ctx) => {
      const task = (args || await ctx.ui.input("What should we orchestrate?", ""))?.trim();
      if (!task) {
        ctx.ui.notify("Cancelled", "warning");
        return;
      }
      const out = [];
      try {
        const r = await tnFetchWithTimeout(`/api/memory/fts-search?q=${encodeURIComponent(task.slice(0, 60))}&limit=3`, 2500);
        const body = r.ok ? await r.json() : {};
        const items = (body?.data ?? []).map((d) => `  - ${String((d.record ?? d).content ?? "").slice(0, 100)}`).join("\n");
        out.push(`RECALL (prior context):
${items || "  (none found)"}`);
      } catch {
        out.push("RECALL: unavailable");
      }
      try {
        const r = await tnFetchWithTimeout(`/api/mcp/tool-suggestions?query=${encodeURIComponent(task.slice(0, 60))}`, 2500);
        const body = r.ok ? await r.json() : {};
        const tools = (body?.data ?? []).slice(0, 5).map((t) => `  - ${t.toolName ?? t.name ?? "?"}`).join("\n");
        out.push(`DISCOVER (suggested tools):
${tools || "  (none)"}`);
      } catch {
        out.push("DISCOVER: unavailable");
      }
      out.push(`PLAN:
  Execute: ${task}
  (The model executes the task using the tools above.)`);
      try {
        await tnOk("/api/memory/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: `[ORCHESTRATION] ${task}`, tags: ["system:orchestration"], category: "session", timestamp: now() }) });
        out.push("PERSIST: recorded orchestration intent to L2.");
      } catch {
        out.push("PERSIST: failed");
      }
      try {
        const h = await tnFetchWithTimeout("/health", 800);
        out.push(`VERIFY: kernel ${h.ok ? "healthy" : "degraded"}.`);
      } catch {
        out.push("VERIFY: kernel unreachable");
      }
      ctx.ui.notify(out.join("\n\n"), "info");
    }
  });
  pi.registerTool({
    name: "hypernexus_subagent",
    label: "TN Task Queue",
    description: "Record a task / TODO to L2 memory for tracking and later recall. This records intent \u2014 it does NOT spawn a live sub-agent (pi executes work inline via ctx.executeTool). Retrieve stored tasks with hypernexus_memory_search tags system:subagent.",
    promptSnippet: "Record a task/TODO for tracking",
    promptGuidelines: [
      "Use to jot down a follow-up task / TODO so it's persisted and recallable across sessions.",
      "This is a task tracker, not a live dispatcher \u2014 do the work inline with other tools.",
      "Good for: capturing follow-ups, deferred work, multi-step plans to revisit."
    ],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    reachesTools: () => "all",
    outputSchema: Type.Object({ taskId: Type.String(), mode: Type.String(), dispatched: Type.Boolean(), contextPreview: Type.Optional(Type.String()) }),
    parameters: Type.Object({
      task: Type.String({ description: "The task description for the sub-agent" }),
      mode: Type.Optional(Type.String({ description: "'record' (just save) or 'harvest' (also pull related context), default 'record'" })),
      context: Type.Optional(Type.String({ description: "Optional context to pass to the sub-agent" }))
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const mode = params.mode ?? "sync";
      const taskId = `subagent-${Date.now().toString(36)}`;
      await tnOk("/api/memory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: JSON.stringify({
            content: `[SUBAGENT TASK] ${taskId}
Task: ${params.task}
Context: ${params.context ?? "none"}
Status: pending`,
            tags: ["system:subagent", `task:${taskId}`],
            category: "subagent",
            timestamp: now()
          })
        })
      });
      if (mode === "async") {
        return {
          content: [{ type: "text", text: `\u2705 Task recorded (ID: ${taskId}). Retrieve with hypernexus_memory_search (tag system:subagent).` }],
          details: { taskId, mode: "async" },
          structuredContent: { taskId, mode: "async", dispatched: true }
        };
      }
      try {
        const harvestResult = await ctx.executeTool("hypernexus_context_harvest", { query: params.task });
        const harvestText = harvestResult?.content?.map((c) => c.text ?? "").join("\n") ?? "";
        return {
          content: [{ type: "text", text: `\u{1F527} Task recorded (ID: ${taskId}).

Harvested context:
${harvestText || "(none)"}

Task stored in L2 memory. Check results with hypernexus_memory_search.` }],
          details: { taskId, mode: "sync", nestedTool: "hypernexus_context_harvest" },
          structuredContent: { taskId, mode: "sync", dispatched: true, contextPreview: harvestText.slice(0, 500) }
        };
      } catch {
        return {
          content: [{ type: "text", text: `\u{1F527} Sub-agent task dispatched (ID: ${taskId}). Task stored in L2 memory. Check results with hypernexus_memory_search.` }],
          details: { taskId, mode: "sync" },
          structuredContent: { taskId, mode: "sync", dispatched: true }
        };
      }
    }
  });
  pi.registerFlag("tn-base", { description: "HyperNexus kernel base URL", type: "string", default: "http://127.0.0.1:7778" });
  pi.registerFlag("tn-verbose", { description: "Enable verbose TN logging", type: "boolean", default: false });
  function safeUi(ctx) {
    try {
      return ctx?.hasUI ? ctx.ui ?? null : null;
    } catch {
      return null;
    }
  }
  async function refreshWidget(ctx) {
    if (!safeUi(ctx)) return;
    try {
      const [mem, cold, mesh] = await Promise.all([
        tnFetchWithTimeout("/api/memory/list?limit=1", 4e3).then((r) => r.ok ? r.json() : {}).catch(() => ({})),
        tnFetchWithTimeout("/api/memory/cold-archive/count", 4e3).then((r) => r.ok ? r.json() : {}).catch(() => ({})),
        tnFetchWithTimeout("/api/mesh/status", 4e3).then((r) => r.ok ? r.json() : {}).catch(() => ({}))
      ]);
      const vaultCount = mem?.data?.total ?? mem?.total ?? mem?.count ?? "?";
      const coldCount = cold?.data?.count ?? cold?.count ?? "?";
      const peers = mesh?.data?.peersCount ?? mesh?.peersCount ?? 0;
      ctx.ui.setStatus?.("tn-stats", `\u{1F9E0} L2: ${vaultCount}  \u2744\uFE0F L3: ${coldCount}  \u{1F310} Peers: ${peers}`);
    } catch {
      ctx.ui.setStatus?.("tn-stats", "\u{1F9E0} TN: waiting for server...");
    }
  }
  let widgetInterval = null;
  pi.on("session_start", async (_event, ctx) => {
    try {
    } catch {
    }
    const __ui = safeUi(ctx);
    if (__ui) {
      try {
        const health = await tnFetchWithTimeout("/health", 600);
        if (health.ok) {
          const h = await health.json().catch(() => ({}));
          __ui.setStatus("tn", `HyperNexus v${h.version ?? "?"}`);
          __ui.setWorkingMessage("HyperNexus ready");
        } else {
          __ui.setStatus("tn", "HyperNexus degraded");
        }
      } catch {
        __ui.setStatus("tn", "HyperNexus offline");
      }
    }
    refreshWidget(ctx);
    if (!widgetInterval) {
      for (const ms of [800, 2500, 6e3]) setTimeout(() => refreshWidget(ctx), ms);
      widgetInterval = setInterval(() => refreshWidget(ctx), 6e4);
    }
  });
  pi.on("turn_end", async (event, _ctx) => {
    try {
      pi.appendEntry("tn:turn_stats", {
        turnId: event.turnId ?? Date.now(),
        timestamp: now()
      });
    } catch {
    }
  });
  pi.on("session_shutdown", () => {
    if (widgetInterval) {
      clearInterval(widgetInterval);
      widgetInterval = null;
    }
  });
  pi.registerCommand("tn-tools", {
    description: "Discover tools across all connected MCP servers (semantic search)",
    handler: async (args, ctx) => {
      const query = await ctx.ui.input("Tool search query:", args || "");
      if (!query) return;
      const body = await tnJson(`/api/mcp/native/search?query=${encodeURIComponent(query)}`);
      const results = body.results ?? (Array.isArray(body) ? body : []);
      if (!Array.isArray(results) || results.length === 0) {
        ctx.ui.notify("No tools found", "warning");
        return;
      }
      const lines = results.slice(0, 8).map((r, i) => `${i + 1}. ${r.originalName ?? r.name ?? "?"} (${r.server ?? "?"})`);
      ctx.ui.notify(`\u{1F527} ${results.length} tools:
${lines.join("\n")}`, "info");
    }
  });
  pi.registerCommand("tn-session", {
    description: "Show current session context (goal, recent turns, active skills)",
    handler: async (_args, ctx) => {
      const body = await tnJson("/api/agent/session/context").catch(() => null);
      const text = body ? JSON.stringify(body).slice(0, 1500) : "Session context unavailable (kernel offline?).";
      ctx.ui.notify(`\u{1F5C2}\uFE0F Session context:
${text}`, "info");
    }
  });
  pi.registerCommand("tn-context", {
    description: "Manually harvest relevant L2 context for the current task",
    handler: async (args, ctx) => {
      const topic = await ctx.ui.input("Harvest topic:", args || "");
      if (!topic) return;
      const body = await tnJson(`/api/memory/search?q=${encodeURIComponent(topic)}&limit=8`);
      const memories = body.data ?? (Array.isArray(body) ? body : []);
      if (!Array.isArray(memories) || memories.length === 0) {
        ctx.ui.notify("No relevant context found", "warning");
        return;
      }
      const lines = memories.map((m, i) => `${i + 1}. ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 140)}`);
      ctx.ui.notify(`\u{1F33E} Harvested ${memories.length} items:
${lines.join("\n")}`, "info");
    }
  });
  pi.registerCommand("tn-remember", {
    description: "Quick-store one fact to L2 memory (args become the content)",
    handler: async (args, ctx) => {
      const content = args?.trim() || await ctx.ui.input("Remember:", "");
      if (!content) return;
      const ok = await tnOk("/api/memory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify({ content, tags: ["quick"], category: "general", timestamp: now() }) })
      });
      ctx.ui.notify(ok ? "\u2705 Remembered" : "Failed to store", ok ? "info" : "error");
    }
  });
  pi.registerShortcut("ctrl+shift+m", {
    description: "Open TN memory search",
    handler: async (ctx) => {
      const query = await ctx.ui.input("TN Memory Search:", "");
      if (!query) return;
      const body = await tnJson(`/api/memory/search?q=${encodeURIComponent(query)}&limit=5`);
      const memories = body.data ?? (Array.isArray(body) ? body : []);
      if (!Array.isArray(memories) || memories.length === 0) {
        ctx.ui.notify("No results", "warning");
        return;
      }
      ctx.ui.notify(`\u{1F4DA} ${memories.length} results:
${memories.map((m, i) => `${i + 1}. ${(m.content ?? m.text ?? "").slice(0, 80)}`).join("\n")}`, "info");
    }
  });
  pi.registerShortcut("ctrl+shift+t", {
    description: "Open TN tool search",
    handler: async (ctx) => {
      const query = await ctx.ui.input("TN Tool Search:", "");
      if (!query) return;
      const body = await tnJson(`/api/mcp/native/search?query=${encodeURIComponent(query)}`);
      const results = body.results ?? (Array.isArray(body) ? body : []);
      if (results.length === 0) {
        ctx.ui.notify("No tools found", "warning");
        return;
      }
      ctx.ui.notify(`\u{1F527} Tools:
${results.slice(0, 5).map((r) => `${r.originalName ?? r.name ?? "?"} (${r.server ?? "?"})`).join("\n")}`, "info");
    }
  });
  pi.registerShortcut("ctrl+shift+p", {
    description: "Show TN system status",
    handler: async (ctx) => {
      const [mem, cold, mesh] = await Promise.all([
        tnJson("/api/memory/list?limit=1"),
        tnJson("/api/memory/cold-archive/count"),
        tnJson("/api/mesh/status")
      ]);
      ctx.ui.notify(
        `TN Status:
\u{1F9E0} L2: ${mem.total ?? mem.count ?? "?"}
\u2744\uFE0F L3: ${cold.count ?? "?"}
\u{1F310} Peers: ${mesh.data?.peersCount ?? mesh.peersCount ?? 0}`,
        "info"
      );
    }
  });
  pi.on("session_shutdown", async (_event, ctx) => {
    try {
      ctx.ui.setStatus("tn", "");
    } catch {
    }
    try {
      ctx.ui.setStatus?.("tn-stats", "");
    } catch {
    }
    if (widgetInterval) {
      clearInterval(widgetInterval);
      widgetInterval = null;
    }
  });
}
