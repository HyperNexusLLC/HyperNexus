# HyperNexus skill

Route every HyperNexus need through the `hypernexus` MCP server first; fall back to the HTTP kernel API only when the MCP server is unreachable.

- RECALL: search_memory (semantic) then FTS /api/memory/fts-search (fast path).
- DISCOVER: mcp_list_servers, mcp_list_tools, semantic /api/mcp/tools/search, route with mcp_call_tool.
- PERSIST: add_memory with topic tags + memory_extract_relations.
- VERIFY: system_status + billing_status before/after production changes.
- Tool policy: shell tools DISABLED (Meta 403 client_attestation_denied); use HyperNexus parity tools with MINIMAL descriptions.
