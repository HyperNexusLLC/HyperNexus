---
description: Dispatch a HyperNexus agent call (tool, chat, swarm, A2A)
argument-hint: <tool|chat|swarm|broadcast> <args>
---
Dispatch one HyperNexus agent call for `$ARGUMENTS`:

- `tool` — `POST http://127.0.0.1:7778/api/agent/tool`
  with `{"tool":"<name>","arguments":{...}}`; single tool execution.
- `chat` — `POST http://127.0.0.1:7778/api/agent/chat`
  with `{"message":"<text>"}`; one agent chat turn.
- `swarm` — `POST http://127.0.0.1:7778/api/agent/swarm/start`,
  transcript via `GET /api/agent/swarm/transcript`.
- `broadcast` — `POST http://127.0.0.1:7778/api/agent/a2a/broadcast`
  (agents listed at `GET /api/agent/a2a/agents`).
- Supervisor-gated work: `POST /api/agent/supervisor/evaluate`,
  `POST /api/agent/director/start`.

Parse the first word of `$ARGUMENTS` as the verb above; pass the rest
as the payload. Over MCP stdio the same verbs are `mcp_call_tool`,
`mcp_list_tools`, and `mcp_status`. If the kernel is unreachable, say
so and stop — never invent tool output.
