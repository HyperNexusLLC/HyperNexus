# HyperNexus Live-Proof Benchmark Harness — Spec (v1.1)

> **DRAFT for Robert + Muse review.** Preparation, not execution. **Do not run** until Ollama's
> engine is restored (elevated reinstall) **and** Robert directs it. Pi-posted numbers are **not**
> proof — Muse + Robert review the log files. Identifier: `[mimo-v2.6-pro in pi in
> ~/workspace/HyperNexus]` (AI agent, not a principal).

## 1. Purpose
Measure whether HyperNexus routing (progressive tool disclosure + predictive routing) reduces
tool-token bloat and preserves/improves tool selection versus a no-routing baseline.

## 2. Task definition
- **N = 20 tasks** (stated up front), each requiring tool selection from a catalog to reach a goal.
- Tasks must be **real MCP tool-selection work**, not toy prompts — drawn from realistic agent
  workflows (memory recall, tool discovery, code search, knowledge ingest, status checks).
- **Diversity**: cover at least 5 tool domains, with single-tool, multi-tool, and ambiguous cases.
- **Per-task ground truth** is fixed in a `tasks.json` before running:
  - `expected_tools` (the correct tool or tools),
  - `acceptable_alternatives` (equivalent tools that also count as correct),
  - `partial_credit` rule (e.g. 1.0 all-correct, 0.5 for a subset, 0 for miss).
  Without this, selection accuracy and miss rate are subjective.

## 3. Two arms — same task set, same harness
| Arm | Configuration |
|---|---|
| **A. Baseline** | No HyperNexus routing — **full tool catalog** exposed. |
| **B. HyperNexus** | HyperNexus routing — **progressive disclosure + predictive routing**. |

## 4. Controls (identical across arms)
- Same **model**, **temperature + sampling**, **prompt**, **harness version**, **tool-catalog version**.
- **Fresh session + cleared cache** per arm (no warm cache carryover).
- **Counterbalanced order** when tasks repeat (e.g. A→B then B→A across runs) to cancel order effects.

## 5. Token counting (single method for both arms)
- State whether context/tool tokens are **input, output, or total** (default: **total**), and the
  exact **tokenizer/counter** used (one counter for both arms).
- Distinguish **tool-schema tokens** vs **tool-call tokens**.
- **Before/after** = before routing vs after routing within each arm.

## 6. Latency
- Report **median and p95** (not mean).
- **Separate routing latency from model-generation latency** so routing overhead is not hidden
  behind token savings.

## 7. Repeatability
- **≥ 3 runs per task per arm** (LLM sampling is noisy); report **variance**, not just one aggregate.
- Keep **raw JSONL logs** (not only the aggregate) **plus the exact run script + command**.

## 8. Metrics (per task, per arm, per run)
- Context tokens (before/after), Tool tokens (before/after) — *primary bloat measure*
- Tool-selection accuracy, Miss rate
- Latency (median, p95; routing vs generation)
- Error rate, Task success

## 9. Error + success judging
- **Separate error types**: routing errors, tool-call failures, timeouts, model errors.
- **Success judge**: automated checker with **fixed criteria** (from `tasks.json`), **not** an LLM
  judge with a changing prompt — unless that judge is pinned + independent.

## 10. Proof threshold (set BEFORE running — no post-hoc cherry-picking)
Proof requires **all** of:
1. **Token reduction** (tool + context) vs baseline,
2. **Accuracy and task success NOT worse** (must hold — token cuts alone are not proof, since you
   can always cut tokens by not calling tools),
3. **Latency not worse by more than a stated %** (default: 15%).

## 11. Log file format (one JSONL per arm per run)
```
{ "run_id","timestamp","arm","task_id","model","ollama_version","kernel_version",
  "harness_name","harness_version","harness_commit","machine",
  "context_tokens_before","context_tokens_after","tool_schema_tokens","tool_call_tokens",
  "tool_tokens_before","tool_tokens_after",
  "tools_selected","tools_expected","acceptable_alternatives","selection_correct","miss",
  "latency_total_ms","latency_routing_ms","latency_generation_ms",
  "error_type","task_success" }
```
Plus `report.md` with aggregate deltas **and variance** (arm B vs arm A) per metric.

## 12. Reproducibility + scope (pin in every log)
- **Model (canonical):** `gemma-4-heretic` = gemma-4-E2B-it-ultra-uncensored-heretic, Q4_K_M.
- **Kernel version:** a **git commit SHA** of the built `hypernexus-kernel` (not a marketing tag).
- **Harness:** name + version + commit (e.g. Pi / OpenCode / Mimo). **Proof on one harness does
  not generalize to all harnesses.**
- **Ollama version:** the **post-reinstall** version (NOT the broken v0.40.3).
- **Machine scope:** state laptop **or** Hetzner. **Results do not transfer** to the other machine
  without re-running (separate Ollama instances).

## 13. Cost language
Local Ollama gemma ⇒ **LLM cost ≈ 0**, so token savings do **not** equal dollar savings. Report
**tokens, latency, accuracy** — **not dollars** — unless a paid-model arm is added (not in scope).

## 14. Abort criteria + privacy
- **Abort** (report nothing) if: generate fails, or AutoRoute's log does not show the **model name**
  (`gemma-4-heretic`). Never report numbers from failed runs.
- **Synthetic data only** in benchmark tasks — **no real user data, no PII, no secrets.**

## 15. Preconditions (order)
1. Robert restores Ollama (elevated installer).
2. `ollama list` shows `gemma-4-heretic` + a live generate succeeds (log output + latency).
3. Kernel AutoRoute hits `gemma-4-heretic` (log shows the model name).
4. **Then** run this benchmark. Not before.

## 16. Review gate
Raw logs + `report.md` → **Robert + Muse**. Pi posting numbers does not close proof. Billing
verification + Robert's final go remain separate, later blockers.
