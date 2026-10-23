/**
 * HyperNexus ↔ OpenCode shared RPC contract.
 *
 * Other plugins and clients can import this surface without loading the
 * implementation: `import { TOOL, COMMAND, CAPABILITY } from "opencode-hypernexus-plugin/rpc"`
 */

export const PLUGIN_ID = "hypernexus";

/** Effective tool names after namespace normalization (`hypernexus_<name>`). */
export const TOOL = Object.freeze({
  STATUS: "hypernexus_status",
  SYSTEM_OVERVIEW: "hypernexus_system_overview",
  MEMORY_STORE: "hypernexus_memory_store",
  MEMORY_SEARCH: "hypernexus_memory_search",
  MEMORY_FTS_SEARCH: "hypernexus_memory_fts_search",
  MEMORY_VECTOR_SEARCH: "hypernexus_memory_vector_search",
  MEMORY_LIST: "hypernexus_memory_list",
  MEMORY_DELETE: "hypernexus_memory_delete",
  MEMORY_RELATE: "hypernexus_memory_relate",
  SCRATCHPAD: "hypernexus_scratchpad",
  CONTEXT_HARVEST: "hypernexus_context_harvest",
  RECORD_OBSERVATION: "hypernexus_record_observation",
  TOOL_SEARCH: "hypernexus_tool_search",
  TOOL_DISCOVER: "hypernexus_tool_discover",
  SUGGEST_TOOLS: "hypernexus_suggest_tools",
  MCP_STATUS: "hypernexus_mcp_status",
  MCP_SERVERS: "hypernexus_mcp_servers",
  MCP_TOOLS: "hypernexus_mcp_tools",
  MCP_SEARCH: "hypernexus_mcp_search",
  MCP_CALL: "hypernexus_mcp_call",
  SESSION_SEARCH: "hypernexus_session_search",
  SESSION_CONTEXT: "hypernexus_session_context",
  SESSION_HANDOFF: "hypernexus_session_handoff",
  SKILL_SEARCH: "hypernexus_skill_search",
  SKILL_MANAGE: "hypernexus_skill_manage",
  CODE_SEARCH: "hypernexus_code_search",
  KNOWLEDGE_GRAPH: "hypernexus_knowledge_graph",
  BILLING_STATUS: "hypernexus_billing_status",
  AUDIT_LOG: "hypernexus_audit_log",
  SUBAGENT: "hypernexus_subagent",
  WORKFLOW: "hypernexus_workflow",
  ORCHESTRATE: "hypernexus_orchestrate",
  BROWSER: "hypernexus_browser",
});

export const COMMAND = Object.freeze({
  STATUS: "hn-status",
  STORE: "hn-store",
  REMEMBER: "hn-remember",
  SEARCH: "hn-search",
  TOOLS: "hn-tools",
  SESSION: "hn-session",
  CONTEXT: "hn-context",
  PLAN: "hn-plan",
  SUMMARY: "hn-summary",
  RESTORE: "hn-restore",
  PURGE: "hn-purge",
});

/** Maps shared-manifest capability IDs to the OpenCode tool that serves them. */
export const CAPABILITY = Object.freeze({
  memory_store: TOOL.MEMORY_STORE,
  memory_search: TOOL.MEMORY_SEARCH,
  memory_vector_search: TOOL.MEMORY_VECTOR_SEARCH,
  memory_list: TOOL.MEMORY_LIST,
  context_harvest: TOOL.CONTEXT_HARVEST,
  scratchpad: TOOL.SCRATCHPAD,
  tool_search: TOOL.TOOL_SEARCH,
  tool_suggest: TOOL.SUGGEST_TOOLS,
  mcp_call: TOOL.MCP_CALL,
  session_search: TOOL.SESSION_SEARCH,
  skill_manage: TOOL.SKILL_MANAGE,
  code_search: TOOL.CODE_SEARCH,
  subagent: TOOL.SUBAGENT,
  system_status: TOOL.SYSTEM_OVERVIEW,
});

/** Kernel bindings used by the adapter (single source of truth for tests). */
export const KERNEL = Object.freeze({
  health: "/health",
  runtimeStatus: "/api/runtime/status",
  systemOverview: "/api/system/overview",
  memoryAdd: "/api/memory/facts/add",
  memorySearch: "/api/memory/search",
  memoryFts: "/api/memory/fts-search",
  memoryList: "/api/memory/list",
  scratchpadGet: "/api/memory/scratchpad/get",
  scratchpadSet: "/api/memory/scratchpad/set",
  observations: "/api/memory/observations/record",
  sessionBootstrap: "/api/memory/session-bootstrap",
  sessionSummaries: "/api/memory/session-summaries/search",
  crossSessionLinks: "/api/memory/cross-session-links",
  coldArchive: "/api/memory/cold-archive/search",
  graph: "/api/memory/graph",
  relationsGraph: "/api/memory/relations/graph",
  relationsAdd: "/api/memory/relations/add",
  toolsSearch: "/api/tools/search",
  mcpStatus: "/api/mcp/status",
  mcpServers: "/api/mcp/servers",
  mcpServersConfigured: "/api/mcp/servers/configured",
  mcpTools: "/api/mcp/tools",
  mcpToolsSearch: "/api/mcp/tools/search",
  mcpNativeSearch: "/api/mcp/native/search",
  toolSuggestions: "/api/mcp/tool-suggestions",
  agentTool: "/api/agent/tool",
  agentMemoryHandoff: "/api/agent-memory/handoff",
  agentMemoryPickup: "/api/agent-memory/pickup",
  agentMemoryDelete: "/api/agent-memory/delete",
  importedSessions: "/api/sessions/imported/list",
  skillsSearch: "/api/skills/search",
  skillsList: "/api/skills",
  skillsRead: "/api/skills/read",
  skillsCreate: "/api/skills/create",
  billingStatus: "/api/billing/status",
  billingFallback: "/api/billing/fallback-chain",
  billingDepleted: "/api/billing/depleted-models",
  memoryAddGeneric: "/api/memory/add",
  agentMemoryDelete: "/api/agent-memory/delete",
});

/** Budget contract (ms) — mirrors addons/shared/hypernexus.manifest.json. */
export const BUDGET = Object.freeze({ hook: 400, fast: 2500, slow: 8000, call: 12000 });
