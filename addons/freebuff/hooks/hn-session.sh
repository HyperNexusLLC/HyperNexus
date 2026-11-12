#!/usr/bin/env bash
# hn-session.sh — HyperNexus SessionStart bootstrap for Freebuff (static, instant).
# =============================================================================
# Freebuff exposes no SessionStart hook API, so this script is BY-CONVENTION:
# run it manually at session start, or paste its output as context. It prints
# the memory-first discipline as JSON hook context. STATIC ONLY: no curl, no
# python, no network — live recall happens in-turn via MCP tools
# (search_memory, memory_scratchpad_get), which is where the kernel is
# actually reachable. Never blocks, never throws.
cat <<'JSON'
{"hookSpecificOutput":{"additionalContext":"HyperNexus discipline for this session: RECALL before re-deriving (search project memory via hypernexus MCP memory_search/search_memory, fast path /api/memory/fts-search?q=) -> DISCOVER via mcp_list_servers + mcp_list_tools on capability gaps -> PERSIST non-obvious outcomes with add_memory (tags: topic,freebuff) -> VERIFY with system_status/billing_status around production changes. MCP server 'hypernexus' (stdio) exposes the full tool plane; skills hypernexus / hypernexus-ops / hypernexus-workflows + hypernexus-orchestrator / hypernexus-researcher are on the skill path (/skill:<name>); commands /skill:hn-status|hn-search|hn-store|hn-session|hn-context|hn-summary|hn-tools|hn-purge|hn-plan|hn-remember|hn-restore are available."}}
JSON
exit 0
