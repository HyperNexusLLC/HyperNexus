import pathlib, sys

p = pathlib.Path(r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts")
src = p.read_text(encoding="utf-8")
orig = src

# Each edit: (old_exact, new_exact, label)
edits = []

# ── 1. MCP server: deferred exposure so catalog tools ride tool_search + codemode
#       (50K->5K progressive routing: discoverable, callable, but not in model schema)
edits.append((
    '''    pi.registerMcpServer("hypernexus-kernel", {
      url: "http://127.0.0.1:7778/mcp",
    } as any);''',
    '''    pi.registerMcpServer("hypernexus-kernel", {
      url: "http://127.0.0.1:7778/mcp",
      // deferred: callable from codemode scripts AND loadable by tool_search for the
      // model, but not declared up front. This is the 50K->5K progressive-routing vehicle.
      exposure: "deferred",
    } as any);''',
    "mcp-server deferred exposure",
))

# ── 2. memory_vector_search: outputSchema + structuredContent
edits.append((
    '''    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    parameters: Type.Object({ query: Type.String({ description: "Natural language query" }), limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })) }),''',
    '''    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ count: Type.Number(), memories: Type.Array(Type.Object({ content: Type.String() })) }),
    parameters: Type.Object({ query: Type.String({ description: "Natural language query" }), limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })) }),''',
    "vector_search outputSchema",
))

edits.append((
    '''      const res = await tnFetch(`/api/memory/search?q=${encodeURIComponent(params.query)}`, {}, signal);
      if (!res.ok) return { content: [{ type: "text", text: "Search unavailable." }], isError: true };
      const body = await res.json();
      const data = body.data ?? body;
      if (Array.isArray(data) && data.length > 0) {
        const results = data.slice(0, limit);
        const formatted = results.map((r: any, i: number) => `  ${i + 1}. ${(r.content ?? r.text ?? JSON.stringify(r)).slice(0, 200)}`).join("\\n\\n");
        return { content: [{ type: "text", text: `🧠 ${data.length} results:\\n\\n${formatted}` }] };
      }
      return { content: [{ type: "text", text: `No results for "${params.query}".` }] };''',
    '''      const res = await tnFetch(`/api/memory/search?q=${encodeURIComponent(params.query)}`, {}, signal);
      if (!res.ok) return { content: [{ type: "text", text: "Search unavailable." }], isError: true, structuredContent: { count: 0, memories: [] } };
      const body = await res.json();
      const data = body.data ?? body;
      if (Array.isArray(data) && data.length > 0) {
        const results = data.slice(0, limit);
        const memories = results.map((r: any) => ({ content: r.content ?? r.text ?? JSON.stringify(r) }));
        const formatted = memories.map((m: any, i: number) => `  ${i + 1}. ${m.content.slice(0, 200)}`).join("\\n\\n");
        return { content: [{ type: "text", text: `🧠 ${data.length} results:\\n\\n${formatted}` }], structuredContent: { count: memories.length, memories } };
      }
      return { content: [{ type: "text", text: `No results for "${params.query}".` }], structuredContent: { count: 0, memories: [] } };''',
    "vector_search structuredContent",
))

# ── 3. tool_search: reachesTools + outputSchema + structuredContent
edits.append((
    '''    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    parameters: Type.Object({ query: Type.String({ description: "Natural language description of what you need" }), limit: Type.Optional(Type.Number({ description: "Max results (default 5)" })) }),''',
    '''    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    reachesTools: () => "all" as const,
    outputSchema: Type.Object({ count: Type.Number(), tools: Type.Array(Type.Object({
      name: Type.String(), server: Type.Optional(Type.String()),
      score: Type.Optional(Type.Number()), description: Type.Optional(Type.String()),
    })) }),
    parameters: Type.Object({ query: Type.String({ description: "Natural language description of what you need" }), limit: Type.Optional(Type.Number({ description: "Max results (default 5)" })) }),''',
    "tool_search reachesTools+outputSchema",
))

edits.append((
    '''      const results = data.results ?? (Array.isArray(data) ? data : []);
      if (results.length === 0) return { content: [{ type: "text", text: `No tools for "${params.query}".` }] };
      const limit = params.limit ?? 5;
      const formatted = results.slice(0, limit).map((r: any) =>
        `  [${r.score ?? "?"}] ${r.originalName ?? r.name ?? "?"} (${r.server ?? "?"})\\n         ${(r.description ?? "").slice(0, 150).replace(/\\n/g, " ")}`
      ).join("\\n\\n");
      return { content: [{ type: "text", text: `🔧 Top tools:\\n\\n${formatted}` }] };''',
    '''      const results = data.results ?? (Array.isArray(data) ? data : []);
      if (results.length === 0) return { content: [{ type: "text", text: `No tools for "${params.query}".` }], structuredContent: { count: 0, tools: [] } };
      const limit = params.limit ?? 5;
      const tools = results.slice(0, limit).map((r: any) => ({
        name: r.originalName ?? r.name ?? "?",
        server: r.server,
        score: typeof r.score === "number" ? r.score : undefined,
        description: r.description,
      }));
      const formatted = tools.map((t: any) =>
        `  [${t.score ?? "?"}] ${t.name} (${t.server ?? "?"})\\n         ${(t.description ?? "").slice(0, 150).replace(/\\n/g, " ")}`
      ).join("\\n\\n");
      return { content: [{ type: "text", text: `🔧 Top tools:\\n\\n${formatted}` }], structuredContent: { count: tools.length, tools } };''',
    "tool_search structuredContent",
))

# ── 4. session_search: outputSchema + structuredContent
edits.append((
    '''    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    parameters: Type.Object({
      action: Type.String({ description: "'list' | 'get' | 'stats'" }),''',
    '''    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ action: Type.String(), count: Type.Number(), items: Type.Array(Type.Record(Type.String(), Type.Any())) }),
    parameters: Type.Object({
      action: Type.String({ description: "'list' | 'get' | 'stats'" }),''',
    "session_search outputSchema",
))

edits.append((
    '''      if (params.action === "stats") {
        const data = await tnJson("/api/sessions/imported/maintenance-stats", {}, signal);
        return { content: [{ type: "text", text: `📊 Stats:\\nTotal: ${data.totalSessions ?? "?"}\\nArchived: ${data.archivedTranscriptCount ?? "?"}` }] };
      }
      if (params.action === "get") {
        if (!params.id) return { content: [{ type: "text", text: "Provide 'id'." }] };
        const data = await tnJson(`/api/sessions/imported/get?id=${encodeURIComponent(params.id)}`, {}, signal);
        const summary = data.transcript ? data.transcript.slice(0, 2000) : JSON.stringify(data).slice(0, 2000);
        return { content: [{ type: "text", text: `📝 Session:\\n\\n${summary}` }] };
      }
      const limit = params.limit ?? 10;
      const data = await tnJson(`/api/sessions/imported/list?limit=${limit}`, {}, signal);
      let sessions: any[] = Array.isArray(data) ? data : [];
      if (params.sourceTool) sessions = sessions.filter((s: any) => s.sourceTool === params.sourceTool);
      if (sessions.length === 0) return { content: [{ type: "text", text: "No sessions found." }] };
      const formatted = sessions.slice(0, limit).map((s: any, i: number) =>
        `${i + 1}. [${s.valid !== false ? "✅" : "❌"}] ${s.sourceTool ?? "?"} (${s.sessionFormat ?? "?"})`
      ).join("\\n");
      return { content: [{ type: "text", text: `📋 Sessions:\\n\\n${formatted}` }] };''',
    '''      if (params.action === "stats") {
        const data = await tnJson("/api/sessions/imported/maintenance-stats", {}, signal);
        return { content: [{ type: "text", text: `📊 Stats:\\nTotal: ${data.totalSessions ?? "?"}\\nArchived: ${data.archivedTranscriptCount ?? "?"}` }], structuredContent: { action: "stats", count: 1, items: [data] } };
      }
      if (params.action === "get") {
        if (!params.id) return { content: [{ type: "text", text: "Provide 'id'." }], structuredContent: { action: "get", count: 0, items: [] } };
        const data = await tnJson(`/api/sessions/imported/get?id=${encodeURIComponent(params.id)}`, {}, signal);
        const summary = data.transcript ? data.transcript.slice(0, 2000) : JSON.stringify(data).slice(0, 2000);
        return { content: [{ type: "text", text: `📝 Session:\\n\\n${summary}` }], structuredContent: { action: "get", count: 1, items: [data] } };
      }
      const limit = params.limit ?? 10;
      const data = await tnJson(`/api/sessions/imported/list?limit=${limit}`, {}, signal);
      let sessions: any[] = Array.isArray(data) ? data : [];
      if (params.sourceTool) sessions = sessions.filter((s: any) => s.sourceTool === params.sourceTool);
      if (sessions.length === 0) return { content: [{ type: "text", text: "No sessions found." }], structuredContent: { action: "list", count: 0, items: [] } };
      const listed = sessions.slice(0, limit);
      const formatted = listed.map((s: any, i: number) =>
        `${i + 1}. [${s.valid !== false ? "✅" : "❌"}] ${s.sourceTool ?? "?"} (${s.sessionFormat ?? "?"})`
      ).join("\\n");
      return { content: [{ type: "text", text: `📋 Sessions:\\n\\n${formatted}` }], structuredContent: { action: "list", count: listed.length, items: listed } };''',
    "session_search structuredContent",
))

# ── 5. skill_manage: outputSchema + structuredContent
edits.append((
    '''    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    parameters: Type.Object({
      action: Type.String({ description: "'list' | 'search' | 'read' | 'create'" }),''',
    '''    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ action: Type.String(), count: Type.Number(), items: Type.Array(Type.Record(Type.String(), Type.Any())) }),
    parameters: Type.Object({
      action: Type.String({ description: "'list' | 'search' | 'read' | 'create'" }),''',
    "skill_manage outputSchema",
))

edits.append((
    '''        const icon = params.action === "search" ? "🔍" : "📚";
        return { content: [{ type: "text", text: `${icon} ${filtered.length} skills:\\n${filtered.slice(0, limit).map((s: any, i: number) => `  ${i + 1}. ${s.id ?? s.name}`).join("\\n")}` }] };
      }
      if (params.action === "read") {
        if (!params.id) return { content: [{ type: "text", text: "Provide 'id'." }] };
        const body = await tnJson(`/api/skills/read?name=${encodeURIComponent(params.id)}`, {}, signal);
        const text = typeof body.content === "string" ? body.content : JSON.stringify(body).slice(0, 3000);
        return { content: [{ type: "text", text: `📖 ${params.id}\\n\\n${text.slice(0, 3000)}` }] };
      }
      if (params.action === "create") {
        if (!params.id || !params.content) return { content: [{ type: "text", text: "Provide 'id' and 'content'." }] };
        const ok = await tnOk("/api/skills/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: params.id, name: params.id, content: params.content }) }, signal);
        return ok
          ? { content: [{ type: "text", text: `✅ Skill '${params.id}' created.` }] }
          : { content: [{ type: "text", text: "Failed to create skill." }], isError: true };
      }
      return { content: [{ type: "text", text: "Usage: action='list'|'search'|'read'|'create'" }] };''',
    '''        const icon = params.action === "search" ? "🔍" : "📚";
        const shown = filtered.slice(0, limit);
        return { content: [{ type: "text", text: `${icon} ${filtered.length} skills:\\n${shown.map((s: any, i: number) => `  ${i + 1}. ${s.id ?? s.name}`).join("\\n")}` }], structuredContent: { action: params.action, count: shown.length, items: shown } };
      }
      if (params.action === "read") {
        if (!params.id) return { content: [{ type: "text", text: "Provide 'id'." }], structuredContent: { action: "read", count: 0, items: [] } };
        const body = await tnJson(`/api/skills/read?name=${encodeURIComponent(params.id)}`, {}, signal);
        const text = typeof body.content === "string" ? body.content : JSON.stringify(body).slice(0, 3000);
        return { content: [{ type: "text", text: `📖 ${params.id}\\n\\n${text.slice(0, 3000)}` }], structuredContent: { action: "read", count: 1, items: [{ id: params.id, content: text }] } };
      }
      if (params.action === "create") {
        if (!params.id || !params.content) return { content: [{ type: "text", text: "Provide 'id' and 'content'." }], structuredContent: { action: "create", count: 0, items: [] } };
        const ok = await tnOk("/api/skills/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: params.id, name: params.id, content: params.content }) }, signal);
        return ok
          ? { content: [{ type: "text", text: `✅ Skill '${params.id}' created.` }], structuredContent: { action: "create", count: 1, items: [{ id: params.id, created: true }] } }
          : { content: [{ type: "text", text: "Failed to create skill." }], isError: true, structuredContent: { action: "create", count: 0, items: [] } };
      }
      return { content: [{ type: "text", text: "Usage: action='list'|'search'|'read'|'create'" }], structuredContent: { action: "usage", count: 0, items: [] } };''',
    "skill_manage structuredContent",
))

# ── 6. code_search: outputSchema + structuredContent
edits.append((
    '''    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      mode: Type.Optional(Type.String({ description: "'ast' | 'semantic' | 'pattern'" })),''',
    '''    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ count: Type.Number(), tools: Type.Array(Type.Object({
      name: Type.String(), server: Type.Optional(Type.String()), score: Type.Optional(Type.Number()),
    })) }),
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      mode: Type.Optional(Type.String({ description: "'ast' | 'semantic' | 'pattern'" })),''',
    "code_search outputSchema",
))

edits.append((
    '''      const results = (body.data ?? body).results ?? [];
      const top = results.slice(0, limit);
      if (top.length === 0) return { content: [{ type: "text", text: `No results for "${params.query}".` }] };
      const formatted = top.map((r: any) =>
        `  [${r.score ?? "?"}] ${r.originalName ?? r.name ?? "?"} (${r.server ?? "?"})\\n         ${(r.description ?? "").slice(0, 120)}`
      ).join("\\n\\n");
      return { content: [{ type: "text", text: `🔧 Tools: "${params.query}":\\n\\n${formatted}` }] };''',
    '''      const results = (body.data ?? body).results ?? [];
      const top = results.slice(0, limit);
      if (top.length === 0) return { content: [{ type: "text", text: `No results for "${params.query}".` }], structuredContent: { count: 0, tools: [] } };
      const tools = top.map((r: any) => ({
        name: r.originalName ?? r.name ?? "?",
        server: r.server,
        score: typeof r.score === "number" ? r.score : undefined,
      }));
      const formatted = tools.map((t: any) =>
        `  [${t.score ?? "?"}] ${t.name} (${t.server ?? "?"})`
      ).join("\\n\\n");
      return { content: [{ type: "text", text: `🔧 Tools: "${params.query}":\\n\\n${formatted}` }], structuredContent: { count: tools.length, tools } };''',
    "code_search structuredContent",
))

# ── 7. context_harvest: outputSchema + structuredContent
edits.append((
    '''    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    parameters: Type.Object({
      query: Type.String({ description: "What you're working on" }),
      harvestMemory: Type.Optional(Type.Boolean({ description: "Search L2 memory (default true)" })),''',
    '''    exposure: "deferred",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    outputSchema: Type.Object({ found: Type.Boolean(), sections: Type.Array(Type.String()) }),
    parameters: Type.Object({
      query: Type.String({ description: "What you're working on" }),
      harvestMemory: Type.Optional(Type.Boolean({ description: "Search L2 memory (default true)" })),''',
    "context_harvest outputSchema",
))

edits.append((
    '''      if (results.length === 0) return { content: [{ type: "text", text: `No context found for "${params.query}".` }] };
      return { content: [{ type: "text", text: `🌾 Context harvested:\\n\\n${results.join("\\n\\n")}` }] };''',
    '''      if (results.length === 0) return { content: [{ type: "text", text: `No context found for "${params.query}".` }], structuredContent: { found: false, sections: [] } };
      return { content: [{ type: "text", text: `🌾 Context harvested:\\n\\n${results.join("\\n\\n")}` }], structuredContent: { found: true, sections: results } };''',
    "context_harvest structuredContent",
))

# ── 8. scratchpad (THE codemode tool): outputSchema + structuredContent  [CRITICAL]
edits.append((
    '''    name: "hypernexus_scratchpad",
    label: "TN Scratchpad",
    description: "Read/write L1 session scratchpad — ephemeral working memory.",
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    parameters: Type.Object({
      action: Type.String({ description: "'get' or 'set'" }),
      content: Type.Optional(Type.String({ description: "Content for 'set'" })),
    }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "get") {
        const text = await tnFetch("/api/memory/scratchpad/get", {}, signal).then(r => r.ok ? r.text() : "");
        return { content: [{ type: "text", text: text || "Empty." }] };
      }
      if (params.action === "set" && params.content) {
        const ok = await tnOk("/api/memory/scratchpad/set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: params.content }) }, signal);
        return ok
          ? { content: [{ type: "text", text: "✅ Scratchpad updated." }] }
          : { content: [{ type: "text", text: "Failed." }], isError: true };
      }
      return { content: [{ type: "text", text: 'Usage: action="get" or "set".' }] };
    },''',
    '''    name: "hypernexus_scratchpad",
    label: "TN Scratchpad",
    description: "Read/write L1 session scratchpad — ephemeral working memory.",
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "codemode",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ ok: Type.Boolean(), value: Type.Optional(Type.String()) }),
    parameters: Type.Object({
      action: Type.String({ description: "'get' or 'set'" }),
      content: Type.Optional(Type.String({ description: "Content for 'set'" })),
    }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "get") {
        const text = await tnFetch("/api/memory/scratchpad/get", {}, signal).then(r => r.ok ? r.text() : "");
        return { content: [{ type: "text", text: text || "Empty." }], structuredContent: { ok: true, value: text || "" } };
      }
      if (params.action === "set" && params.content) {
        const ok = await tnOk("/api/memory/scratchpad/set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: params.content }) }, signal);
        return ok
          ? { content: [{ type: "text", text: "✅ Scratchpad updated." }], structuredContent: { ok: true } }
          : { content: [{ type: "text", text: "Failed." }], isError: true, structuredContent: { ok: false } };
      }
      return { content: [{ type: "text", text: 'Usage: action="get" or "set".' }], structuredContent: { ok: false } };
    },''',
    "scratchpad typed bindings [CRITICAL]",
))

# ── 9. subagent: reachesTools + outputSchema + structuredContent
edits.append((
    '''    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    parameters: Type.Object({
      task: Type.String({ description: "The task description for the sub-agent" }),''',
    '''    exposure: "deferred",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    reachesTools: () => "all" as const,
    outputSchema: Type.Object({ taskId: Type.String(), mode: Type.String(), dispatched: Type.Boolean(), contextPreview: Type.Optional(Type.String()) }),
    parameters: Type.Object({
      task: Type.String({ description: "The task description for the sub-agent" }),''',
    "subagent reachesTools+outputSchema",
))

edits.append((
    '''      if (mode === "async") {
        return {
          content: [{ type: "text", text: `✅ Task dispatched to sub-agent (ID: ${taskId}). Results will appear in L2 memory when complete.` }],
          details: { taskId, mode: "async" },
        };
      }

      // Sync mode: use ctx.executeTool to call context_harvest as a nested tool
      try {
        const harvestResult = await ctx.executeTool("hypernexus_context_harvest", { query: params.task });
        const harvestText = harvestResult?.content?.map((c: any) => c.text ?? "").join("\\n") ?? "";
        return {
          content: [{ type: "text", text: `🔧 Sub-agent task dispatched (ID: ${taskId}).\\n\\nHarvested context:\\n${harvestText || "(none)"}\\n\\nTask stored in L2 memory. Check results with hypernexus_memory_search.` }],
          details: { taskId, mode: "sync", nestedTool: "hypernexus_context_harvest" },
        };
      } catch {
        return {
          content: [{ type: "text", text: `🔧 Sub-agent task dispatched (ID: ${taskId}). Task stored in L2 memory. Check results with hypernexus_memory_search.` }],
          details: { taskId, mode: "sync" },
        };
      }''',
    '''      if (mode === "async") {
        return {
          content: [{ type: "text", text: `✅ Task dispatched to sub-agent (ID: ${taskId}). Results will appear in L2 memory when complete.` }],
          details: { taskId, mode: "async" },
          structuredContent: { taskId, mode: "async", dispatched: true },
        };
      }

      // Sync mode: use ctx.executeTool to call context_harvest as a nested tool
      try {
        const harvestResult = await ctx.executeTool("hypernexus_context_harvest", { query: params.task });
        const harvestText = harvestResult?.content?.map((c: any) => c.text ?? "").join("\\n") ?? "";
        return {
          content: [{ type: "text", text: `🔧 Sub-agent task dispatched (ID: ${taskId}).\\n\\nHarvested context:\\n${harvestText || "(none)"}\\n\\nTask stored in L2 memory. Check results with hypernexus_memory_search.` }],
          details: { taskId, mode: "sync", nestedTool: "hypernexus_context_harvest" },
          structuredContent: { taskId, mode: "sync", dispatched: true, contextPreview: harvestText.slice(0, 500) },
        };
      } catch {
        return {
          content: [{ type: "text", text: `🔧 Sub-agent task dispatched (ID: ${taskId}). Task stored in L2 memory. Check results with hypernexus_memory_search.` }],
          details: { taskId, mode: "sync" },
          structuredContent: { taskId, mode: "sync", dispatched: true },
        };
      }''',
    "subagent structuredContent",
))

# ── Apply ──
failures = []
for old, new, label in edits:
    if old not in src:
        failures.append(label)
        print(f"MISS: {label}")
        continue
    src = src.replace(old, new, 1)
    print(f"OK:   {label}")

if failures:
    print(f"\n{len(failures)} edit(s) failed to match. File NOT written.")
    sys.exit(1)

p.write_text(src, encoding="utf-8")
print(f"\nWrote {p} ({len(src)} bytes, was {len(orig)})")
