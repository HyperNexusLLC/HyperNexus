# meta-model.pi.md — Meta `muse-spark-1.3-contributor` on pi (native OAuth)

Pi is the OAuth owner: `~/.pi/agent/auth.json` holds the `meta` block
(`type: oauth`, pi-managed `refresh`/`access`/`expires`). No other harness
mints from anywhere else; they all read through pi's identity.

## Live wiring (verified)

- `~/.pi/agent/settings.json`: `defaultProvider: meta`, `defaultModel: muse-spark-1.3-contributor`
- `~/.pi/agent/models-store.json`: providers include `meta`
- Extension: `~/.pi/agent/extensions/hypernexus.ts` (copy of `addons/pi/hypernexus.ts`)
- MCP: `~/.pi/agent/mcp.json` → `mcpServers.hypernexus` (see `mcp.pi.json`)
- Skills (auto-loaded): `~/.pi/agent/skills/{hypernexus,hypernexus-ops,hypernexus-workflows}/`

## Rules

- Pi refreshes the `meta` OAuth block itself (`/login meta` re-auths when the
  mint helper reports the session dead). Nothing in this repo ever writes
  `auth.json`.
- Mint helper for other harnesses: `addons/<harness>/bin/meta-muse-key.mjs`
  (`meta.refresh` → `POST https://api.meta.ai/muse-code/key`, key to stdout
  only, `--check` for verification without revealing the key).
- Model endpoint for direct calls: `https://api.meta.ai/v1`;
  kernel-proxy base for harness routing: `http://127.0.0.1:7778/v1`.
- Subscription attestation covers agentic use **without shell-execution
  tools**: any request carrying `bash`/`powershell` tools is rejected with
  `client_attestation_denied` — even with a fresh key, any UA, any endpoint.
  (Proven by elimination: endpoint/key/UA/headers/body all exonerated; only
  the bash tool schema flips 200→403.) Workarounds: drop shell tools from
  `-t` (e.g. `-t 'read,edit,write,grep,find,ls'`), or set a pay-as-you-go
  `META_API_KEY` for full tool use outside Muse Code.
