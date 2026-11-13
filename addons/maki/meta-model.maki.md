# HyperNexus — Meta model wiring for Maki (REFERENCE, no secrets inside)

Model: `muse-spark-1.3-contributor` via Meta's Model API.
Auth is read LIVE at every call (pi owns OAuth refresh; nothing is stored in
this file or any config).

## Native surface: device-code OAuth in `meta_oauth.lua` (PRIMARY)

Maki's HyperNexus extension (`extensions/maki-hypernexus/`) ships a native
device-code OAuth flow in `lua/meta_oauth.lua` (mirrors pi's own Meta OAuth
flow, `@earendil-works/pi-ai` `dist/auth/oauth/meta.js`):

1. Credential order: maki plugin store → `META_MUSE_API_KEY` env → pi
   `auth.json` (`meta.refresh`).
2. Mint: `POST https://api.meta.ai/muse-code/key` with
   `Authorization: Bearer <identity>`; minted keys live ~24h.
3. Never logs or prints secret values (lengths only).

This is the most goal-compliant path: no shell tools, no pasted snapshots,
no stored tokens. Model spec: openai-responses at `https://api.meta.ai/v1`
(~1M context), registered as `meta/muse-spark-1.3-contributor`.

## Subscription/OAuth fallback: mint a Model API key live from pi

When you want the Meta subscription credential for direct Meta API calls
from a shell (e.g. kernel `/v1` translation probes), mint it live:

```text
node addons/maki/bin/meta-muse-key.mjs --check   (expect: mint OK, key hidden)
```

`bin/meta-muse-key.mjs` is a thin harness shim over the canonical shared
minter (`addons/shared/bin/meta-muse-key.mjs`, stdout = key-only contract):

1. Read identity token from `~/.pi/agent/auth.json` → `meta.refresh`
   (`META_AUTH_PATH` overrides the path).
2. `POST https://api.meta.ai/muse-code/key`
   (`META_KEY_MINT_URL` overrides) with `Authorization: Bearer <identity>`.
3. Print ONLY the minted `api_key` to stdout.

## Verify (`--check` only, key hidden)

```text
node addons/maki/bin/meta-muse-key.mjs --check   # expect: mint OK (key hidden)
node addons/maki/install.mjs --check             # expect: meta listed in `maki models`
```

If mint reports an expired session (401/403), re-login in pi (`/login meta`
in pi) — identity tokens are not renewable; pi owns the refresh.

## Launcher: `use-meta-model.ps1` (minter pattern)

`.\use-meta-model.ps1 "prompt"` mints a FRESH key on every run via
`bin/meta-muse-key.mjs` and uses it for that process only — never stored,
never pasted. Do not paste a snapshot token into your env: minted keys die
in ~24h and a snapshot rots.

## Rules

- This file and the installer NEVER write the token or minted key anywhere.
- `auth.json` is read at call time, every time — rotation in pi is picked up
  automatically.
- `META_AUTH_PATH` / `META_KEY_MINT_URL` env overrides exist for tests.

## Dual-model (spark default, wonder opt-in)

META_MODEL env selects the model: default `meta/muse-spark-1.3-contributor`, opt-in `meta/muse-wonder-1.0-contributor` (meta/ prefix tolerated); the one-shot flag becomes -m meta/$Model. Check accepts either model in the live catalog.
