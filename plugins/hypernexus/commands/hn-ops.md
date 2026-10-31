---
name: hn-ops
description: Run the HyperNexus ops verify loop before/after a change.
---

For the change described in the prompt: first record the baseline via the `hypernexus` MCP `system_status` tool (or `GET http://127.0.0.1:7778/health`), describe the change to apply, then re-query after acting and report any difference. Persist the outcome with `add_memory` (tags `ops,deploy`). Never invent values; if the kernel is offline, say so and continue locally.
