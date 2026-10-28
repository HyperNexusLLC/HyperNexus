---
name: hn-memory-search
description: Search HyperNexus L2 memory (keyword + semantic) before re-deriving known answers.
---

Search HyperNexus memory for: $ARGUMENTS

Use the `hypernexus` MCP tools — `memory_fts_search` for fast keyword loops, `memory_vector_search` for semantic/paraphrased recall. Summarize the top hits with their tags; if nothing matches, say so and proceed without inventing.
