# MEMORY.md â€” Multi-Agent Insights

## Critical Architecture Lessons

### Dashboard API Routing (2026-07-17)

**Problem:** Remote dashboard can't reach `localhost:7778` directly. Browser blocks cross-origin requests.

**Solution:** Use nginx proxy chain:

- Remote: `https://hypernexus.site/api/go/health` â†’ nginx â†’ Next.js (7779) â†’ Go kernel (7778)
- Local: `http://127.0.0.1:7778/health` (direct)

**Rule:** NEVER hardcode ports in client-side URLs for remote deployments. Always check if running on localhost first.

### Nginx Location Order (2026-07-17)

**Problem:** `/api/go/` was being caught by `/api/` and sent directly to Go kernel, returning 404.

**Solution:** More specific location blocks MUST come before less specific ones:

```nginx
location /api/go/ { ... }  # Next.js proxy (strips prefix)
location /api/ { ... }      # Go kernel (direct)
```

### Dashboard Branding (2026-07-17)

**Problem:** Source code fixed but built JS bundles still had old "TormentNexus" references.

**Solution:** Must rebuild (`npm run build`) and redeploy after any UI text changes. Check built files, not just source.

### Stripe Integration (2026-07-17)

**Status:** Fully verified working

- Checkout session creation works
- Webhook endpoint responds
- Price ID configured correctly
- **Risk:** Webhook events must reach server (check Stripe dashboard)

## Deployment Commands

```bash
# Build dashboard
cd apps/web && npm run build

# Deploy to Hetzner
scp .next-build/standalone/apps/web root@hypernexus.site:/opt/tormentnexus/apps/web/.next-build/standalone/apps/web/

# Restart services
systemctl restart hypernexus-dashboard
systemctl reload nginx

# Verify
curl -sk https://hypernexus.site/api/go/health
curl -sk https://hypernexus.site/trpc/mcp.getStatus
```

## Current Production Config

| Setting | Value |
|---------|-------|
| Hetzner IP | 5.161.250.43 |
| Stripe Price ID | `price_1TxqpoPISUNpi4xXjfth4nvk` |
| Stripe Webhook Secret | `whsec_[YOUR_WEBHOOK_SECRET]` |
| Go Kernel Port | 7778 |
| Dashboard Port | 7779 |
| Marketing Agent Port | 8087 |
| Memory Export Port | 8090 |

## TormentNexus Memory API Reference

### Store Memory (CRITICAL)

```bash
curl -X POST http://localhost:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"My Title","content":"My content","tags":["tag1","tag2"],"namespace":"project"}'
```

**DO NOT USE:**

- `/api/memory/store` â†’ 404
- `tRPC memory.store` â†’ "not supported natively"
- `/api/memory` â†’ 404

### Search Memory

```bash
curl -s "http://localhost:7778/api/memory/search?query=<term>&limit=<n>"
```

### Memory Namespaces

- `project` â€” Project-specific knowledge
- `global` â€” General knowledge
- `user` â€” User-specific data

## Local Memory Storage

### Script Location

```bash
scripts/memory_local.py
```

### Usage

```bash
# Store memory
python scripts/memory_local.py store "Title" "Content" "tag1,tag2"

# Search memories
python scripts/memory_local.py search "query" [limit]

# List memories
python scripts/memory_local.py list [limit]
```

### Storage Location

Local memories are stored in `.tormentnexus/agent_memory/memories.json`

### Dual Storage Strategy

Memories should be stored both:

1. **Locally** â€” Using `scripts/memory_local.py`
2. **On server** â€” Using `POST /api/memory/facts/add` endpoint

## 2026-09-22 â€” v1.0.3 Session Observations

- **Bridge architecture**: `callUpstreamJSON` in `session_context_handlers.go:138` is the central upstream caller (~150 call sites). It calls `interop.CallTRPCProcedure` which now returns immediately when `HYPERNEXUS_TRPC_UPSTREAM` is unset. All `bridge.fallback` metadata in responses is from the Go-local primary path, not errors.
- **MCP storage split**: `localCreateConfiguredServer` writes to JSONC (`mcp.jsonc`), `localConfiguredMCPServersFromDB` reads from `hypernexus.db`. Fixed by merging JSONC results into DB query in `localConfiguredMCPServersFromDB`.
- **links_backlog**: production schema in `server.go:551` was missing `researched_at` and `raw_payload` columns. Also used wrong DB path (`catalog.db` instead of `hypernexus.db`). Test schemas in `server_test.go` had the correct columns.
- **Dashboard build**: requires `pnpm` (workspace protocol). `lib/db.ts` was missing `db` export with Drizzle schema generic. `drizzle-orm` + `pg` deps were not in `package.json`.
- **Hetzner deployment**: SSH not available from this session. Artifacts in `deploy-artifacts/`: `hypernexus.exe` (25MB) + `web-standalone/`. Manual deploy needed.
- **GIT_AUTHOR_NAME env override**: `GIT_AUTHOR_NAME=TormentNexus Bot` is set in the shell environment and overrides `git config user.name` in test repos. Tests must `t.Setenv` git identity vars. This was the root cause of `TestGitLogFallsBackLocally` — `localGitLog` was running in the correct test temp dir, but commits were attributed to the env var author.




