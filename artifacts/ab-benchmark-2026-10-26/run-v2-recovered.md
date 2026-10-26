# A/B Benchmark v2 — recovered record (honest note)

The raw `results.jsonl` for run v2 was overwritten at the start of run v3 (the
harness cleared the shared filename on startup — a harness flaw, now fixed by
rotating prior runs to timestamped files). This file recovers the complete
per-task record from `run-v2.log` console lines.

**Status: v2 is NOT a reportable dataset.** Known defects found post-run:
1. **LM Studio unloaded the model mid-run** — `peer_keepalive_timeout` killed
   the last 5 Mode B tasks (`LM HTTP 400`). The 88% vs 57% success split is
   infra noise, not a measurement. Run v3 therefore uses Ollama (24h keep-alive).
2. **Residual prompt-leak** in `shell-echo`/`hello` verify targets (the token
   appeared in the prompt, so response-echo could pass). Run v3 verifies via the
   kernel audit trail (`.hypernexus/audit/audit-*.jsonl`) instead of response text.
3. **180s model timeouts too tight** for a thinking model with a 4.6K-token
   catalog — 4 Mode A tasks died as harness timeouts. Run v3 uses 300s.

## Per-task rows (from run-v2.log)

```
  [A] store-memory    success=1 toolTok=4607 ctxBefore=4681 ctxAfter=632 latency=172959ms calls=2 err=0
  [A] search-memory HARNESS ERROR: TimeoutError: The operation was aborted due to timeout
  [A] shell-echo      success=1 toolTok=4607 ctxBefore=4674 ctxAfter=530 latency=136809ms calls=1 err=0
  [A] scratchpad      success=1 toolTok=4607 ctxBefore=4692 ctxAfter=489 latency=98041ms calls=2 err=0
  [A] tool-discovery HARNESS ERROR: TimeoutError: The operation was aborted due to timeout
  [A] status          success=1 toolTok=4607 ctxBefore=4667 ctxAfter=844 latency=118350ms calls=2 err=0
  [A] hello           success=1 toolTok=4607 ctxBefore=4682 ctxAfter=625 latency=182558ms calls=1 err=0
  [A] jira-honesty    success=0 toolTok=4607 ctxBefore=4683 ctxAfter=505 latency=128409ms calls=0 err=0
  [A] pipeline        success=1 toolTok=4607 ctxBefore=4673 ctxAfter=507 latency=104397ms calls=1 err=0
  [A] list-tools HARNESS ERROR: TimeoutError: The operation was aborted due to timeout
  [A] browser-status HARNESS ERROR: TimeoutError: The operation was aborted due to timeout
  [A] session-search  success=1 toolTok=4607 ctxBefore=4675 ctxAfter=1282 latency=169549ms calls=2 err=0
  [B] store-memory    success=1 toolTok=172 ctxBefore=246 ctxAfter=308 latency=25814ms calls=1 err=0
  [B] search-memory   success=0 toolTok=172 ctxBefore=245 ctxAfter=302 latency=28803ms calls=0 err=0
  [B] shell-echo      success=1 toolTok=172 ctxBefore=239 ctxAfter=623 latency=79210ms calls=0 err=0
  [B] scratchpad      success=0 toolTok=172 ctxBefore=257 ctxAfter=442 latency=49112ms calls=0 err=0
  [B] tool-discovery  success=1 toolTok=172 ctxBefore=238 ctxAfter=289 latency=29255ms calls=0 err=0
  [B] status          success=1 toolTok=172 ctxBefore=232 ctxAfter=595 latency=72757ms calls=1 err=0
  [B] hello           success=0 toolTok=172 ctxBefore=247 ctxAfter=275 latency=40464ms calls=0 err=0
  [B] jira-honesty HARNESS ERROR: Error: LM HTTP 400: {"error":"LM Link connection entered error state peer_keepalive_timeout"}
  [B] pipeline HARNESS ERROR: Error: LM HTTP 400: ...
  [B] list-tools HARNESS ERROR: Error: LM HTTP 400: ...
  [B] browser-status HARNESS ERROR: Error: LM HTTP 400: ...
  [B] session-search HARNESS ERROR: Error: LM HTTP 400: ...
```

## v2 aggregate (as printed by the run)

| Metric | Mode A (full catalog) | Mode B (progressive disclosure) |
|---|---|---|
| Tasks (clean) | 8 | 7 |
| Task success | 7/8 (88%) | 4/7 (57%) |
| Miss rate | 13% | 43% |
| Tool tokens (avg) | 4607 | 172 |
| Context tokens before (avg) | 4678 | 243 |
| Context tokens after (avg) | 677 | 405 |
| Model latency (avg ms) | 138884 | 46488 |
| Tool calls (total) | 11 | 2 |
| Tool errors (total) | 0 | 0 |
| Discovery used (tasks) | 0 | 0 |

Two useful signals survive despite the infra noise: the Mode B tool-token
footprint (172 vs 4607) is a direct measurement of progressive disclosure, and
`jira-honesty` in Mode A failed with **0 tool calls** — the model answered about
the Jira issue without invoking `jira_create_issue` at all (diagnosis: the verify
regex is correct against the real tool output `[NOT CREATED — Jira is not
configured; simulated demo output]`, so the failure is model behavior, not a
broken check). Run v3's `final_snippet` field captures the model's final text
for exactly this diagnosis.
