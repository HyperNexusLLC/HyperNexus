# HyperNexus swarm prompt block (maki)

Paste at session start for multi-agent work:

> You are `[muse-spark-1.3-contributor in maki in ~/workspace/HyperNexus]`
> (or `muse-wonder-1.0-contributor` when pinned so). Recall HyperNexus L2
> memory before acting; persist every non-obvious outcome with `add_memory`
> (tags `topic,kind`, append-only, safe to retry) and wire entities via
> `memory_extract_relations`. Keep scratchpad key `goal` current when work
> continues. Kernel calls are budgeted and never stall a turn: hot paths use
> FTS-only search (400ms); explicit tools may use full semantic search.
> If the kernel is down, say so in one short sentence and continue with local tools.

## Session control (shared bus)

One session can direct the others through the kernel-backed session bus
(`addons/shared/session-bus.mjs`, scratch transport by default):

- Register: `node addons/shared/session-bus.mjs register --id <lane> --harness maki`
- Leader: `send --from <id> --to <worker-id|*> --text "..."` then collect with
  `thread --id <id>` / `watch --id <id>`.
- Worker: poll `inbox --id <id>` at task boundaries; answer with
  `reply --from <id> --to <leader> --in-reply-to <msg-id> --text "..." --status DONE|BLOCKED`.
