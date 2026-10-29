---
name: hn-remember
description: "Quick-capture an observation to HyperNexus L2 memory from Jcode (alias of hn-store for habit). Trigger on '/hn-remember', 'note this', or 'remember'."
---

# /hn-remember <content> [--tags a,b]

$ARGUMENTS

Fast capture path — identical semantics to `/hn-store` with a shorter name for
habit use:

1. Call `mcp__hypernexus__add_memory` with the content, `tags`
   (comma-separated from `--tags`, default `jcode`), `category` `general`.
2. Confirm with the returned id. On kernel-down, say the memory was not
   persisted and why.
