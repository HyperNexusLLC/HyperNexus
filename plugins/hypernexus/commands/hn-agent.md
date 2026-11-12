---
name: hn-agent
description: Dispatch a HyperNexus agent call (tool, chat, swarm, A2A).
---

Dispatch one HyperNexus agent call for the prompt arguments via the `hypernexus` MCP tools (`mcp_call_tool`, `mcp_list_tools`, `mcp_status`) or HTTP `http://127.0.0.1:7778` when MCP is unreachable:

- `tool` — `POST /api/agent/tool` with `{"tool":"<name>","arguments":{...}}`; single tool execution.
- `chat` — `POST /api/agent/chat` with `{"message":"<text>"}`; one agent chat turn.
- `swarm` — `POST /api/agent/swarm/start`, transcript via `GET /api/agent/swarm/transcript`.
- `broadcast` — `POST /api/agent/a2a/broadcast` (agents at `GET /api/agent/a2a/agents`).
- Supervisor-gated work: `POST /api/agent/supervisor/evaluate`, `POST /api/agent/director/start`.

Parse the first word of the prompt as the verb above; pass the rest as the payload. If the kernel is unreachable, say so and stop — never invent tool output.
