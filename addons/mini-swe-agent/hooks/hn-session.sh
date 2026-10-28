#!/usr/bin/env bash
# hn-session.sh — HyperNexus SessionStart bootstrap for Crush (static, instant).
# =============================================================================
# Prints the memory-first discipline as hook context. STATIC ONLY: no curl, no
# python, no network — the live-memory variant hung Crush startup (~77s: Git
# Bash cold start + Store-stub python + curl under non-interactive spawn
# exceeded the config load deadline and bricked every `crush run`).
# Live recall happens in-turn via MCP tools (search_memory, memory_scratchpad_get),
# which is where the kernel is actually reachable. Never blocks, never throws.
cat <<'JSON'
{"hookSpecificOutput":{"additionalContext":"HyperNexus discipline for this session: RECALL before re-deriving (search project memory via hypernexus MCP memory_search/search_memory, fast path /api/memory/fts-search) -> DISCOVER via mcp_list_servers + mcp_list_tools on capability gaps -> PERSIST non-obvious outcomes with add_memory (tags: topic,kind) -> VERIFY with system_status/billing_status around production changes. MCP server 'hypernexus' (stdio) exposes the full tool plane; skills hypernexus / hypernexus-ops / hypernexus-workflows are on the skill path; commands /hn-status /hn-search /hn-store /hn-session /hn-context /hn-summary /hn-tools /hn-purge are available."}}
JSON
exit 0
