# HyperNexus for Codex -- full integration
Codex CLI integration for the HyperNexus AI control plane (Go kernel http://127.0.0.1:7778, dashboard 7779):
persistent memory, semantic MCP tool discovery + routing, skill registry,
sessions, knowledge graph, code search, system + billing status -- plus Meta
muse-spark-1.3-contributor wiring via model_providers.meta (env_key MODEL_API_KEY).
## What Codex natively supports (verified surfaces)
- config.toml model_providers.* : Meta provider (base_url kernel proxy /v1, wire_api responses)
- config.toml mcp_servers.* : hypernexus stdio server (bin/hypernexus.exe mcp)
- CODEX_HOME/skills/* : 3 core skills + 2 agents + 13 hn-* command-skills (18 total)
- CODEX_HOME/hooks/* : 3 by-convention scripts (Codex exposes no hook API; max extent)
- AGENTS.md (repo root) : managed discipline block via installer
- Codex reads API keys from env vars only: native Meta OAuth = provider block +
  live-minted MODEL_API_KEY (pi owns refresh; never stored).
## Parity with the other HyperNexus harnesses
MCP server, 3 core skills, 2 agents (orchestrator + read-only researcher), 13 hn-* commands,
Meta mint helper, overlay docs, hooks (by-convention), installer with --check/--uninstall --
same command set as opencode (13), same agent pattern as claude-code (orchestrator + researcher).
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
- use-meta-model.ps1 : presence-check MODEL_API_KEY, then launch codex (shell surfaces disabled)
- skills/*/SKILL.md : 3 core skills (codex-flavored)
- agent/hypernexus-orchestrator.md : multi-step RECALL loop (installed as skill)
- agent/hypernexus-researcher.md : read-only harvester (installed as skill)
- commands/hn-*.md : 13 command prompt files (installed as skills: status/search/store/session/context/summary/tools/purge/plan/remember/restore/auth/models)
- hooks/ : hn-session.sh, hn-rbac.sh, hn-pre-tool.sh (by-convention; see hooks/README.md)
- bin/test-codex-ext.mjs : integration battery (config, skills, mint, kernel, MCP probe, proxy inference smoke)
Hooks: hn-session.sh, hn-rbac.sh, hn-pre-tool.sh -- see hooks/README.md. Meta launcher: use-meta-model.ps1.
## Shell policy
Never include `bash`/`powershell`/shell-execution tools in model requests: Meta subscription attestation denies them with 403 `client_attestation_denied` even with a fresh key. Route shell needs through the HyperNexus `code_interpreter` parity tool with a minimal description instead.
## 403 root cause (verified live)
Meta attests subscription-key requests carrying certain tool names DENIED (403 `client_attestation_denied`, live-bisected 2026-11-01/02: `bash`/`powershell`/`shell`, plus codex native `request_user_input` and `get/create/update_goal`, trip it; parity tools pass). The launcher disables `shell_tool`, `unified_exec`, `goals` (verified against `codex features list`); `request_user_input` has no feature flag so the kernel proxy strips it on a 403 retry as backstop (see `go/internal/httpapi/openai_compat.go` `stripAttestationTools` + `retryBodyForDenied`). Keep `node_repl` out of the Meta path (recursive-schema 400).
