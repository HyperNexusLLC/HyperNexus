# HyperNexus -- Meta model wiring for Codex (REFERENCE, no secrets inside) 
Model: 'meta/muse-spark-1.3-contributor' via Meta Model API (1M context). 
Auth is read LIVE from pi 'auth.json' at every mint (pi owns OAuth refresh; 
nothing is stored in this file or any config). 
## Native surface: model_providers.meta in config.toml 
Codex reads API keys from env vars only, so native Meta OAuth means a 
provider block whose env_key points at a shell variable you mint live: 
model = 'meta/muse-spark-1.3-contributor' 
model_provider = 'meta' 
model_reasoning_effort = 'high' 
model_reasoning_summary = 'auto' 
model_context_window = 1048576 
[model_providers.meta] 
name = 'Meta' 
base_url = 'https://api.meta.ai/v1' 
env_key = 'MODEL_API_KEY' 
wire_api = 'responses' 
(TOML accepts single-quoted literal strings; the installer writes this block 
with managed markers, or skips it when your own equivalent keys exist.) 
## Subscription/OAuth path: mint a Model API key live from pi 
node addons/codex/bin/meta-muse-key.mjs --check   # expect mint OK, key hidden 
$env:MODEL_API_KEY = node addons/codex/bin/meta-muse-key.mjs   # current shell only 
How it works (mirrors pi Meta OAuth flow, pi-ai dist/auth/oauth/meta.js): 
1. Read identity token from pi agent auth.json (meta.refresh). 
2. POST https://api.meta.ai/muse-code/key with Bearer identity. 
3. Print ONLY the minted api_key to stdout (never stored). 
## Launch 
Set MODEL_API_KEY in your shell, then run use-meta-model.ps1 (TUI or with prompt). 
The model comes from config.toml, so no CLI flags are needed. 
## Rules 
- This file and the installer NEVER write the token or key anywhere. 
- auth.json is read at call time, every time; pi rotation is picked up automatically. 
- If mint reports expired session (401/403), re-login in pi (/login meta). 
