---
name: hypernexus-memory
description: Store and recall HyperNexus L2 memory facts, observations, handoffs.
---

# HyperNexus Memory

Tools: `hypernexus_memory_store`, `hypernexus_memory_search`,
`hypernexus_memory_vector_search`, `hypernexus_memory_list`,
`hypernexus_memory_delete`, `hypernexus_memory_update`,
`hypernexus_add_fact`, `hypernexus_record_observation`,
`hypernexus_memory_handoff`, `hypernexus_memory_stats`.

## Rules

- RECALL first: `hypernexus_memory_search` before tasks.
- PERSIST after: store patterns, decisions, fixes with tags
  (`project:<name>`, `pattern:<x>`, `failure:<x>`).
- Inline recall: write `@memory:<keyword>` in chat to expand L2 context.
- Session end: `/project:hn-summary` writes the handoff.
