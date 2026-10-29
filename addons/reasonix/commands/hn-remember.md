---
description: Store a decision or insight to HyperNexus L2 with the decision tag
argument-hint: "<decision or insight> [--tags a,b]"
---

Remember a decision:

1. Call `ext__hypernexus__memory_store` with the text, title (first 60 chars), tags `["decision"]` plus any `--tags` values, namespace `project`.
2. Confirm with a one-line echo.

$ARGUMENTS
