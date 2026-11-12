---
name: hn-plan
description: "Store a plan to HyperNexus L2 memory from Prime Agent. Trigger on '/hn-plan' or 'store plan'."
---

# /hn-plan <plan text>

$ARGUMENTS

Store the plan below via `await hypernexus.memory_fact("plan", text, tags=["plan", "prime-agent"])`
(namespace `project`), then restate it as a short numbered step list the session
can execute against.

Keep scratchpad key `goal` in sync with the plan's objective
(`await hypernexus.scratchpad_set("goal", ...)`) so the next session can resume.
