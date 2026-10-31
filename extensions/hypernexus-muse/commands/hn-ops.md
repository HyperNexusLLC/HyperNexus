---
description: Run HyperNexus ops verify loop before/after a change
argument-hint: <change description>
---
For change `$ARGUMENTS`: first query `GET /health` and record the
baseline, describe the change to apply, then re-query `GET /health`
after acting and report any difference. Persist the outcome with
`POST /api/memory/facts/add` (tags `ops,deploy`). Never invent values.
