# HyperNexus operating rules

- Treat the local HyperNexus Go kernel as authoritative; never invent successful tool calls or memory writes.
- Use RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY for multi-step HyperNexus work.
- Use the `hypernexus` MCP server for explicit operations. If it is unavailable, state that clearly and use local tools where possible.
- Keep automatic hook work bounded. Only expand memory when the user explicitly writes `@memory:`.
- Do not persist secrets, credentials, or raw user prompts as memory.
