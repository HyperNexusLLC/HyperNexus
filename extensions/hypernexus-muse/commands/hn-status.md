---
description: Report HyperNexus kernel health
argument-hint: none
---
Query `GET http://127.0.0.1:7778/health` and report `ok`, `service`,
`version`, and `uptimeSec`. If unreachable, say the kernel is down and
stop — do not invent values.
