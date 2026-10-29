# HyperNexus for Codex -- full integration 
Codex CLI (config 'C:/Users/hyper/.codex/config.toml') integration for the 
HyperNexus AI control plane (Go kernel http://127.0.0.1:7778, dashboard 7779): 
persistent memory, semantic MCP tool discovery + routing, skill registry, 
sessions, knowledge graph, code search, system + billing status -- plus Meta 
muse-spark-1.3-contributor wiring via model_providers.meta (env_key MODEL_API_KEY). 
## What Codex natively supports (verified surfaces) 
- config.toml model_providers.* : Meta provider (base_url api.meta.ai/v1, wire_api responses) 
- config.toml mcp_servers.* : hypernexus stdio server (bin/hypernexus.exe mcp) 
- CODEX_HOME/skills/* : 3 core skills + orchestrator + 8 hn-* command-skills 
- AGENTS.md (repo root) : managed discipline block via installer 
- Codex reads API keys from env vars only: native Meta OAuth = provider block + 
  live-minted MODEL_API_KEY (pi owns refresh; never stored). 
## Parity with the other HyperNexus harnesses 
MCP server, 3 core skills, orchestrator agent, 8 hn-* commands, Meta mint helper, 
overlay docs, hooks (by-convention), installer with --check/--uninstall -- same set as 
pi, freebuff, crush, droid, mimo, jcode, hax. 
## Quick start 
node addons/codex/install.mjs              # install (idempotent, config-safe) 
node addons/codex/install.mjs --check        # verify without touching anything 
node addons/codex/bin/meta-muse-key.mjs --check   # mint OK, key hidden? 
$env:MODEL_API_KEY = node addons/codex/bin/meta-muse-key.mjs  # current shell only 
.\addons\codex\use-meta-model.ps1 'your prompt here'   # or no args for TUI 
## Files 
- install.mjs : idempotent installer (--check, --uninstall; never duplicates config keys) 
- meta-model.codex.md : Meta wiring reference (no secrets) 
- bin/meta-muse-key.mjs : mint a Meta key from pi auth.json (live-read, never stored) 
- use-meta-model.ps1 : presence-check MODEL_API_KEY, then launch codex 
- skills/*/SKILL.md : 3 core skills (codex-flavored) 
- agent/hypernexus-orchestrator.md : orchestrator (installed as skill) 
- commands/hn-*.md : 8 command prompt files (installed as skills) 
- hooks/ : hn-session.sh, hn-rbac.sh, hn-pre-tool.sh (by-convention; see hooks/README.md) 
- bin/test-codex-ext.mjs : integration battery (config, skills, mint, kernel, smoke) 
Hooks: hn-session.sh, hn-rbac.sh, hn-pre-tool.sh -- see hooks/README.md. Meta launcher: use-meta-model.ps1. 
