---
name: hn-session
description: "Resume HyperNexus session context and hand off across Prime Agent sessions. Trigger on '/hn-session', 'resume session', or 'previous session'."
---

# /hn-session [query] [--limit n]

$ARGUMENTS

Session continuity through the HyperNexus kernel:

1. With a query: `await hypernexus.memory_search(query)` for the topic
   (the kernel archives sessions across harnesses). With no query:
   `await hypernexus.sessions()` + `await hypernexus.session_context()`.
2. Surface the 3-5 most relevant prior decisions/gotchas so the current session can
   continue without reconstruction.
3. If a previous session set scratchpad key `goal`, read it
   (`await hypernexus.scratchpad_get("goal")`) and report it as the active goal.
   New sessions start with `await hypernexus.session_bootstrap()`.

If the kernel is down, say continuity is unavailable this turn — do not invent history.
