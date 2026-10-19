import shutil, os

p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
shutil.copy2(p, p + ".bak2")
src = open(p, encoding="utf-8").read()

# ── 1. Add outputSchema to memory_search ─────────────────────────
old = '''    name: "hypernexus_memory_search",
    label: "TN Memory Search",
    description: "Search L2 vault by keyword, tag filter, or category.",
    promptSnippet: "Search persistent L2 memory",
    promptGuidelines: ["Use hypernexus_memory_search before tasks to recall past context.", "Filter by tag prefix like 'project:' or 'failure:'."],
    namespace: { name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" },
    exposure: "direct",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },'''

new = '''    name: "hypernexus_memory_search",
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
        category: Type.String(),
      })),
    }),'''

if old not in src:
    print("WARN: memory_search anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: memory_search outputSchema added")

# ── 2. Add structuredContent to memory_search execute return ─────
old = '''      if (parsed.length === 0) return { content: [{ type: "text", text: "No matching memories." }] };
      const formatted = parsed.map((m, i) => `${i + 1}.${m.category !== "general" ? ` (${m.category})` : ""}${m.tags.length ? ` [${m.tags.join(", ")}]` : ""}\\n   ${m.content.slice(0, 200)}`).join("\\n\\n");
      return { content: [{ type: "text", text: `📚 ${parsed.length} memories:\\n\\n${formatted}` }] };'''

new = '''      if (parsed.length === 0) return { content: [{ type: "text", text: "No matching memories." }], structuredContent: { count: 0, memories: [] } };
      const formatted = parsed.map((m, i) => `${i + 1}.${m.category !== "general" ? ` (${m.category})` : ""}${m.tags.length ? ` [${m.tags.join(", ")}]` : ""}\\n   ${m.content.slice(0, 200)}`).join("\\n\\n");
      return { content: [{ type: "text", text: `📚 ${parsed.length} memories:\\n\\n${formatted}` }], structuredContent: { count: parsed.length, memories: parsed } };'''

if old not in src:
    print("WARN: memory_search return anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: memory_search structuredContent added")

# ── 3. Add outputSchema + structuredContent to memory_store ──────
old = '''    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    parameters: Type.Object({
      content: Type.String({ description: "The memory content to store" }),
      tags: Type.Optional(Type.Array(Type.String(), { description: "Tags like ['project:bg', 'pattern:build']" })),
      category: Type.Optional(Type.String({ description: "Category: pattern, decision, convention, insight, failure, correction, preference" })),
      project: Type.Optional(Type.String({ description: "Project directory name. If set, also writes to project/.memdb for git tracking" })),
    }),'''

new = '''    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    outputSchema: Type.Object({ stored: Type.Boolean(), projectNote: Type.Optional(Type.String()) }),
    parameters: Type.Object({
      content: Type.String({ description: "The memory content to store" }),
      tags: Type.Optional(Type.Array(Type.String(), { description: "Tags like ['project:bg', 'pattern:build']" })),
      category: Type.Optional(Type.String({ description: "Category: pattern, decision, convention, insight, failure, correction, preference" })),
      project: Type.Optional(Type.String({ description: "Project directory name. If set, also writes to project/.memdb for git tracking" })),
    }),'''

if old not in src:
    print("WARN: memory_store anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: memory_store outputSchema added")

old = '''      const projectNote = params.project ? ` and project .memdb (${params.project})` : "";
      return { content: [{ type: "text", text: `✅ Memory stored in L2 vault${projectNote}.` }], details: { tags } };'''
new = '''      const projectNote = params.project ? ` and project .memdb (${params.project})` : "";
      return { content: [{ type: "text", text: `✅ Memory stored in L2 vault${projectNote}.` }], details: { tags }, structuredContent: { stored: true, projectNote } };'''
if old not in src:
    print("WARN: memory_store return anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: memory_store structuredContent added")

# ── 4. Add prepareLoadout to hypernexus_tool_search ─────────────
old = '''    name: "hypernexus_tool_search",
    label: "TN Tool Search",'''
new = '''    name: "hypernexus_tool_search",
    label: "TN Tool Search",
    prepareLoadout(loadout) {
      const callable = loadout.callable.map((t: any) => t.name).filter((n: string) => n.startsWith("hypernexus_"));
      return {
        description: `Describe what you need — TN finds the best tool across 20+ MCP servers and 80+ catalog entries. Callable HyperNexus tools: ${callable.join(", ")}`,
      };
    },'''
if old not in src:
    print("WARN: tool_search anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: tool_search prepareLoadout added")

