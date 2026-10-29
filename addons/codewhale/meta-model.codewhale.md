# HyperNexus — Meta model wiring for Codewhale (REFERENCE, no secrets inside)

Model: `meta/muse-spark-1.3-contributor` via the Meta Model API (1M context).
Auth is read LIVE from pi's `auth.json` on every mint (pi owns OAuth refresh;
nothing is stored in this file or any config).

## Native surface: the `meta` provider route (already live)

Codewhale 0.10.2+ natively ships a `meta` provider route — endpoint
`https://api.meta.ai/v1`, api-key auth, and `muse-spark-1.3-contributor` in its
model catalog (`codewhale model list --provider meta`). No provider patching is
needed. Verify with:

```powershell
codewhale model resolve --provider meta   # muse-spark-1.3-contributor, 1M ctx
codewhale auth status --provider meta     # active source: secret store
codewhale exec --provider meta --model muse-spark-1.3-contributor "hi"
```

## Subscription/OAuth path: kernel proxy + secret-store key

`codewhale auth external-consent` reports `meta has no supported external CLI
credential source` — Codewhale cannot read pi's `auth.json` natively. Two live
paths cover it instead:

1. **Kernel proxy (primary, zero stale copies).** `~/.codewhale/config.toml`
   points the meta route at the HyperNexus kernel, which proxies
   `/v1/chat/completions` to `api.meta.ai` with the Bearer token re-read from
   pi's `auth.json` on EVERY request (see `go/internal/httpapi/openai_compat.go`):
   ```toml
   [providers.meta]
   model = "muse-spark-1.3-contributor"
   auth_mode = "api_key"
   base_url = "http://127.0.0.1:7778/v1"
   ```
   pi-side refreshes flow through with no re-sync and no kernel restart.
2. **Secret-store key (fast lane).** `scripts/sync-meta-oauth-codewhale.ps1`
   mints the current pi access token into the Codewhale secret store
   (`codewhale auth set --provider meta`). Idempotent — re-run after pi refreshes.

## Launch

```powershell
.\addons\codewhale\use-meta-model.ps1 "your prompt"   # or no args for the TUI
```

The launcher mints a fresh key when pi's token rotated (via the sync script),
then runs Codewhale on `meta/muse-spark-1.3-contributor`.

## Rules

- This file and the installer NEVER write the token or key anywhere.
- `auth.json` is read at call time, every time; pi rotation is picked up
  automatically (proxy) or via the sync script (secret store).
- If the kernel proxy reports no credential, re-login in pi (`/login meta`).
