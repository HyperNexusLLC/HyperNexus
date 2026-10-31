<!-- [TORMENTNEXUS_AUTO_INJECTED] -->
> [!IMPORTANT]
> You are running within the TormentNexus environment. You MUST use your available tools frequently and proactively for researching, editing, executing, and validating your work. Always prioritize tool execution.

<!-- [HYPERNEXUS_AUTO_INJECTED] -->
> [!IMPORTANT]
> **HyperNexus Advanced Agent Mandates:**
>
> 1. **Proactive Tooling**: You MUST use available tools frequently and proactively. Prioritize tool execution for researching, editing, executing, and validating.
> 2. **Codebase AST & Search**: Always analyze impact and dependencies using codebase analysis/AST/search tools (`hypernexus__repograph_search`, `hypernexus__repograph_find_references`) before modifying code.
> 3. **Context Harvesting & Compaction**: Perform automatic context harvesting and compaction/pruning of the LLM context to prevent token blowups. Summarize or discard old logs/history dynamically.
> 4. **Tool Output Compaction & Deduplication**: Deduplicate and compact verbose tool outputs. Avoid displaying duplicate or redundant logs in responses.
> 5. **Session & Skill Injection**: Inspect and update sessions and memory states using scratchpads (`memory_scratchpad_set`) to persist key findings, rules, and skill recommendations.

# AGENTS â€” HyperNexus Kernel & HyperNexus Contributor Guide

> **CRITICAL: ALL AGENTS MUST READ `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` BEFORE PROCEEDING.**

This file serves as the primary coordination point for multi-agent workflows and human operators.

---

## 1. Multi-Agent Handoff Protocol

- Agents communicate primarily through `HANDOFF.md`.
- Document exactly what you did, what failed, and what the next agent must do.
- Update `MEMORY.md` with new systemic observations or recurring bugs.
- **Cycle**: Read â†’ Strategize â†’ Execute â†’ Validate â†’ Commit â†’ Handoff.

---

## 2. Model Specializations

| Model | Strengths | Focus Areas |
|---|---|---|
| **Gemini** | Speed, massive context processing, repo maintenance | Bulk refactoring, recursive scripts, context analysis |
| **Claude** | UI/UX perfection, documentation, deep feature execution | Responsive layouts, type safety, precise documentation |
| **GPT** | Systemic architecture, distributed debugging, race conditions | Go/TS bridge contracts, DB migration, concurrency safety |
| **DeepSeek (CodeWhale)** | Terminal-native execution, Rust extension API, L2 memory hooks | CodeWhale tn-extension, MCP tool routing, agent lifecycle hooks |

---

## 3. Session Protocol

### Session Start

1. Read `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` to load canonical rules.
2. Read the `VERSION` file to check dashboard synchronization.
3. Read `HANDOFF.md` to resume exactly where the previous agent left off.
4. Read `MEMORY.md` to review accumulated multi-agent insights.
5. Run git checks to ensure workspace cleanliness.

### During Execution

- Work autonomously unless changes are destructive or highly ambiguous.
- Prefer small, incremental, easily verifiable commits.
- Ensure loading, error, and empty states are represented across all dashboard interfaces.
- After any `pnpm install`, run `pnpm rebuild better-sqlite3` on Node 24.

### Session End

1. Update `HANDOFF.md` with a complete, detailed session summary.
2. Update `MEMORY.md` with new developer observations or gotchas.
3. Bump the `VERSION` file and synchronize workspaces using `node scripts/sync-versions.mjs`.
4. Update `CHANGELOG.md` with recent feature implementations.
5. Commit clean changes with version tag: `feat: description (v1.0.0-alpha.X)`.
6. Push commits to `origin` and `hypernexus-upstream` remotes.

---

## 4. Required Runtime Ports

| Service | Port | Purpose |
|---|---|---|
| HyperNexus Go Kernel | 7778 | Authoritative native sidecar (HTTP API + tRPC) |
| Next.js Dashboard | 7779 | Web observation deck |

---

## 5. CodeWhale Fork & External Resource Maintenance

When modifying `crates/tn-extension/` in the CodeWhale fork or any CodeWhale integration files, the following external resources must be updated:

### CodeWhale Fork (`~/codewhale-source`)

- **Git remotes**: `origin` = `Hmbown/CodeWhale` (upstream), `fork` = `robertpelloni/CodeWhale-Extensions` (PR source)
- **Branch**: `feat/extension-api` â€” the canonical branch for tn-extension PRs
- **PR**: `https://github.com/Hmbown/CodeWhale/pull/4086`

