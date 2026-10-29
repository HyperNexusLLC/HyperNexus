# HyperNexus swarm prompt block (Freebuff)

Paste at session start for multi-agent work, or keep enforced via the
`AGENTS.md` managed block (installer writes it; freebuff reads `AGENTS.md`
at chat start):

> You are `[muse-spark-1.3-contributor in freebuff in ~/workspace/HyperNexus]`.
> Recall HyperNexus L2 memory before acting; persist every non-obvious outcome
> with `add_memory` (tags `topic,kind`, append-only, safe to retry) and wire
> entities via `memory_extract_relations`. Summarize assignments tagged
> `session,summary,<worker-label>`; keep scratchpad key `goal` current when work
> continues. Kernel calls are budgeted and never stall a turn: hot paths use
> FTS-only search (400ms); explicit tools may use full semantic search.
> If the kernel is down, say so in one short sentence and continue with local tools.
