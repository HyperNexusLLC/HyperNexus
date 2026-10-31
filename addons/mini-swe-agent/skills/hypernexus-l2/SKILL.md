---
name: hypernexus-l2
description: "HyperNexus L2 vault + L3 cold archive for mini-swe-agent: tiers, namespaces, fact shapes, vector vs FTS recall. Use when choosing where a memory lives, listing vault contents, or debugging recall misses."
---

# HyperNexus L2 Vault (mini-swe-agent)

Kernel baseline: `http://127.0.0.1:7778`.

## Tiers

| Tier | What | Endpoint |
|---|---|---|
| L1 scratchpad | Turn-local working state | session entries (`pi.appendEntry`) |
| L2 vault | Persistent vector memory, facts + observations | `/api/memory/facts/add`, `/api/memory/search`, `/api/memory/fts-search`, `/api/memory/list` |
| L3 cold archive | Aged-out long-term store | `/api/memory/cold-archive/count` |

## Fact shape

```json
{ "content": "string (required)", "tags": ["array", "of-tags"], "type": "fact|observation|task", "category": "optional" }
```

Tests accept both `{"content","tags"}` and `{"content","type"}`. Always send a
tags array: `["pi-hook", "hook:<name>"]` for hook logs, `["agent:dispatch"]`
for tasks, topic tags otherwise.

## Recall strategy

1. `hn_memory_search` tool (FTS first, vector fallback) or `/hn-recall`.
2. `GET /api/memory/list?limit=N` to audit vault size (status widget reads this).
3. Vector search only when FTS misses; it is slower (~800ms vs ~15ms).

## Rules

- L2 is append-only from mini-swe-agent: never rewrite another agent's facts; add corrections as new facts.
- Keep hook observations under ~2000 chars; truncate tool output to ~300 chars.
