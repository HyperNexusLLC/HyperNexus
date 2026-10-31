# pi HyperNexus extension

Full bridge between pi (`@earendil-works/pi-coding-agent`) and the HyperNexus
control plane (Go kernel, `http://127.0.0.1:7778`). Pi is the **OAuth owner**:
every other harness mints through pi's `~/.pi/agent/auth.json` identity.

## What you get

| Surface | Mechanism | Detail |
|---|---|---|
| **Tools** | `hypernexus.ts` ExtensionAPI | 22 custom tools: memory store/search/list/vector, tool search + suggestions, sessions, skills, code search, repomap, knowledge graph, context harvest, scratchpad, system + billing status, subagent dispatcher |
| **Hooks** | same file | session priming, per-turn harvest, FTS injection (hot-path budgeted), tool-suggestion monitor, RBAC, tool-result auto-storage, model-select tracking, `@memory:key` expansion |
| **Commands** | same file | 7 slash commands (`/tn-store`, `/tn-search`, `/tn-status`, `/tn-plan`, `/tn-purge`, `/tn-summary`, `/tn-orchestrate`) |
| **UI** | same file | live editor widget, footer, `Ctrl+Shift+M/T/P` shortcuts, inter-extension event bus |
| **MCP** | `mcp.pi.json` → `~/.pi/agent/mcp.json` | `mcpServers.hypernexus` stdio via `bin/hypernexus.exe mcp` |
| **Skills** | `~/.pi/agent/skills/` (auto-loaded) | hypernexus, hypernexus-ops, hypernexus-workflows |
| **Meta model** | `meta-model.pi.md` | pi-native: `defaultProvider: meta`, `defaultModel: muse-spark-1.3-contributor`; `auth.json` `meta` OAuth block (pi refreshes it) |

## Install

```powershell
node addons/pi/install.mjs            # extension -> ~/.pi/agent/extensions/ + MCP merge
node addons/pi/install.mjs --check    # verify extension + MCP + OAuth + model pin
node addons/pi/install.mjs --uninstall
```

## Model

No mint helper lives here — pi **is** the mint source. Other harnesses call
`addons/<harness>/bin/meta-muse-key.mjs` (`meta.refresh` → `POST
https://api.meta.ai/muse-code/key`, stdout only). If that reports a dead
session, re-auth inside pi with `/login meta`.

## Tests

```powershell
node bin/test-pi-ext-hooks.mjs
node bin/test-pi-ext-edge.mjs
node bin/test-pi-tools-all.mjs
```
