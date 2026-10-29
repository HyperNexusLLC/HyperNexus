---
name: hypernexus-workflows
description: "HyperNexus workflows from Prime Agent: dispatch-via-L2 pattern, durable multi-step work, command surface. Use when running or monitoring multi-step kernel workflows."
---

# HyperNexus Workflows (Prime Agent)

Kernel baseline: `http://127.0.0.1:7778`.

## Pattern: durable multi-step work

1. Dispatch — persist intent as an L2 task fact (`agent:dispatch` tags, see
   `hypernexus-agents`); optionally notify a worker via `prime-agent send`.
2. Work turns execute inline in the Python REPL; each tool-result turn logs a
   summary fact (`hooks/hn-observe.py turn --summary "..."`).
3. Status — `system_status()` / `sessions()` for kernel-side state; keep
   payloads truncated (≤2000 chars).
4. Resume — `pickup(artifact)` or `memory_search` on the task id; next session
   continues from L2 facts.
5. Autonomous runs — `prime-agent --autonomous --autonomous-gate <command>`
   with a HyperNexus status gate from `hypernexus-status-billing`.

## Surfaces

- Tool recommendations for a job: `tool_context(limit)`, `mcp_search_tools(query)`.
- Knowledge ingest for workflow inputs: `knowledge_ingest(content, source)`.
- Long workflows persist state in L2; they do not detach. Say so when the user
  expects fire-and-forget execution (use `schedule add` for deferred prompts).

## Rules

- One workflow = one task fact chain; update by appending, never editing.
- Truncate raw kernel JSON before pasting into prompts (≤2000 chars).
