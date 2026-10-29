---
name: hypernexus-agents
description: Dispatch and track agent tasks with L2 persistence.
---

# HyperNexus Agents

Tools: `hypernexus_subagent`, `hypernexus_orchestrate`,
`hypernexus_session_list`, `hypernexus_session_search`,
`hypernexus_session_context`.

## Rules

- Multi-step work → `hypernexus_orchestrate` (records plan + harvests).
- Delegation → `hypernexus_subagent` (persists intent, executes inline).
- Resume → `hypernexus_session_search` + `hypernexus_session_context`.
