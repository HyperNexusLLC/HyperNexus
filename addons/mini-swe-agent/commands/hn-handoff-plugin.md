---
name: hn-handoff
description: Write a HyperNexus session handoff so the next session (any harness) can resume cleanly.
---

Write a session handoff via the `hypernexus` MCP `session_handoff` tool (action=write). Include: current goal, what was done ($ARGUMENTS if provided, else infer from context), what failed, and exactly what the next session must do. Then confirm the handoff artifact name.
