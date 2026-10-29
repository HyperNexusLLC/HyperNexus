---
description: "Store a plan to HyperNexus L2 memory from Claude Code. Trigger on '/hn-plan' or 'store plan'."
---

# /hn-plan <plan text>

$ARGUMENTS

Store the plan below via `mcp__hypernexus__add_memory` with tags `plan,claude-code`
(namespace `project`), then restate it as a short numbered step list the session
can execute against.

Keep scratchpad key `goal` in sync with the plan's objective
(`mcp__hypernexus__memory_scratchpad_set`) so the next session can resume.
