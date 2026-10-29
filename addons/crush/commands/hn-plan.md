---
user-invocable: true
name: hn-plan
description: "Store a plan to HyperNexus L2 memory from Crush. Trigger on '/hn-plan' or 'store plan'."
---

# /hn-plan <plan text>

$ARGUMENTS

Store the plan below via `hypernexus MCP add_memory` with tags `plan,crush`
(namespace `project`), then restate it as a short numbered step list the session
can execute against.

Keep scratchpad key `goal` in sync with the plan's objective
(`hypernexus MCP memory_scratchpad_set`) so the next session can resume.
