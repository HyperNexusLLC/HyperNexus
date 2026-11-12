# Spec reconciliation — `bin/benchmark-ab.mjs` vs `docs/LIVE_PROOF_BENCHMARK.md` (spec v1.2)

Muse's review note (2026-10-26): the 12-task forced-discovery runs are **not** the
spec v1.2 / tasks v1.1 track she reviewed (20 tasks, draft, not to run until Ollama
is restored **and** Robert directs). This file maps exactly what the exploratory
harness measures versus the spec's bars, so no exploratory number gets misread as
spec-track proof.

## Track identity

| | Exploratory harness | Spec track (gated) |
|---|---|---|
| Script | `bin/benchmark-ab.mjs` (mine, OpenCode session) | `bin/run-benchmark.mjs` (sibling, pi session) |
| Tasks | 12 inline tasks, hidden-token ground truth | 20 tasks in `docs/benchmark/tasks.json` v1.1 |
| Ground truth | kernel side effects (audit trail, memory, scratchpad) | per-tool `expected`/`equivalents`/`partials` scoring |
| Arm B mechanism | **live kernel `tool_search` discovery loop** (actual HyperNexus mechanism) | lexical top-K predictive router (stated proxy) |
| Status | exploratory pilot data — running | **draft; runs only when Robert directs** |

The two instruments measure different halves of the claim: mine exercises the real
discovery loop with side-effect verification; the spec track measures tool-selection
accuracy against a 20-task ground-truth schema with real tokenizer counts.

## Spec bars vs exploratory harness (honest gap list)

| Spec requirement | Exploratory harness | Gap |
|---|---|---|
| §2 N=20 tasks, tasks.json ground truth | 12 inline tasks, side-effect verify | task set + schema differ |
| §3 two arms, same task set/harness | ✅ same | — |
| §4 identical controls, fresh session | ✅ per-task isolation; single run order A→B | no counterbalanced order |
| §5 tokenizer: one counter, real counts | chars/4 approximation (labeled); Ollama `prompt_tokens` now available | approximate tokens in rows |
| §6 median + p95 latency, routing vs generation split | mean latency only, no split | needs distribution + split |
| §7 ≥3 runs per task per arm, variance | 1 run per task per arm | no variance |
| §8 full metric set | tool/ctx tokens, success, miss, latency, errors | no tool-selection accuracy scoring |
| §9 separated error types | `harness_error` string + tool_errors count | error taxonomy partial |
| §10 proof threshold (pre-set) | not claimed | n/a (exploratory) |
| §11 JSONL schema + report.md | own schema (documented in summary.md) | schema differs |
| §12 pins (engine/model/kernel/harness/machine) | ✅ `ENVIRONMENT.md` | — |
| §13 tokens not dollars | ✅ | — |
| §13b HyperNexus-toolset-only scope | ✅ same scope limit | — |
| §14 abort on generate failure / missing model name | generate verified live; model name in pins | AutoRoute name check unverified (not applicable to direct calls) |
| §15 precondition order (Robert restores → verify → direct → run) | engine restored + generate verified | **official run waits for Robert's direction** |

## Bottom line

Exploratory rows are **pilot data for instrument calibration and effect-size
estimation**. They cannot close the live-proof gate. The spec track
(`bin/run-benchmark.mjs` over `tasks.json` v1.1) is the instrument that can, and it
runs only when Robert directs — with the environment in `ENVIRONMENT.md` as the
engine state to verify against its §15 preconditions.
