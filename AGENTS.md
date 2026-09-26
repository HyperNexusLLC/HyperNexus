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

- Source: `.pi/extensions/hypernexus.ts`
- Installed to `~/.pi/agent/extensions/hypernexus.ts`
- Must be kept in sync with the CodeWhale extension feature set

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



