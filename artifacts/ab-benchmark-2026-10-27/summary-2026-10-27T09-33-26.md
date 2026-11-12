# A/B Benchmark â€” Muse live-proof spec (v1)

Date: 2026-10-27T02:09:08.316Z | Model: gemma-4-heretic:latest (LM Studio) | Token counts: chars/4 approximation unless the API reported usage.prompt_tokens

Same tasks, same harness, twice: full catalog vs progressive disclosure + predictive routing.

| Metric | Mode A (full catalog) | Mode B (progressive disclosure) |
|---|---|---|
| Tasks | 12 | 12 |
| Task success | 7/12 (58%) | 7/12 (58%) |
| Miss rate | 42% | 42% |
| Tool tokens (avg) | 4607 | 172 |
| Context tokens before (avg) | 4677 | 242 |
| Context tokens after (avg) | 243 | 180 |
| Model latency (avg ms) | 341510 | 239546 |
| Tool calls (total) | 8 | 5 |
| Tool errors (total) | 0 | 1 |
| Discovery used (tasks) | 0 | 0 |

Per-task rows: `results.jsonl`.

Known v1 limitations (honest): small task set (10); one local model; token counts mostly approximated; tasks are kernel-verifiable but narrow. Ready for Muse review criteria to be applied against these files.