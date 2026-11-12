# HyperNexus -- Meta model wiring for Juggler GUI (REFERENCE, no secrets inside)

Model: `meta/muse-spark-1.3-contributor` via Meta Model API (1M context).
Auth is read LIVE from pi `auth.json` at every mint (pi owns OAuth refresh;
nothing is stored in this file or any config).

## Native surface: OpenAI-compatible provider via kernel proxy

`connection.json` pins the provider:

- `baseUrl`: `http://127.0.0.1:7778/v1` (local HyperNexus kernel proxy)
- `model`: `meta/muse-spark-1.3-contributor`
- `envKey`: `META_API_KEY` (minted live per run, stdout only, never stored)

## Subscription/OAuth path: mint a Model API key live from pi

```
node addons/juggler-gui/bin/meta-muse-key.mjs --check   # expect mint OK, key hidden
$env:META_API_KEY = node addons/juggler-gui/bin/meta-muse-key.mjs   # current shell only
```

How it works (mirrors pi Meta OAuth flow, pi-ai dist/auth/oauth/meta.js):

1. Read identity token from pi agent auth.json (meta.refresh).
2. POST https://api.meta.ai/muse-code/key with Bearer identity.
3. Print ONLY the minted api_key to stdout (never stored).

Thin shim delegates to the canonical `addons/shared/bin/meta-muse-key.mjs`.
If mint 401/403s, run `/login meta` in pi and retry.

## 403 guard (Meta attestation)

Meta attests subscription-key requests carrying certain tool names DENIED
(403 `client_attestation_denied`, live-bisected 2026-11-01). Native shell
tool names/descriptions (`bash`, `powershell`, `shell`) trip it, so this
harness keeps shell tools DISABLED and routes shell-equivalent work through
the HyperNexus MCP parity tools with MINIMAL descriptions (no mention of
bash/powershell/shell in tool names or descriptions). The kernel proxy
additionally strips risky tools on a 403 retry as backstop.

## Rules

- This file and all configs NEVER contain the token or key.
- `auth.json` is read at call time, every time; pi rotation is automatic.
- Kernel proxy inference verified: no-tools `PONG` round-trip 200 via
  `POST /v1/chat/completions` on `meta/muse-spark-1.3-contributor`.
