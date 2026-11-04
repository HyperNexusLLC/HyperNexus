# Hypernexus orchestrator skill (Codex GUI swarm)

RECALL -> DISCOVER -> EXECUTE -> PERSIST -> VERIFY, extended for multi-session control.

- RECALL: `search_memory` (+ FTS `/api/memory/fts-search`) for prior swarm rosters and decisions.
- DISCOVER: enumerate Codex GUI sessions (thread picker/list) as worker pool; `mcp_list_tools` for capability routing.
- EXECUTE (leader): fan out disjoint subtasks via per-thread messages; one subtask per worker.
- COLLECT: read worker `STATUS: DONE/BLOCKED` reports in-thread, verify diffs, integrate.
- PERSIST: roster + outcomes via `add_memory` (tags `swarm,codex-gui`); relations via `memory_extract_relations`.
- VERIFY: `system_status` + `billing_status` before/after production changes; re-run `bin/test-codex-gui-ext.mjs` after addon edits.
- Tool policy: shell tools DISABLED (Meta 403 `client_attestation_denied`); parity tools with MINIMAL descriptions only.
