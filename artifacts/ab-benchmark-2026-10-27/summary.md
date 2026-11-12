# A/B Benchmark â€” Muse live-proof spec (v1)

Date: 2026-10-27T11:35:52.199Z | Model: gemma-4-heretic:latest (Ollama) | Token counts: chars/4 approximation unless the API reported usage.prompt_tokens

Same tasks, same harness, twice: full catalog vs progressive disclosure + predictive routing.

| Metric | Mode A (full catalog) | Mode B (progressive disclosure) |
|---|---|---|
| Tasks | 11 | 12 |
| Task success | 6/11 (55%) | 6/12 (50%) |
| Miss rate | 45% | 50% |
| Tool tokens (avg) | 4607 | 203 |
| Context tokens before (avg) | 4677 | 282 |
| Context tokens after (avg) | 262 | 239 |
| Model latency (avg ms) | 456057 | 164826 |
| Tool calls (total) | 8 | 7 |
| Tool errors (total) | 2 | 2 |
| Discovery used (tasks) | 0 | 2 |

Per-task rows: `results.jsonl`.

Known limitations (honest): 12-task exploratory set, one local CPU model; tool/context tokens mostly approximated (chars/4); discovery_used=0 means the predictive-routing leg is UNMEASURED whenever the minimal set covers ground truth or the model answers without discovering. Exploratory pilot data only — NOT the spec v1.2 / tasks v1.1 track.