# ── 5. Add registerMcpServer + resources_discover + project_trust ─
# Insert after the first session_start registration block ends (before before_agent_start)
old = '''  pi.on("before_agent_start", async (event, ctx) => {'''
new = '''  // Register HyperNexus kernel as an MCP server so Pi can discover its tools natively
  try {
    pi.registerMcpServer("hypernexus-kernel", {
      url: "http://127.0.0.1:7778/mcp",
    } as any);
  } catch { /* already registered or MCP extension not active */ }

  // Advertise HyperNexus skill paths so Pi discovers them on session start
  pi.on("resources_discover", async (_event, _ctx) => {
    return {
      skillPaths: [
        ".codex/plugins/hypernexus/skills",
        ".codewhale/plugins/hypernexus/skills",
        "engine-config/skills",
      ],
      promptPaths: [".codex/prompts"],
    };
  });

  // Auto-trust the HyperNexus workspace for project-scoped operations
  pi.on("project_trust", async (event, _ctx) => {
    const cwd = event.cwd ?? "";
    if (cwd.includes("HyperNexus") || cwd.includes("hypernexus") || cwd.includes("marketing_agent")) {
      return { trust: "trusted" as const };
    }
    return { trust: "unknown" as const };
  });

  pi.on("before_agent_start", async (event, ctx) => {'''
if old not in src:
    print("WARN: before_agent_start anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: registerMcpServer + resources_discover + project_trust added")

# ── 6. Enhance subagent to use ctx.executeTool for nested calls ──
old = '''      // Sync mode: wait for result by polling L2 + supervisor API
      // In practice, this would use TN's SupervisorManager to create a session
      return {
        content: [{ type: "text", text: `🔧 Sub-agent task dispatched (ID: ${taskId}). Task stored in L2 memory. Check results with hypernexus_memory_search.` }],
        details: { taskId, mode: "sync" },
      };'''
new = '''      // Sync mode: use ctx.executeTool to call context_harvest as a nested tool
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
      }'''
if old not in src:
    print("WARN: subagent sync anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: subagent ctx.executeTool added")

# ── 7. Add registerFlag + setFooter + setTitle + setSessionName ──
# Insert before the LIVE STATS WIDGET section
old = '''  // ══════════════════════════════════════════════
  // LIVE STATS WIDGET'''
new = '''  // ─── CLI Flags ──────────────────────────────────────────────────
  pi.registerFlag("tn-base", { description: "HyperNexus kernel base URL", type: "string", default: "http://127.0.0.1:7778" });
  pi.registerFlag("tn-verbose", { description: "Enable verbose TN logging", type: "boolean", default: false });

  // ─── UI Enhancements ───────────────────────────────────────────
  try {
    ctx.ui.setFooter?.("tn-footer", "🧠 HyperNexus L2 • Tool catalog • Skills");
    ctx.ui.setTitle?.("MiMoCode × HyperNexus");
  } catch { /* optional UI hooks */ }

  // ══════════════════════════════════════════════
  // LIVE STATS WIDGET'''
if old not in src:
    print("WARN: live stats widget anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: registerFlag + setFooter + setTitle added")

# ── 8. Add setSessionName in session_start ───────────────────────
old = '''    // Store session start
    tnOk("/api/memory/add", {
      method: "POST", headers: { "Content-Type": "application/json" },'''
new = '''    // Set session display name from TN metadata
    try {
      const shortId = (sessionFile ?? "session").split(/[\\\\/]/).pop() ?? "session";
      pi.setSessionName(`TN • ${shortId}`);
    } catch { /* skip */ }

    // Store session start
    tnOk("/api/memory/add", {
      method: "POST", headers: { "Content-Type": "application/json" },'''
if old not in src:
    print("WARN: session_start store anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: setSessionName added")

# ── 9. Add appendEntry for TN state persistence ──────────────────
old = '''  pi.on("session_shutdown", () => {'''
new = '''  // Persist TN state to session entries for cross-reload continuity
  pi.on("turn_end", async (event, _ctx) => {
    try {
      pi.appendEntry("tn:turn_stats", {
        turnId: event.turnId ?? Date.now(),
        timestamp: now(),
      });
    } catch { /* skip */ }
  });

  pi.on("session_shutdown", () => {'''
if old not in src:
    print("WARN: session_shutdown anchor not found")
else:
    src = src.replace(old, new, 1)
    print("OK: appendEntry added")

# ── Write out ─────────────────────────────────────────────────────
tmp = p + ".tmp"
with open(tmp, "w", encoding="utf-8", newline="\n") as f:
    f.write(src)
shutil.move(tmp, p)
print(f"DONE: {len(src)} chars written")
