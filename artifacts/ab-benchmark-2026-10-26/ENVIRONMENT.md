# Environment pins — A/B benchmark runs (2026-10-26)

Recorded because the last known shared status was "laptop Ollama broken, no model
generating, elevated reinstall pending." **That status is now stale — verified live below.**

| Pin | Value | Evidence |
|---|---|---|
| Machine | **LAPTOP** (Windows, `C:\Users\hyper\workspace\HyperNexus`) | `$env:COMPUTERNAME` |
| Engine | **Ollama 0.40.11** (post-reinstall; NOT the broken v0.40.3) | `GET /api/version` |
| Model | `gemma-4-heretic:latest` (gemma-4-E2B-it-ultra-uncensored-heretic, Q4_K_M per spec §12) | `GET /api/tags`, `ollama ps` |
| Model runtime | 3.9 GB, **100% CPU (no GPU offload)**, context 4096, llamacpp runner | `ollama ps` |
| Kernel | hypernexus-go **1.0.21** | `GET /health` |
| Harness (exploratory) | `bin/benchmark-ab.mjs` (this repo; commit = HEAD at run time) | git |
| Harness (spec track) | `bin/run-benchmark.mjs` + `docs/benchmark/tasks.json` (v1.1) — **not run; gated on Robert's direction** | git |

## Live generate verification (spec §15 precondition 2)

- Tiny generate: `GET/POST /api/generate` "Reply with just: OK" → **OK in 14.2s**
  (eval_count=2, eval 0.25s, prompt_eval 1.7s — mostly model warmup).
- Chat turn without tools: **20.7-33s** (19 prompt / 80 completion tokens).
- Full-catalog chat turn (all 58 tool schemas, OpenAI-compat `/v1/chat/completions`):
  **267.7s**, HTTP 200, `prompt_tokens=2051` (Ollama's own tokenizer), 178 completion
  tokens, **correct tool call produced** (`hello_world`).

## Measured performance envelope (calibration, this machine)

- Generation ≈ **1.5 tok/s on CPU**; a catalog turn ≈ **4.5 minutes**.
- Therefore any fixed model budget below ~500s will mis-measure timeouts as misses.
  Harness budgets set to **900s/turn**, `max_tokens` 768 (thinking headroom without a
  runaway tail), one retry on transient failure.
- `ollama ps` shows **~4-minute keep-alive** (not 24h) — the model stays loaded under
  continuous request load; idle gaps >4min trigger reload (cold-start ~14s).
- **Trap:** `think:false` combined with a `tools` array kills the connection at exactly
  300s (each factor alone works). Avoid that combination.

## Claims this environment supports / does not support

- Token counts from Ollama's `prompt_tokens`/`completion_tokens` are **real tokenizer
  counts**; the exploratory harness's chars/4 fields are approximations (labeled).
- Numbers are **laptop-only** (spec §12: results do not transfer to Hetzner).
- LLM cost ≈ 0 (local Ollama) — report tokens/latency/accuracy, not dollars (spec §13).
- Spec §15 precondition 3 (kernel AutoRoute log shows `gemma-4-heretic`) is **NOT
  verified here** — the exploratory harness calls Ollama directly, not through
  AutoRoute. Applies to the spec-track run.
