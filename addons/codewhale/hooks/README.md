# HyperNexus hooks for Codewhale (by-convention)

Codewhale bundles expose no hook API, so these scripts are **by-convention**:
run them manually, or follow them as policy. All are fire-and-forget, never
block, never read credentials.

| Script | When | Exit |
|---|---|---|
| `hn-session.mjs` | Session start — prints the RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY discipline as JSON hook context | 0 |
| `hn-rbac.mjs` | Before destructive shell work — deny-list RBAC guard (`rm -rf /`, `mkfs`, fork bomb, `format X:`, `del /`) | 0 allow / 2 deny |
| `hn-pre-tool.mjs` | Same gate with the pre-tool decision shape (`{decision, reason}`) | 0 allow / 2 deny |

Usage:

```bash
node addons/codewhale/hooks/hn-session.mjs
echo '{"tool_name":"bash","tool_input":{"command":"ls"}}' | node addons/codewhale/hooks/hn-rbac.mjs
```

The live equivalents inside a session are the `mcp__hypernexus__*` tools
(`search_memory` for recall, `system_status` for verify) — hooks never replace
them.
