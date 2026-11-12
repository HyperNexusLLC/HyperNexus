---
name: hypernexus-l2
description: "HyperNexus L2 vault + L1 scratchpad + L3 cold archive from Prime Agent: tiers, namespaces, fact shapes, vector vs FTS recall. Use when choosing where a memory lives, listing vault contents, or debugging recall misses."
---

# HyperNexus L2 Vault (Prime Agent)

Kernel baseline: `http://127.0.0.1:7778`.

## Tiers

| Tier | What | Surface |
|---|---|---|
| L1 scratchpad | Turn-local working state | `scratchpad_get/set/append(key, value)` → `/api/memory/scratchpad/*` |
| L2 vault | Persistent vector memory, facts + observations | `memory_fact`, `memory_search`, `memory_fts_search`, `memory_list` |
| L3 cold archive | Aged-out long-term store | kernel-side; recall with vector search when FTS misses |

## Fact shape

```json
{ "content": "string (required)", "tags": ["array", "of-tags"], "type": "fact|observation|task", "category": "optional" }
```

Always send a tags array: `["prime-agent-hook", "hook:<name>"]` for hook logs,
`["agent:dispatch"]` for tasks, topic tags otherwise.

## Recall strategy

1. `memory_fts_search(query)` first (fast); `memory_search(query)` on miss (slower, ~800ms).
2. `memory_list(limit)` to audit vault size.
3. `session_bootstrap()` for a new session's starting context bundle.

## Rules

- L2 is append-only from Prime Agent: never rewrite another agent's facts; add corrections as new facts.
- Keep hook observations under ~2000 chars; truncate tool output to ~300 chars.
- Scratchpad keys are per-kernel working state — prefer namespaced keys (e.g. `pa-<topic>`).
