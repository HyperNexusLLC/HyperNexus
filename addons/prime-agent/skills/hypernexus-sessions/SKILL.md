---
name: hypernexus-sessions
description: "HyperNexus session lifecycle from Prime Agent: observe session boundaries, list sessions, handoff facts. Use when resuming work, handing off across sessions, or bootstrapping a new session."
---

# HyperNexus Sessions (Prime Agent)

Kernel baseline: `http://127.0.0.1:7778`.

## Lifecycle (all log `prime-agent-hook` observations to L2)

Prime Agent has no native hook API, so boundaries are observed explicitly:

- Session start → `session_bootstrap()` for starting context + log a
  `[prime-agent-hook:session_start]` fact via `hooks/hn-observe.py start`.
- Turn end → store tool-result turn summaries via `hooks/hn-observe.py turn`.
- Session end → `handoff(summary)` artifact + log a shutdown fact via
  `hooks/hn-observe.py end`. Next session resumes with `pickup(artifact)`.

## Listing / handoff

| Need | Call |
|---|---|
| Sessions | `sessions()` |
| Session context | `session_context()` |
| Bootstrap a new session | `session_bootstrap()` |
| Cross-session handoff | `handoff(summary)` → artifact, `pickup(artifact)` |
| Context bundles | `memory_context_save(key, content)`, `memory_context_get(key)` |
| Live agents | `prime-agent list` / `prime-agent agents` / `prime-agent sessions` |

Handoff pattern: store `type: "task"` facts with `agent:dispatch` tags;
the next session recalls them with `memory_search`. Command surface:
`/hn-recall`-style recall via `commands/hn-search.md`.

## Rules

- Observers never mutate session state and never stall a turn (~5s budget each).
- Shutdown always logs the handoff artifact id so the next session can pick it up.
