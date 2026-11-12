# Hypernexus orchestrator skill (swarm)

RECALL -> DISCOVER -> EXECUTE -> PERSIST -> VERIFY, extended for multi-session control.

- RECALL: search_memory (+ FTS) for prior swarm rosters and decisions.
- DISCOVER: enumerate sessions (thread picker/list) as worker pool; mcp_list_tools for routing.
- EXECUTE (leader): fan out disjoint subtasks via per-thread messages; one subtask per worker.
- COLLECT: read worker STATUS: DONE/BLOCKED reports in-thread, verify diffs, integrate.
- PERSIST: roster + outcomes via add_memory (tags type,swarm); relations via memory_extract_relations.
- VERIFY: system_status + billing_status before/after production changes.
- Tool policy: shell tools DISABLED (Meta 403); parity tools with MINIMAL descriptions only.
