# HyperNexus — Meta model wiring for Droid (REFERENCE, no secrets inside)

Model: `muse-spark-1.3-contributor` via Meta's Model API.
Auth is read LIVE from pi's `auth.json` on every request (pi owns OAuth
refresh; nothing is stored in this file or any config — the settings below
carry a helper COMMAND, never a key).

## Native surface: `~/.factory/settings.json` custom model (apiKeyHelper)

Droid reads custom models from `~/.factory/settings.json`. The HyperNexus
entry pins `meta/muse-spark-1.3-contributor` with an `apiKeyHelper` that mints
a fresh Model API key per request cycle (same minter pattern as the OpenCode
plugin's meta-auth — read pi identity `.meta.refresh`, POST to
`https://api.meta.ai/muse-code/key`, use the minted key; immune to 24h
rotation and subscription 403s):

```json
{
  "customModels": [
    {
      "name": "Meta-Muse-Spark",
      "model": "muse-spark-1.3-contributor",
      "provider": "generic-chat-completion-api",
      "baseUrl": "https://api.meta.ai/v1",
      "apiKeyHelper": "node <repo>/addons/droid/bin/meta-muse-key.mjs",
      "maxContextLimit": 1048576
    }
  ],
  "sessionDefaultSettings": {
    "model": "Meta-Muse-Spark"
  }
}
```

(`<repo>` = your HyperNexus checkout; the installer writes the absolute path.)

This exact block is what `node addons/droid/install.mjs` merges into
`~/.factory/settings.json` (idempotent — existing entries and your other
settings are preserved; pass `--no-model` to skip). The minter is exercised
by `node addons/droid/bin/test-droid-ext.mjs` sections 5–6.

## Subscription/OAuth path: live key from pi

```bash
# Check the mint works (key hidden):
node addons/droid/bin/meta-muse-key.mjs --check

# Mint a key for the current shell only (never commit, never store):
export META_MUSE_API_KEY="$(node addons/droid/bin/meta-muse-key.mjs)"
```

How the minter works (mirrors pi's own Meta OAuth flow,
`@earendil-works/pi-ai` `dist/auth/oauth/meta.js`):

1. Read identity token from `~/.pi/agent/auth.json` → `meta.refresh`
   (`META_AUTH_PATH` overrides the path).
2. `POST https://api.meta.ai/muse-code/key`
   (`META_KEY_MINT_URL` overrides) with `Authorization: Bearer <identity>`.
3. Print ONLY the minted `api_key` to stdout.

## MCP stdio

`install.mjs` registers the HyperNexus stdio server in `~/.factory/mcp.json`
(`mcpServers.hypernexus`, `hypernexus.exe mcp`, tool namespace
`mcp__hypernexus`); `addons/droid/plugin/hypernexus/mcp.json` is the
plugin-bundled copy of the same declaration.

## Hooks (opt-in)

`addons/droid/plugin/hypernexus/hooks/hooks.json` covers all 8 Droid lifecycle
events (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop,
SessionEnd, PreCompact, SubagentStop) with budgeted, never-throw scripts.
Uninstall the plugin (or remove the `hooks` block) to run without hooks.

## Verify

```bash
node addons/droid/bin/meta-muse-key.mjs --check   # expect: mint OK (key hidden)
node addons/droid/bin/test-droid-ext.mjs          # battery: layout, hooks, MCP, kernel, meta
```

If the mint reports an expired session (401/403), re-login in pi
(`/login meta` in pi) — identity tokens are not renewable; pi owns refresh.

## Rules

- This file and the installer NEVER write the token or key anywhere.
- `auth.json` is read at call time, every time; pi rotation is picked up
  automatically via the helper.
