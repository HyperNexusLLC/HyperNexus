# HyperNexus — Meta model wiring for mini-swe-agent (REFERENCE, no secrets inside)

Model: `muse-spark-1.3-contributor` via Meta's Model API.
Auth is read LIVE from pi's `auth.json` at every mint (pi owns OAuth refresh;
nothing is stored in this file or any config — the global `.env` holds only a
~24h snapshot copy, refreshed by re-running `install.mjs`).

## Route A (default): kernel bridge — subscription billing, no direct key

`install.mjs` writes the dotenv config consumed by mini-swe-agent:

- `MSWEA_MODEL_NAME=openai/muse-spark-1.3-contributor`
- `OPENAI_API_BASE=http://127.0.0.1:7778/v1` (Go kernel OpenAI-compat surface)
- `OPENAI_API_KEY=<live-minted key>` (snapshot; expires ~24h)

The key is minted at install time by the canonical shared minter, which replays
pi's own Meta OAuth flow (`@earendil-works/pi-ai` `dist/auth/oauth/meta.js`):

1. Read identity token from `~/.pi/agent/auth.json` → `meta.refresh`
   (`META_AUTH_PATH` overrides the path).
2. `POST https://api.meta.ai/muse-code/key`
   (`META_KEY_MINT_URL` overrides) with `Authorization: Bearer <identity>`.
3. Print ONLY the minted `api_key` to stdout.

```powershell
node addons/mini-swe-agent/install.mjs            # mint fresh key + write .env
node addons/mini-swe-agent/install.mjs --check    # verify model + endpoint
node addons/mini-swe-agent/bin/meta-muse-key.mjs --check   # mint works (key hidden)
```

Python equivalent (same flow, stdlib only, import-safe):

```powershell
python addons/mini-swe-agent/python/hypernexus_mini/meta_oauth.py --check
```

## Route B (alternative): direct Meta endpoint — own API billing

Point mini-swe-agent at Meta directly instead of the kernel bridge:

- `OPENAI_API_BASE=https://api.meta.ai/v1`
- `OPENAI_API_KEY=<your own Meta API key>`

Route B bypasses the kernel (no L2/tool routing on the model path) and bills
to your own key. The installer never writes this route; set it manually.

## Verify

```powershell
node addons/mini-swe-agent/bin/meta-muse-key.mjs --check   # expect: mint OK (key hidden)
python addons/mini-swe-agent/tests/test_miniswe_ext.py    # P5 pins muse-spark-1.3-contributor
```

If the mint reports an expired session (401/403), re-login in pi (`/login meta`
in pi) — identity tokens are not renewable; pi owns the refresh — then re-run
`install.mjs` to refresh the `.env` snapshot.

## Launcher: `use-meta-model.ps1` (minter pattern)

`.\use-meta-model.ps1` mints a FRESH key on every run via
`bin/meta-muse-key.mjs`, refreshes the `.env` snapshot (dotenv cannot reference
env vars), and verifies with `--check` — never pasted, never stored elsewhere.
Minted keys die in ~24h; a snapshot rots, so re-run before long sessions.

## Rules

- This file and the installer NEVER write the pi identity token anywhere.
- `auth.json` is read at mint time, every time — rotation in pi is picked up
  on the next mint.
- `META_AUTH_PATH` / `META_KEY_MINT_URL` env overrides exist for tests.
