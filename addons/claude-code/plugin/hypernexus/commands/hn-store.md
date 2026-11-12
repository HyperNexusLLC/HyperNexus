---
description: Store a fact in HyperNexus L2 memory with tags for cross-session recall
---

Save information to HyperNexus L2 memory:

1. **Identify content** — Extract the key information (decision, pattern, convention, finding).
2. **Tag** — Add relevant tags (e.g. `project:foo`, `pattern`, `api`, `decision`).
3. **Store** — Use `mcp__hypernexus__add_memory` with the content and tags array
   (fallback: `POST http://127.0.0.1:7778/api/memory/facts/add`).
4. **Confirm** — Summarize what was saved.

Example: `/hn-store The project uses React 19 with Vite and pnpm workspaces.`

Arguments: $ARGUMENTS
