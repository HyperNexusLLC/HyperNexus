#!/usr/bin/env node
/**
 * hn-session.mjs — HyperNexus session bootstrap for Codewhale (static, instant).
 *
 * Codewhale exposes no SessionStart hook API for bundles, so this script is
 * BY-CONVENTION: run it manually at session start, or paste its output as
 * context. It prints the memory-first discipline as JSON hook context.
 * STATIC ONLY: no fetch, no network — live recall happens in-turn via MCP tools
 * (mcp__hypernexus__search_memory, mcp__hypernexus__memory_scratchpad_get),
 * which is where the kernel is actually reachable. Never blocks, never throws.
 * Never reads credentials.
 *
 * Usage: node hn-session.mjs
 */
const CONTEXT =
  "HyperNexus discipline for this session: RECALL before re-deriving (search project " +
  "memory via mcp__hypernexus__search_memory, fast path /api/memory/fts-search?q=) -> " +
  "DISCOVER via mcp__hypernexus__mcp_list_tools on capability gaps -> PERSIST non-obvious " +
  "outcomes with mcp__hypernexus__add_memory (tags: topic,codewhale) -> VERIFY with " +
  "mcp__hypernexus__system_status around production changes. MCP server 'hypernexus' " +
  "(stdio) exposes the full tool plane; skills hypernexus / hypernexus-ops / " +
  "hypernexus-workflows / hypernexus-orchestrator are on the skill path; commands " +
  "/hn-status|hn-search|hn-store|hn-session|hn-context|hn-summary|hn-tools|hn-purge|" +
  "hn-plan|hn-remember|hn-restore are available.";
process.stdout.write(JSON.stringify({ hookSpecificOutput: { additionalContext: CONTEXT } }));
process.exit(0);