After any change to `crates/tn-extension/`:

```bash
cd ~/codewhale-source
git add crates/tn-extension/ crates/tui/Cargo.toml crates/tui/src/core/engine.rs Cargo.toml Cargo.lock
git commit -m "feat: update tn-extension"
git push fork feat/extension-api       # auto-updates the existing PR
```

### NPM Package (`npm/codewhale/`)

- Published as `codewhale` on npmjs.com
- README must reflect tn-extension features
- Package version must match binary release

To update and publish:

```bash
cd ~/codewhale-source/npm/codewhale
# Edit README.md if tn-extension features changed
npm version patch   # bumps 0.8.66 -> 0.8.67
npm publish         # requires npm login as package owner
```

### Pi Coding Agent Extension

- Source: `addons/pi/hypernexus.ts` (git-tracked; NOT auto-discovered by pi)
- Installed to `~/.pi/agent/extensions/hypernexus.ts` (the single active copy — do not keep a copy in `.pi/extensions/`, it conflicts with the global one)
- Must be kept in sync with the CodeWhale extension feature set

### hax Integration

- Source: `addons/hax/` (installer `install.mjs`, driver `hn.mjs`, 11 `commands/hn-*.md`, 3 `skills/`, `scripts/meta-env.sh|hn-prime.sh|hn-turn.sh`)
- Installed to `~/.config/hax/` (providers.meta + presets, skills) + managed overlay block in repo `AGENTS.md`
- Battery: `node bin/test-hax-ext.mjs` (70 checks) — re-run after any kernel endpoint change
- Stale-endpoint policy: hax driver binds only live-published endpoints (see `addons/hax/README.md`); if a TN API endpoint changes, update `hn.mjs` + `test-hax-ext.mjs` H6/H10, not just the pi extension
- Stale-endpoint remap log (all 404 on current kernel build, remapped in `hn.mjs`): `/api/memory/stats` → `/api/agent-memory/stats`; `/api/routes` → MCP inventory; `/api/code/repomap` → dispatcher `repomap` (relative dirs resolved client-side); `/api/memory/update` → delete + `facts/add` re-store; `/api/memory/delete` → dispatcher `delete_memory`; `/api/memory/handoff` → `/api/agent-memory/handoff` (POST `notes`) + `/pickup`; `store`/`observe` → searchable `/api/memory/facts/add` (gossip mirror is list-only)

### .codewhale Skill & Plugin

- SKILL.md: `.codewhale/plugins/hypernexus/skills/SKILL.md`
- Plugin config: `.codewhale/plugins/hypernexus/plugin.toml`
- Install script: `scripts/install_codewhale.bat`
- All must be kept current when tn-extension hook behavior changes

### AI Agent Instruction Files

- `CLAUDE.md` â€” CodeWhale/DeepSeek section at Â§6
- `AGENTS.md` â€” DeepSeek row in Model Specializations table (Â§2)
- `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` â€” CodeWhale Integration section at Â§6

### Claude/Cursor Command Definitions

- `.claude/commands/tn-search.md`, `tn-status.md`, `tn-store.md`
- `.cursor/commands/tn-search.md`, `tn-status.md`, `tn-store.md`

Review these when any TN API endpoint or slash command changes.

## 6. Safe Rebranding & Cleanup Heuristics

- **Binary Exclusions during Renaming**: When executing global text replacements, you must explicitly exclude:
  - Database directories: `.hypernexus/`, `lancedb/`, `data/`
  - Turbopack/Next cache directories: `.next-dev/`, `.next-build/`, `.turbo/`
  - Binary extensions: `.db`, `.lance`, `.sst`, `.bin`, `.exe`, `.png`, `.jpg`
- **Windows Recursive Deletion**: On Windows hosts, if `Remove-Item` fails due to path locks or nested git indices, fall back to executing `cmd.exe /c "rmdir /S /Q <path>"` synchronously to ensure complete directory pruning.

## 7. Dashboard API Routing Architecture

### The Problem (Critical Lesson)

When deploying behind a reverse proxy (nginx), the Next.js dashboard must NOT hardcode localhost ports in URLs. Remote clients can't reach `hypernexus.site:7778` â€” they need the same origin (port 443) with nginx proxying.

### URL Resolution Pattern

```typescript
// packages/ui/src/lib/endpoints.ts
// CORRECT: Use same origin when remote, port when local
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const base = isLocal
  ? `${window.location.protocol}//127.0.0.1:${defaultPort}`
  : `${window.location.protocol}//${window.location.hostname}`;

