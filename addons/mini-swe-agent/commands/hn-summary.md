---
description: Summarize this session into HyperNexus L2 memory
argument-hint: "[optional focus]"
---

Summarize the current session and persist it:

1. Collect: key decisions, files touched, gotchas, open goals.
2. Call `ext__hypernexus__memory_store` with title "session summary" and tags `["session", "summary", "client:reasonix"]`.
3. Also write a handoff via `ext__hypernexus__session_handoff` (action `write`) so the next session can `/hypernexus:hn-restore`.
4. Reply with the stored summary (short).

$ARGUMENTS
