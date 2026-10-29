---
description: Capture a HyperNexus session handoff summary
argument-hint: <summary>
---
Persist `$ARGUMENTS` as a session summary via
`POST http://127.0.0.1:7778/api/memory/session-summaries/capture` with
JSON `{"sessionId":"<current session id>","status":"active","summary":"$ARGUMENTS"}`
(`sessionId` and `status` are required; `summary` holds the text) and
set scratchpad key `goal` to the next step. Confirm what was stored. If
unreachable, say so and stop.
