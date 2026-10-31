# HyperNexus — Meta model wiring for hax (REFERENCE, no secrets inside)

Model: `muse-spark-1.3-contributor` via Meta's Model API.
Auth is read LIVE from pi's `auth.json` at every call (pi owns OAuth refresh;
nothing is stored in this file or any config).

## Native surface: the `meta` preset (kernel proxy)

hax has no `/model` picker and no OAuth login flow for Meta, so this adapter
binds Meta through the `meta` custom provider installed by
`addons/hax/install.mjs`:

- provider `meta`: `openai-responses` → `http://127.0.0.1:7778/v1`
  (HyperNexus kernel OpenAI-compat proxy — live pi-OAuth token per request,
  immune to 24h rotation + subscription 403s), key via env
  `HAX_META_API_KEY` (`api_key_env`, never written to `config.json`).
- presets `meta` (daily driver) + `hn-worker` (HyperNexus worker role), both
  pinned to `muse-spark-1.3-contributor`.

```sh
node addons/hax/install.mjs              # provider + presets + skills + AGENTS overlay
eval "$(sh addons/hax/scripts/meta-env.sh)"  # live Meta key from pi auth.json
hax --preset meta                        # Meta Muse Spark 1.3 Contributor
```

## Subscription/OAuth path: live key from pi

Two live-only mechanisms (never snapshot a key — minted keys die in ~24h):

1. **Provider env (normal hax runs):** `scripts/meta-env.sh` reads the live
   `access` key from `~/.pi/agent/auth.json` (`META_AUTH_PATH` overrides are
   unnecessary — the script probes `$HOME`, `%USERPROFILE%`, and the repo
   owner's path), validates it, and exports `HAX_META_API_KEY` for the hax
   process only.

2. **Direct Meta API calls (minter pattern):** mint a fresh Model API key per
   invocation from pi's `meta.refresh` identity — exactly like the Droid
   `apiKeyHelper` does:

```bash
# Check the mint works (key hidden):
node addons/hax/bin/meta-muse-key.mjs --check

# Mint a key for the current shell only (never commit, never store):
export META_MUSE_API_KEY="$(node addons/hax/bin/meta-muse-key.mjs)"
```

How the minter works (mirrors pi's own Meta OAuth flow,
`@earendil-works/pi-ai` `dist/auth/oauth/meta.js`):

1. Read identity token from `~/.pi/agent/auth.json` → `meta.refresh`
   (`META_AUTH_PATH` overrides the path).
2. `POST https://api.meta.ai/muse-code/key`
   (`META_KEY_MINT_URL` overrides) with `Authorization: Bearer <identity>`.
3. Print ONLY the minted `api_key` to stdout.

Direct call example (OpenAI-compatible endpoint, key from step above):

```bash
export META_MUSE_API_KEY="$(node addons/hax/bin/meta-muse-key.mjs)"
curl -s https://api.meta.ai/v1/chat/completions \
  -H "Authorization: Bearer $META_MUSE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"muse-spark-1.3-contributor","messages":[{"role":"user","content":"reply with exactly: META_OK"}]}'
```

## Verify

```bash
node addons/hax/bin/meta-muse-key.mjs --check   # expect: mint OK (key hidden)
node addons/hax/install.mjs --check             # provider + presets + skills + overlay
```

If the mint reports an expired session (401/403), re-login in pi (`/login meta`
in pi) and re-source `meta-env.sh` — identity tokens are not renewable; pi owns
the refresh.

## Rules

- This file and the installer NEVER write the token or minted key anywhere.
- `auth.json` is read at call time, every time — rotation in pi is picked up
  automatically.
- `META_AUTH_PATH` / `META_KEY_MINT_URL` env overrides exist for tests.
