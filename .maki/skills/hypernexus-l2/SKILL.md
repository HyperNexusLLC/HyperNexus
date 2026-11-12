---
name: hypernexus-l2
description: Deep L2 recall: vector search, knowledge graph, scratchpad, cold archive.
---

# HyperNexus L2 Deep Recall

Tools: `hypernexus_memory_vector_search`, `hypernexus_knowledge_graph`,
`hypernexus_scratchpad`, `hypernexus_context_harvest`.

## Rules

- Fuzzy/conceptual recall → vector search, not keyword search.
- Working state → scratchpad (`get`/`set`/`append` by key).
- Harvest (`hypernexus_context_harvest`) bundles memories + recent
  sessions: use it at the start of any multi-step task.