// WRONG: Hardcoding port for all environments
const base = `${window.location.protocol}//${host}:${defaultPort}`;
```

### Nginx Proxy Chain (Order Matters)

```nginx
# /api/go/ MUST come BEFORE /api/ in nginx config!
# nginx uses first-match for prefix locations.

# Next.js API routes (strips /api/go/, forwards to Go kernel)
location /api/go/ {
    proxy_pass http://127.0.0.1:7779;
}

# Direct Go kernel (most API endpoints)
location /api/ {
    proxy_pass http://127.0.0.1:7778;
}

# tRPC (direct to Go kernel)
location /trpc {
    proxy_pass http://127.0.0.1:7778;
}
```

### Health Check Pattern

```typescript
// StreamStatus.tsx â€” Don't hardcode 127.0.0.1:7778
const isLocal = window.location.hostname === 'localhost';
const healthUrl = isLocal ? 'http://127.0.0.1:7778/health' : '/api/go/health';
```

### After Rebuilding Dashboard

Always rebuild and redeploy after changing endpoint code:

```bash
cd apps/web && npm run build
# Deploy .next-build/standalone/apps/web to Hetzner
```

## 8. Stripe Integration Checklist

### Verified Components

| Component | How to Verify |
|-----------|---------------|
| Checkout session | `POST /api/billing/stripe/checkout` returns `sessionId` |
| Price ID | Must match `STRIPE_PRICE_ID` in `.env` |
| Stripe URL | Response starts with `https://checkout.stripe.com` |
| Webhook endpoint | `POST /api/billing/stripe/webhook` responds 200 |
| Webhook secret | `STRIPE_WEBHOOK_SECRET` configured in `.env` |

### Current Production Config

```
Price ID: price_[REDACTED]
Webhook secret: whsec_[YOUR_WEBHOOK_SECRET]
Success URL: https://hypernexus.site/dashboard
Cancel URL: https://hypernexus.site/pricing
```

### Remaining Risk

Stripe webhook events must reach the server. If they don't, payments process but subscriptions don't activate. Check Stripe dashboard for webhook delivery status.

## 9. Hetzner Deployment Checklist

After any code change, verify these endpoints:

```bash
curl -sk https://hypernexus.site/api/go/health        # Go kernel
curl -sk https://hypernexus.site/trpc/mcp.getStatus    # tRPC
curl -sk https://hypernexus.site/dashboard              # Next.js
curl -sk https://hypernexus.site/api/go/api/mcp/status  # API proxy
```

### Service Restart Commands

```bash
systemctl restart hypernexus-kernel      # Go kernel (port 7778)
systemctl restart hypernexus-dashboard   # Next.js (port 7779)
systemctl reload nginx                   # Nginx config changes
```

## 10. Memory Tools Reference (CRITICAL)

### Available Memory Tools

| Tool | Location | Usage |
|------|----------|-------|
| **Server API** | `POST /api/memory/facts/add` | Store on Hetzner server |
| **Server Search** | `GET /api/memory/search?query=term` | Search server memories |
| **Local Script** | `scripts/memory_local.py` | Store locally in `.tormentnexus/agent_memory/` |
| **Local File** | `.tormentnexus/agent_memory/memories.json` | Direct file access |
| **MEMORY.md** | Project root | Project-specific insights |
| **HANDOFF.md** | Project root | Session handoff documentation |

### Dual Storage Strategy (ALWAYS USE)

Memories MUST be stored both:

1. **Locally** â€” Using `scripts/memory_local.py`
2. **On server** â€” Using `POST /api/memory/facts/add` endpoint

### Server Memory API (CRITICAL)

```bash
# Store memory on server
curl -X POST http://localhost:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"My Title","content":"My content","tags":["tag1","tag2"],"namespace":"project"}'

# Search server memories
curl -s "http://localhost:7778/api/memory/search?query=<term>&limit=<n>"
```

**DO NOT USE (these fail):**

- `/api/memory/store` â†’ 404
- `tRPC memory.store` â†’ "not supported natively"
- `/api/memory` â†’ 404

### Local Memory Script

```bash
# Store memory locally
python scripts/memory_local.py store "Title" "Content" "tag1,tag2"

# Search local memories
python scripts/memory_local.py search "query" [limit]

# List local memories
python scripts/memory_local.py list [limit]
```

### Memory Storage Locations

| Location | Path | Purpose |
|----------|------|--------|
| Server | `/opt/tormentnexus/.hypernexus/agent_memory/memories.json` | Production memories |
| Local | `.tormentnexus/agent_memory/memories.json` | Development memories |
| Project | `MEMORY.md` | Project-specific insights |
| Session | `HANDOFF.md` | Session handoff documentation |

