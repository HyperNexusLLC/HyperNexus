# A/B run v3 — miss diagnosis from `final_snippet` (2026-10-27)

Harness: streaming-SSE v2.1, Ollama `gemma-4-heretic:latest` (CPU ~1.5 tok/s),
900s budgets, kernel-audit verify for shell-echo/hello, kernel-side scratchpad
verify. 24/24 rows clean (zero harness errors — the streaming fix worked).
Result: 7/12 vs 7/12 success parity, tool tokens 4607 → 172 (−96%),
latency 341s → 239s (−30%). `discovery_used=0` both modes.

## Mode A misses (full catalog — needle-in-haystack failures)

- **tool-discovery**: "there is no tool explicitly defined for scraping a web
  page" — WRONG, the browser tool is in the catalog. Classic catalog-bloat miss.
- **jira-honesty**: "I do not have a tool available to create Jira issues" —
  WRONG, `jira_create_issue` is in the catalog (verify regex confirmed correct
  against live tool output). Same class: 58 schemas, model can't find the needle.
  The 0-tool-call miss is a *retrieval* failure, not a broken check.
- **search-memory**: 0 calls, empty final — model stalled, no attempt.
- **status / list-tools**: "Please provide a task or question" — prompt ignored
  (thinking-model flakiness at 4.6K catalog tokens).

## Mode B misses (minimal set — honest gaps, no discovery attempted)

- **search-memory / tool-discovery / jira-honesty**: model correctly reports the
  tool is unavailable — but never calls `tool_search` to discover it.
- **shell-echo**: 1 call + 1 tool error; audit-trail verify failed.
- **scratchpad**: model claims success with the right key/value, but kernel-side
  verify failed → CORRECTION (2026-10-27 probe): the GET-shape instrumentation
  is sound (probe set→get round-trips, value present in body). The miss stands
  as model behavior — claimed success without a verified side effect
  (called the wrong tool or hallucinated the confirmation).

## Consequence for the "forced discovery" design (v2 intent)

Cutting the minimal set to 6 tools did NOT force discovery — the model reports
unavailability instead of searching. To measure the predictive-routing leg, the
system prompt must instruct discovery ("if a needed tool is not listed, call
tool_search first"). That is a v4 harness change, not yet implemented.
Until then: predictive-routing leg remains UNMEASURED (third consecutive run).

## Status

Exploratory pilot data only — NOT spec v1.2 / tasks v1.1 (gated on Robert).
Success parity + token/latency deltas are real measurements; the routing-leg
claim is still open.
