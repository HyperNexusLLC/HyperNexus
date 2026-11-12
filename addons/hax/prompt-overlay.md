# HyperNexus — hax project overlay (`<repo>/.agents/skills/` companion file)
# ============================================================================
# Installed by `node addons/hax/install.mjs` into the repo root as AGENTS.md
# managed block AND as this project prompt-overlay for reference.
# Read by hax via the AGENTS.md hierarchy (repo root → cwd).
#
# Discipline loop for hax sessions: RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY
#
# hax has no MCP/extension/plugin/hook runtime (deliberate: docs/philosophy.md).
# The HyperNexus integration therefore binds to what hax DOES have:
#   1. skills/   — this overlay + 3 SKILL.md files (recall/discover/persist guidance)
#   2. AGENTS.md — managed block (this file's content) in repo + global config
#   3. CLI       — addons/hax/hn.mjs driver (every kernel capability as a command)
#   4. sessions  — hax -p/--json composition scripts in addons/hax/scripts/
#
# Kernel truth: the Go kernel on http://127.0.0.1:7778 is the source of truth.
# If it is down, say so (Truth Pass) — never invent memory/tool results.

## 1. RECALL — harvest before you derive
Start every multi-step task with prior context (cheap FTS first, deep second):
  node addons/hax/hn.mjs fts "<task keywords>" 5
  node addons/hax/hn.mjs harvest "<task sentence>" 8
`harvest` returns L2 memories + suggested MCP tools in one call. If the kernel is
unreachable, proceed from local files and say so in one sentence.

## 2. DISCOVER — route, don't hardcode
Need a capability you lack? Search the 26k+ tool catalog first:
  node addons/hax/hn.mjs tools "<natural language need>"
  node addons/hax/hn.mjs suggest
Then execute via the universal dispatcher:
  node addons/hax/hn.mjs call <tool-name> '{"arg":"value"}'
Prefer `repomap` / `code` search before broad edits:
  node addons/hax/hn.mjs repomap <dir>
  node addons/hax/hn.mjs code "<symbol or question>"

## 3. EXECUTE — bounded, verifiable
- Keep each `hn.mjs` call purposeful; default budget is 25s, hot reads 5s.
- `status` before production-affecting work; `billing` before cost-relevant work.

## 4. PERSIST — store non-obvious outcomes
Facts, decisions, gotchas go to L2 immediately (append-only, safe to retry):
  node addons/hax/hn.mjs store "<title>" "<content>" "tag1,tag2" [category]
  node addons/hax/hn.mjs observe "<observation>" "tag1,tag2"
Graph what matters: `node addons/hax/hn.mjs graph '{"entities":[{"name":"...","type":"..."}]}'`
Scratchpad for working state: `scratch-set <key> "<value>"` / `scratch-get <key>`.
Session handoff for continuations: `node addons/hax/hn.mjs handoff "<summary>"`.

## 5. VERIFY — kernel liveness after production changes
  node addons/hax/hn.mjs status
expects `"ok": true` and `service: hypernexus-go`. If not ok, report it plainly.

## Skill triggers (mirrored in ~/.config/hax/skills/)
- `hypernexus` — L2 memory, tool discovery/routing, sessions, billing, code search.
- `hypernexus-ops` — Hetzner deploy, systemd services, health checks, campaigns, key rotation.
- `hypernexus-workflows` — memory-first loops, orchestration, handoff, harvest patterns.

## Auth note (Meta provider)
This repo's hax preset `meta` runs Meta Muse Spark via the pi OAuth subscription.
The key is live-read from pi auth.json per shell: `eval "$(sh addons/hax/scripts/meta-env.sh)"`.
Never paste the key into config.json — env only.
