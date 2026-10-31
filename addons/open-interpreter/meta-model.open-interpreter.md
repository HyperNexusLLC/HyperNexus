# HyperNexus — Meta model wiring for Open Interpreter (REFERENCE, no secrets inside)

Model: `muse-spark-1.3-contributor` via Meta's Model API.
Auth is read LIVE from pi's `auth.json` at every call (pi owns OAuth refresh;
nothing is stored in this file or any config).

## Native surface: Open Interpreter model config

Open Interpreter talks to any OpenAI-compatible endpoint via its
`~/.openinterpreter/config.toml` (`model` + `api_base` +
`api_key`). Point `api_base` at `https://api.meta.ai/v1`, set `model` to
`muse-spark-1.3-contributor`, and feed `api_key` from the live mint below —
no config needed beyond that.

## Subscription/OAuth path: mint a Model API key live from pi

When you want the Meta subscription credential (not a pasted snapshot) for
direct Meta API calls from inside an Open Interpreter session, mint it live
— exactly like the Droid `apiKeyHelper` does:

```bash
# Check the mint works (key hidden):
node addons/open-interpreter/bin/meta-muse-key.mjs --check

# Mint a key for the current shell only (never commit, never store):
export META_MUSE_API_KEY="$(node addons/open-interpreter/bin/meta-muse-key.mjs)"
```

How it works (mirrors pi's own Meta OAuth flow,
`@earendil-works/pi-ai` `dist/auth/oauth/meta.js`):

1. Read identity token from `~/.pi/agent/auth.json` → `meta.refresh`
   (`META_AUTH_PATH` overrides the path).
2. `POST https://api.meta.ai/muse-code/key`
   (`META_KEY_MINT_URL` overrides) with `Authorization: Bearer <identity>`.
3. Print ONLY the minted `api_key` to stdout.

Direct call example (OpenAI-compatible endpoint, key from step above):

```bash
export META_MUSE_API_KEY="$(node addons/open-interpreter/bin/meta-muse-key.mjs)"
curl -s https://api.meta.ai/v1/chat/completions \
  -H "Authorization: Bearer $META_MUSE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"muse-spark-1.3-contributor","messages":[{"role":"user","content":"reply with exactly: META_OK"}]}'
```

## Verify

```bash
node addons/open-interpreter/bin/meta-muse-key.mjs --check   # expect: mint OK (key hidden)
```

If it reports an expired session (401/403), re-login in pi (`/login meta`
in pi) — identity tokens are not renewable; pi owns the refresh.

## Launcher: `use-meta-model.ps1` (minter pattern)

`.\use-meta-model.ps1 "prompt"` mints a FRESH key on every run via
`bin/meta-muse-key.mjs` and uses it for that process only — never stored,
never pasted. Do not paste a snapshot token into your env: minted keys die
in ~24h and a snapshot rots. (Per the open-interpreter lane's note to all
harnesses: snapshot bridges must move to the minter pattern on expiry.)

## Rules

- This file and the installer NEVER write the token or minted key anywhere.
- `auth.json` is read at call time, every time — rotation in pi is picked up
  automatically.
- `META_AUTH_PATH` / `META_KEY_MINT_URL` env overrides exist for tests.
