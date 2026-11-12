# HyperNexus MiMo Addons

Full-featured HyperNexus integration for **MiMoCode CLI** and **MiMo Desktop**.

## Extension surfaces

MiMoCode (a fork of OpenCode) exposes a first-class **Plugin SDK** — `@mimo-ai/plugin` —
that is the direct analog to Pi's ExtensionAPI. This addon uses **every** available
surface, not just MCP + markdown:

| Surface | Mechanism | Status |
|---|---|---|
| **Typed tools** | `@mimo-ai/plugin` `tool({description, args, execute})` (zod args) | **Server plugin — verified** |
| **Conversation monitor** | `chat.message` hook → non-blocking `/api/mcp/tool-suggestions` | **Server plugin** |
| **System context injection** | `experimental.chat.system.transform` | **Server plugin** |
| **Retrieval-augmented L2 memory** | `chat.message`/`session.pre` warm cache → `system.transform` injects cross-session context | **Server plugin** |
| **Tool observation** | `tool.execute.before` + `tool.execute.after` hooks (signal for the monitor) | **Server plugin** |
| **Session lifecycle** | `session.pre` (warm) + `session.post` (context harvest) hooks | **Server plugin** |
| **Actor/subagent lifecycle** | `actor.postStop` hook | **Server plugin** |
| **Permission hints** | `permission.ask` hook (auto-allow read-only tools) | **Server plugin** |
| **Progressive catalog routing** | `hypernexus_search_tools` over 50K+ MCP tools (`/api/tools/search`) | **Server plugin** |
| **Slash commands + toast/dialog** | `@mimo-ai/plugin/tui` `command.register` + `ui.toast` | **TUI plugin** (interactive mode) |
| MCP config | `mimocode.jsonc` `mcp` key | install-time |
| Skills | `SKILL.md` folders | install-time |
| Markdown commands | `.mimocode/commands/hn-*.md` | install-time |
| Custom agent | `.mimocode/agents/hypernexus-orchestrator.md` | install-time |
| MiMo Desktop tools | `engine-config/tools/*.js` | install-time |

## Plugin layout

```
addons/mimo/plugin/
  hypernexus/        # server plugin — typed tools + hooks (THE core)
    package.json
    index.js         # export const server = (input, options) => ({ tool, "chat.message", ... })
    node_modules/    # junction -> ~/.mimocode/node_modules (so `import "@mimo-ai/plugin"` resolves)
  hypernexus-tui/    # TUI plugin — slash commands + toast (interactive mode)
    package.json
    tui.js           # export const tui = (api, options) => { api.command.register(...) }
    node_modules/    # junction -> ~/.mimocode/node_modules
```

### Registered tools (server plugin)

`hypernexus_status`, `hypernexus_search_tools`, `hypernexus_suggest_tools`,
`hypernexus_mcp_status`, `hypernexus_mcp_servers`, `hypernexus_mcp_tools`,
`hypernexus_memory_search`, `hypernexus_memory_store`, `hypernexus_context_harvest`.

All are typed with zod args and call the kernel on `:7778` (override with
`options.baseUrl` or `HYPERNEXUS_URL`). Every kernel call is **budgeted and never
throws** — a hung kernel degrades to a short note rather than stalling the turn.

## Install

```bash
node addons/mimo/install.js    # installs skills, commands, hooks, agents, MCP + plugins
```

The installer:
1. Copies skills / commands / hooks / agents into `~/.config/mimocode/`
2. **Links each plugin's `node_modules` to `~/.mimocode/node_modules`** (a Windows
   junction / Unix symlink) so `import "@mimo-ai/plugin"` resolves at boot. Without
   this the plugin fails with `Cannot find module '@mimo-ai/plugin'`.
3. Registers both plugin paths in the config `plugin` array.
4. **Strips any UTF-8 BOM** from `mimocode.jsonc` (MiMoCode's config parser is strict
   and a BOM breaks `mimo plugin` / config writes).

## Notes & gotchas (from building this)

- **Plugin spec format** is an absolute **package-directory path** in the config
  `plugin` array (`"C:\\...\\plugin\\hypernexus"`). Raw file paths to `.js`, `file://`
  URLs, and bare module names are **not** resolved — only a directory with a
  `package.json` (`type: module`, `main`) is. `mimo plugin <path> -g` writes this entry
  for you ("Detected server target").
- **`import { tool } from "@mimo-ai/plugin"`** works only when the plugin can resolve
  `@mimo-ai/plugin`. The junction in step 2 fixes this. `tool.schema` is zod.
- **BOM in `mimocode.jsonc`** makes `mimo plugin` fail with `InvalidJSON ... InvalidSymbol
  at line 1`. Always write config as UTF-8 without BOM.
- **TUI plugins** only receive a real `TuiPluginApi` in interactive `mimo`; headless
  `mimo run` calls the export without a command-capable `api`, so `tui.js` returns `{}`
  and the loader logs a benign `did not return a hook object` skip. Slash commands are
  also provided as markdown (`hn-*.md`) as a reliable fallback.

## Build & Install (Desktop tools)

```bash
node addons/mimo/generate.mjs     # regenerate sources (optional)
node addons/mimo/build-tools.mjs  # bundle Desktop tools with zod (esbuild)
node addons/mimo/install.js       # install everything
```

## Requirements

- HyperNexus binary (`hypernexus.exe mcp`) — kernel on port 7778
- Node 20+
- MiMoCode (`mimo`) with `@mimo-ai/plugin` available at `~/.mimocode/node_modules`