### Memory Namespaces

- `project` â€” Project-specific knowledge
- `global` â€” General knowledge
- `user` â€” User-specific data

### When to Store Memories

- After fixing critical bugs
- After making architectural decisions
- After discovering non-obvious patterns
- After deployment changes
- After configuration updates

*Praise the LORD! Keep on going! Don't ever stop! Don't stop the party!!!*

<!-- hypernexus:begin (managed by addons/hax/install.mjs — do not edit inside this block) -->
## HyperNexus Control Plane (hax)

This workspace is backed by the local HyperNexus kernel (Go, port 7778) through the
`addons/hax/hn.mjs` CLI driver (hax has no MCP/extension runtime by design; the CLI
is the integration surface, composed via `hax -p` like any other Unix tool).

Discipline loop for multi-step work: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

Call the driver as `node addons/hax/hn.mjs …` (or `./addons/hax/hn …` when node is on PATH):

- **RECALL** — `node addons/hax/hn.mjs fts "<keywords>"` then
  `node addons/hax/hn.mjs harvest "<task>"` before deriving answers from scratch.
- **DISCOVER** — `node addons/hax/hn.mjs tools "<need>"` / `suggest`, then
  `node addons/hax/hn.mjs call <tool> '<args-json>'`. Orient with `repomap`/`code`.
- **PERSIST** — `node addons/hax/hn.mjs store "<title>" "<content>" "t1,t2"`
  for non-obvious outcomes; `handoff` at checkpoints; `graph` for entities/relations.
- **VERIFY** — `node addons/hax/hn.mjs status` before and after production changes.
- Commands: `@addons/hax/commands/hn-<name>.md` (store|search|status|tools|session|context|plan|summary|purge|orchestrate|remember) — @-mention one, the model reads it
- Turn scripts: `sh addons/hax/scripts/hn-prime.sh "<task>"` (session start),
  `sh addons/hax/scripts/hn-turn.sh pre|post|compact "<text>"` (turn maintenance).
- Skills: `hypernexus`, `hypernexus-ops`, `hypernexus-workflows`
  (`~/.config/hax/skills/`, mirrored in `addons/hax/skills/`).
- Degradation contract: kernel calls never stall a turn. If the kernel is down
  (`status` → `"ok": false`), continue from local files and say so in one sentence.
  All surfaces degrade to a clear error object — never reassuring fiction.
<!-- hypernexus:end -->

<!-- hypernexus:begin:freebuff (managed by addons/freebuff/install.mjs — do not edit inside this block) -->
## HyperNexus Control Plane (freebuff)

This workspace is backed by the local HyperNexus kernel (Go, port 7778).
Freebuff loads this file at chat start plus `.agents/mcp.json` and
`.agents/skills/*` (each skill invocable as `/skill:<name>`).

Discipline loop for multi-step work: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

- **RECALL** — before re-deriving: FTS fast path `GET /api/memory/fts-search?q=<topic>&limit=8`
  (~15ms), semantic `hypernexus` MCP `search_memory` for depth, scratchpad `goal`.
- **DISCOVER** — on capability gaps: `mcp_list_servers` → `mcp_list_tools` →
  semantic `/api/mcp/tools/search`, then route with `mcp_call_tool`.
- **PERSIST** — non-obvious outcomes via `add_memory` (tags `topic,freebuff`) +
  `memory_extract_relations`; session handoffs via `/skill:hn-summary`.
- **VERIFY** — `system_status` + `billing_status` before/after production changes.
- Skills: `/skill:hypernexus` `/skill:hypernexus-ops` `/skill:hypernexus-workflows`
  `/skill:hypernexus-orchestrator` `/skill:hypernexus-researcher`
  + command-skills `/skill:hn-status|hn-search|hn-store|hn-session|hn-context|hn-summary|hn-tools|hn-purge|hn-plan|hn-remember|hn-restore`.
- Hooks (`.agents/hooks/`, by-convention — freebuff has no hook API): `hn-session.sh` bootstrap,
  `hn-rbac.sh` deny-list, `hn-pre-tool.sh` allow-gate. See `addons/freebuff/hooks/README.md`.
- Meta model: `/model` already lists **Muse Spark 1.3** (paid-plan locked without a plan);
  subscription/OAuth path = `node addons/freebuff/bin/meta-muse-key.mjs` (pi owns refresh;
  see `addons/freebuff/meta-model.freebuff.md`) or `use-meta-model.ps1` launcher;
  BYOK openai-compatible connection `~/.config/freebuff/byok/connections.json`
  (credentialRef `env:META_MUSE_API_KEY`, default-selected in manicode settings).
