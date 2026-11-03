---
description: Show HyperNexus saved context state
argument-hint: [context-id]
---
List saved contexts via `GET http://127.0.0.1:7778/api/memory/contexts`.
If `$ARGUMENTS` names an id, fetch it via
`GET http://127.0.0.1:7778/api/memory/context/get?id=<id>` and report
its contents. If unreachable, say so and stop.
