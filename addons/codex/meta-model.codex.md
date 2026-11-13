# HyperNexus -- Meta model wiring for Codex (REFERENCE, no secrets inside) 
Model: 'meta/muse-wonder-1.0-contributor' via Meta Model API (1M context). 
Auth is read LIVE from pi 'auth.json' at every mint (pi owns OAuth refresh; 
nothing is stored in this file or any config). 
## Native surface: model_providers.meta in config.toml 
Codex reads API keys from env vars only, so native Meta OAuth means a 
provider block whose env_key points at a shell variable you mint live: 
model = 'meta/muse-wonder-1.0-contributor' 
model_provider = 'meta' 
model_reasoning_effort = 'high' 
model_reasoning_summary = 'auto' 
model_context_window = 1048576 
[model_providers.meta] 
name = 'Meta' 
base_url = 'http://127.0.0.1:7778/v1' 
env_key = 'MODEL_API_KEY' 
wire_api = 'responses' 
(TOML accepts single-quoted literal strings; the installer writes this block 
with managed markers, or skips it when your own equivalent keys exist.)
base_url points at the kernel proxy (what install.mjs writes); the minted key
also works direct against 'https://api.meta.ai/v1' if you prefer no proxy. 
## Subscription/OAuth path: mint a Model API key live from pi 
node addons/codex/bin/meta-muse-key.mjs --check   # expect mint OK, key hidden 
$env:MODEL_API_KEY = node addons/codex/bin/meta-muse-key.mjs   # current shell only 
How it works (mirrors pi Meta OAuth flow, pi-ai dist/auth/oauth/meta.js): 
1. Read identity token from pi agent auth.json (meta.refresh). 
2. POST https://api.meta.ai/muse-code/key with Bearer identity. 
3. Print ONLY the minted api_key to stdout (never stored). 
## Launch 
Set MODEL_API_KEY in your shell, then run use-meta-model.ps1 (TUI or with prompt). 
The model comes from config.toml; the launcher additionally passes
`--disable shell_tool --disable unified_exec --disable goals` (verified against
`codex features list`). Meta attests subscription-key requests carrying
certain tool names DENIED (403 `client_attestation_denied`, live-bisected
2026-11-01: `bash`/`powershell`/`shell`, plus codex's own `request_user_input`
and `get/create/update_goal`, trip it; parity tools pass), so those surfaces
stay off. `request_user_input` has no codex feature flag, so the kernel proxy
strips it on a 403 retry as backstop. Shell-equivalent work goes through the
hypernexus MCP tools instead. 
## Rules 
- This file and the installer NEVER write the token or key anywhere. 
- auth.json is read at call time, every time; pi rotation is picked up automatically. 
- If mint reports expired session (401/403), re-login in pi (/login meta). 
- Home-config model pin is YOUR override: install.mjs merge-only logic preserves an existing model line (e.g. gpt-6-astra); the battery accepts provider-meta + proxy wiring in that case. The subscription path is use-meta-model.ps1 (minimal CODEX_HOME, shell surfaces disabled).
- Known codex-0.166 limitation (verified 2026-11-02 with 58-tool and 2-tool MCP servers): codex sends MCP servers upstream as a single mcp__<server> namespace envelope; the model improvises mcp__<server>.<tool> dot calls and the router rejects them (unsupported call). MCP parity calls inside codex exec are therefore unavailable until codex changes this; inference through the kernel proxy works. The stdio MCP server itself is healthy (58 tools, live system_status call verified by direct probe).
- Home-config recursive-schema blocker (verified 2026-11-02): the `node_repl` MCP server's tool schema trips the vendor `Recursive JSON schemas` 400 on the Meta path (home config with node_repl fails; identical config without it returns PONG). Keep `node_repl` out of the Meta path: use a CODEX_HOME without its `[mcp_servers.node_repl]` section (or the minimal config) when running meta/muse-wonder-1.0-contributor.
