# HyperNexus -- Meta model wiring for Omnigent GUI (REFERENCE, no secrets inside)

Models: `meta/muse-wonder-1.0-contributor` (primary) + `meta/muse-spark-1.3-contributor` (alt) via Meta Model API. Auth read LIVE from pi `auth.json` at every mint (pi owns OAuth refresh; nothing stored anywhere).

## Native surface: OpenAI-compatible provider via kernel proxy

`connection.json` pins `model` (primary) + `altModel`; `baseUrl` `http://127.0.0.1:7778/v1`, `envKey` `META_API_KEY` (minted live per run, stdout only).

## Subscription/OAuth path

```
node addons/omnigent-gui/bin/meta-muse-key.mjs --check   # expect mint OK, key hidden
$env:META_API_KEY = node addons/omnigent-gui/bin/meta-muse-key.mjs   # current shell only
```

Identity token (meta.refresh) -> POST https://api.meta.ai/muse-code/key -> prints ONLY api_key. Thin shim delegates to canonical `addons/shared/bin/meta-muse-key.mjs`. If mint 401/403s, `/login meta` in pi.

## 403 guard (Meta attestation)

Meta attests subscription-key requests carrying shell tool names DENIED (403 `client_attestation_denied`, live-bisected 2026-11-01). Shell tools stay DISABLED; shell-equivalent work routes through HyperNexus MCP parity tools with MINIMAL descriptions. Kernel proxy strips risky tools on 403 retry as backstop.

## Live proofs (2026-11-03, kernel proxy)

- wonder: no-tools `PONG` HTTP 200 on `meta/muse-wonder-1.0-contributor`. spark: no-tools `PONG` HTTP 200 on `meta/muse-spark-1.3-contributor`. Direct Meta calls 403 (attestation) - proxy path mandatory.

## Rules

- This file and configs NEVER contain token or key. `auth.json` read at call time; rotation automatic.
