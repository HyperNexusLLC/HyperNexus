# A/B run v4 — the discovery leg is MEASURABLE (2026-10-27, 11:35 UTC)

Harness: v4 (Mode B system prompt carries a one-line discovery instruction).
Engine: Ollama `gemma-4-heretic:latest` (summary now labels this correctly).
24/24 rows, 1 harness timeout (A/search-memory, TimeoutError escaped both
900s attempts — recorded honestly in the row, not hidden).

Result: 6/12 vs 6/12 (parity), `discovery_used` B=2 / A=0.

## The two discovery tasks (both succeeded)

- **B/hello**: calls=2 — model called tool_search, got hello_world added to its
  toolset, invoked it, reported the greeting. End-to-end predictive routing.
- **B/list-tools**: calls=1, disc=true — model searched, then listed the
  discovered tools.

## What the instruction changed (and didn't)

- v2/v3: 0 discoveries across 48 Mode B tasks — the model reported
  unavailability instead of searching.
- v4: 2/12 Mode B tasks discovered. The leg is now measurable but weak:
  10/12 tasks still answer "no such tool" without searching (search-memory,
  shell-echo, scratchpad-claim, tool-discovery, jira-honesty).
- Mode A misses remain needle-in-haystack (tool-discovery, jira-honesty deny
  tools that ARE in the 58-schema catalog).

## Reading of the result (pilot, not proof)

Progressive disclosure holds success parity at ~1/27th the tool tokens, and
with the instruction hint the model CAN route through discovery to success.
But 2/12 is a thin leg: the hint helps only when the model bothers to use it.
Stronger instruction placement (or a tool_choice bias toward search on
unknown-tool intent) is the v5 lever. Spec v1.2 track still gated on Robert.
