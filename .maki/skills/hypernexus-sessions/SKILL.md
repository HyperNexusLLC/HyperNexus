---
name: hypernexus-sessions
description: Session recall, context bootstrap, handoff write/pickup.
---

# HyperNexus Sessions

Tools: `hypernexus_session_list`, `hypernexus_session_search`,
`hypernexus_session_context`, `hypernexus_memory_handoff`.

Commands: `/project:hn-session`, `/project:hn-summary`.

## Rules

- New session after a break → search + context + handoff pickup.
- Ending → `/project:hn-summary` (handoff write).
