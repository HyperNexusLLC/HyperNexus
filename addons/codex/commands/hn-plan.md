---
user-invocable: true
name: hn-plan
description: "Store a plan to HyperNexus L2 memory from Codex. Trigger on '/skill:hn-plan' or 'store plan'."
---

# /skill:hn-plan <plan text>

Store the plan text as a durable L2 memory:

1. Call `hypernexus MCP add_memory` with `content` = plan text, `title` = `plan: <first 50 chars>`, `tags` = `plan,codex`, `namespace` = `project`.
2. Confirm with the returned id.
3. Suggest recalling it later via `/skill:hn-search` or `/skill:hn-session`.

On kernel-down, say the plan was not persisted and why. Never claim success without tool output.
