# A/B Benchmark — Muse live-proof spec (v1)

Date: 2026-10-26T06:40:35.197Z | Model: gemma-4-e4b-it-qat-heretic_decensored (LM Studio) | Token counts: chars/4 approximation unless the API reported usage.prompt_tokens

Same tasks, same harness, twice: full catalog vs progressive disclosure + predictive routing.

| Metric | Mode A (full catalog) | Mode B (progressive disclosure) |
|---|---|---|
| Tasks | 8 | 9 |
| Task success | 7/8 (88%) | 8/9 (89%) |
| Miss rate | 13% | 11% |
| Tool tokens (avg) | 4607 | 288 |
| Context tokens before (avg) | 4676 | 355 |
| Context tokens after (avg) | 516 | 453 |
| Model latency (avg ms) | 118541 | 53237 |
| Tool calls (total) | 9 | 4 |
| Tool errors (total) | 0 | 0 |
| Discovery used (tasks) | 0 | 0 |

Per-task rows: `results.jsonl`.

Known v1 limitations (honest): small task set (10); one local model; token counts mostly approximated; tasks are kernel-verifiable but narrow. Ready for Muse review criteria to be applied against these files.