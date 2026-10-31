---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for Codex CLI.
---

# HyperNexus for Codex CLI

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

The full installer writes the `[mcp_servers.hypernexus]` block into
`~/.codex/config.toml` plus skills and by-convention hooks:

```bash
node addons/codex-cli/install.mjs
node addons/codex-cli/install.mjs --check
```

Portable manual wiring (`hypernexus` resolved via `PATH`; see
`addons/codex-cli/mcp.json`):

```toml
[mcp_servers.hypernexus]
command = "hypernexus"
args = ["mcp"]

[mcp_servers.hypernexus.env]
HYPERNEXUS_URL = "http://127.0.0.1:7778"
HYPERNEXUS_WORKSPACE_ROOT = "<absolute-path-to-repo>"
```

(Kernel is on `http://127.0.0.1:7778`. `HYPERNEXUS_WORKSPACE_ROOT` is
required; `HYPERNEXUS_URL` is an optional override defaulting to `:7778`.)

## Available Tools

- `memory_scratchpad_get` - Get a memory
- `memory_scratchpad_set` - Save a memory
- `memory_search` - Search memories

## Usage

1. Install (see above), then mint the Meta model key into the shell
   (pi owns OAuth refresh; nothing is stored):

   ```powershell
   $env:META_API_KEY = "$(node addons/codex-cli/bin/meta-muse-key.mjs)"
   ```

2. Ask Codex CLI to remember things:

   ```
   Remember that we're using JWT with bcrypt for auth
   ```

3. In a new session, ask:

   ```
   What auth system did we implement?
   ```

## Verify Connection

```bash
node addons/codex-cli/install.mjs --check
node addons/codex-cli/bin/meta-muse-key.mjs --check
```
