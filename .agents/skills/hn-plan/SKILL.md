---
user-invocable: true
name: hn-plan
description: "Store a plan to HyperNexus L2 memory from Freebuff. Trigger on '/skill:hn-plan' or 'store plan'."
---

# /skill:hn-plan <plan text>

Store the plan below via `hypernexus MCP add_memory` with tags `plan,freebuff`
(namespace `project`), then restate it as a short numbered step list the session
can execute against.

Keep scratchpad key `goal` in sync with the plan's objective
(`hypernexus MCP memory_scratchpad_set`) so the next session can resume.
