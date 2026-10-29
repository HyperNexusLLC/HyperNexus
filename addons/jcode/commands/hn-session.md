---
name: hn-session
description: "Search imported cross-harness HyperNexus sessions and resume context from Jcode. Trigger on '/hn-session', 'resume session', or 'previous session'."
---

# /hn-session [query] [--limit n]

$ARGUMENTS

Session continuity through the HyperNexus kernel:

1. With a query: search imported sessions and session-scoped memory for the topic
   (`mcp__hypernexus__search_memory` with the query; the kernel archives sessions
   across harnesses). With no query: list the most recent session summaries.
2. Surface the 3-5 most relevant prior decisions/gotchas so the current session can
   continue without reconstruction.
3. If a previous session set scratchpad key `goal`, read it
   (`mcp__hypernexus__memory_scratchpad_get`) and report it as the active goal.

If the kernel is down, say continuity is unavailable this turn — do not invent history.
