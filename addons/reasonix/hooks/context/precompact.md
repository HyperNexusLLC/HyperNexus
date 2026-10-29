# HyperNexus compaction guidance (Reasonix PreCompact context hook)

When summarizing this session, preserve everything needed to resume via
HyperNexus L2 memory:

- Facts already stored with `ext__hypernexus__memory_store` (do not
  duplicate them — reference their topics/tags).
- Key file paths touched, and why.
- Open goals, unresolved questions, and next steps (also worth a
  `ext__hypernexus__session_handoff` write with action `write`).
- Destructive or production-relevant actions taken (they are also in the
  audit trail via `ext__hypernexus__audit_log`).

Cross-session knowledge lives in HyperNexus L2 memory and can be recovered
with `ext__hypernexus__memory_search` / `ext__hypernexus__context_harvest`,
so the summary should carry pointers (topics, tags, handoff artifact names),
not full transcripts.
