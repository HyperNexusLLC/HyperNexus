---
description: Resume context from imported coding sessions
argument-hint: "<query>"
---

Resume prior work from imported sessions:

1. Call `ext__hypernexus__session_search` with the query.
2. If a session looks relevant, pull continuity with `ext__hypernexus__session_context`.
3. Summarize the goal, key files, and next steps — do not dump raw rows.

$ARGUMENTS