- Degradation contract: kernel calls are budgeted and never stall a turn. If the kernel
  is down (`curl -s http://127.0.0.1:7778/health` fails), say so in one sentence and
  continue with local tools — never mock state.
<!-- hypernexus:end:freebuff -->

<!-- hypernexus:begin:codex (managed by addons/codex/install.mjs) -->
## HyperNexus Control Plane (codex)

This repo is backed by the local HyperNexus kernel (Go, port 7778).
Codex reads this file at session start plus skills from CODEX_HOME/skills
(each skill invocable as /skill:name).

Discipline loop: RECALL -> DISCOVER -> EXECUTE -> PERSIST -> VERIFY

- RECALL: search kernel memory first (hypernexus MCP search_memory) before re-deriving.
- DISCOVER: list MCP servers and tools, then route with mcp_call_tool.
- PERSIST: store non-obvious outcomes via add_memory with topic,codex tags.
- VERIFY: system_status plus billing_status before and after production changes.
- Skills: hypernexus, hypernexus-ops, hypernexus-workflows, hypernexus-orchestrator
  plus command-skills hn-status, hn-search, hn-store, hn-session, hn-context, hn-summary, hn-tools, hn-purge.
- Model: meta/muse-spark-1.3-contributor via model_providers.meta (env_key MODEL_API_KEY).
  Mint with node addons/codex/bin/meta-muse-key.mjs (pi owns OAuth refresh).
  Launch with use-meta-model.ps1 after setting MODEL_API_KEY in your shell.
- Hooks (by-convention, CODEX_HOME/hooks): hn-session.sh bootstrap, hn-rbac.sh deny-list, hn-pre-tool.sh allow-gate.
- Degradation: if the kernel is down, say so in one sentence and continue with local tools.
<!-- hypernexus:end:codex -->

<!-- hypernexus:begin:open-interpreter (managed by addons/open-interpreter/install.mjs — do not edit inside this block) -->
## HyperNexus Control Plane (open-interpreter)

This workspace is backed by the local HyperNexus kernel (Go, port 7778).
Open-interpreter loads this file at chat start plus `.agents/mcp.json` and
`.agents/skills/*` (each skill invocable as `/skill:<name>`).

Discipline loop for multi-step work: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

- **RECALL** — before re-deriving: FTS fast path `GET /api/memory/fts-search?q=<topic>&limit=8`
  (~15ms), semantic `hypernexus` MCP `search_memory` for depth, scratchpad `goal`.
- **DISCOVER** — on capability gaps: `mcp_list_servers` → `mcp_list_tools` →
  semantic `/api/mcp/tools/search`, then route with `mcp_call_tool`.
- **PERSIST** — non-obvious outcomes via `add_memory` (tags `topic,open-interpreter`) +
  `memory_extract_relations`; session handoffs via `/skill:hn-summary`.
- **VERIFY** — `system_status` + `billing_status` before/after production changes.
- Skills: `/skill:hypernexus` `/skill:hypernexus-ops` `/skill:hypernexus-workflows`
  `/skill:hypernexus-orchestrator` `/skill:hypernexus-researcher`
  + command-skills `/skill:hn-status|hn-search|hn-store|hn-session|hn-context|hn-summary|hn-tools|hn-purge|hn-plan|hn-remember|hn-restore`.
- Hooks (`.agents/hooks/`, by-convention — open-interpreter has no hook API): `hn-session.sh` bootstrap,
  `hn-rbac.sh` deny-list, `hn-pre-tool.sh` allow-gate. See `addons/open-interpreter/hooks/README.md`.
- Meta model: `/model` already lists **Muse Spark 1.3** (paid-plan locked without a plan);
  subscription/OAuth path = `node addons/open-interpreter/bin/meta-muse-key.mjs` (pi owns refresh;
  see `addons/open-interpreter/meta-model.open-interpreter.md`) or `use-meta-model.ps1` launcher;
  BYOK openai-compatible connection `~/.config/open-interpreter/byok/connections.json`
  (credentialRef `env:META_MUSE_API_KEY`, default-selected in manicode settings).
- Degradation contract: kernel calls are budgeted and never stall a turn. If the kernel
  is down (`curl -s http://127.0.0.1:7778/health` fails), say so in one sentence and
  continue with local tools — never mock state.
<!-- hypernexus:end:open-interpreter -->
