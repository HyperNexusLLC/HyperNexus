# HyperNexus — Meta model wiring for MiMo (REFERENCE, no secrets inside)

Model: `muse-spark-1.3-contributor` via Meta's Model API.
Auth is read LIVE from pi's `auth.json` at every mint (pi owns OAuth refresh;
nothing is stored in this file or any config).

## Native surface: MiMo model picker

MiMoCode (`mimo`) is an OpenCode fork: pick the subscriber model in its native
model picker / config when it lists a Meta route. No config patching is needed
for that path.

## Subscription/OAuth path: live key from pi (bridge)

When you want the Meta subscription credential for direct Meta API calls from
inside a MiMo session, mint it live — exactly like the Droid `apiKeyHelper`
does:

```bash
# Check the mint works (key hidden):
node addons/mimo/bin/meta-muse-key.mjs --check

# Mint a key for the current shell only (never commit, never store):
export META_MUSE_API_KEY="$(node addons/mimo/bin/meta-muse-key.mjs)"
```

How it works (mirrors pi's own Meta OAuth flow,
`@earendil-works/pi-ai` `dist/auth/oauth/meta.js`):

1. Read identity token from `~/.pi/agent/auth.json` → `meta.refresh`
   (`META_AUTH_PATH` overrides the path).
2. `POST https://api.meta.ai/muse-code/key`
   (`META_KEY_MINT_URL` overrides) with `Authorization: Bearer <identity>`.
3. Print ONLY the minted `api_key` to stdout.

Bridge route through the kernel (the subscription credential only covers the
Responses API — a direct `chat/completions` call to Meta is rejected with
`client_attestation_denied`; the kernel translates it for you):

```bash
export META_MUSE_API_KEY="$(node addons/mimo/bin/meta-muse-key.mjs)"
curl -s http://127.0.0.1:7778/v1/chat/completions \
  -H "Authorization: Bearer $META_MUSE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"muse-spark-1.3-contributor","messages":[{"role":"user","content":"reply with exactly: META_OK"}]}'
```

Point any OpenAI-compatible client at `http://127.0.0.1:7778/v1` with model
`muse-spark-1.3-contributor` and the live-minted key above.

## MCP stdio

`node addons/mimo/install.js` merges the HyperNexus stdio server into
`~/.config/mimocode/mimocode.jsonc` (`mcp` key). `addons/mimo/mcp.json` is the
portable reference for that same server (command `hypernexus`/`hypernexus.exe`
+ `mcp` args, `mcp__hypernexus` tool namespace).

## Hooks (opt-in)

Copied install-time by `install.js` from `addons/mimo/mimocode/hooks/`
(`config.json`: session-start harvest, tool-error/decision fact capture) plus
the server-plugin lifecycle hooks (`session.pre/post`, `tool.execute.before/after`,
`actor.postStop`, `permission.ask`) registered via the `plugin` array — remove
either registration to run without hooks.

## Verify

```bash
node addons/mimo/bin/meta-muse-key.mjs --check   # expect: mint OK (key hidden)
```

If it reports an expired session (401/403), re-login in pi (`/login meta`
in pi) — identity tokens are not renewable; pi owns the refresh.

## Rules

- This file and the installer NEVER write the token or key anywhere.
- `auth.json` is read at call time, every time; pi rotation is picked up
  automatically. If the kernel proxy reports no credential, re-login in pi.
