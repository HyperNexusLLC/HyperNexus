# MEMORY.md â€” Multi-Agent Insights

## Critical Architecture Lessons

### Jcode Harness Integration + MCP Stdio Resilience (2026-10-20)

**Problem 1 ("fix mcp in jcode"):** The `hypernexus mcp` stdio server advertised only 49 static tools to clients whenever the kernel was busy — `getMergedTools()` used a 3s HTTP timeout with no cache, so `/api/mcp/tools` (750ms calm, 3s+ loaded) timed out and silently dropped the 9 core memory/search tools.

**Fix:** 8s fetch timeout + 1 retry + 15s-TTL last-good merged-inventory cache. A degraded `tools/list` must never be the steady state.

**Problem 2:** Stdio dispatch was fully serial — one slow `tools/call` (60s upstream budget) blocked every other JSON-RPC request behind it. Fix: concurrent dispatch with bounded semaphore + serialized writes; clients correlate by id.

**Jcode extension surfaces (no JS plugin API):** Jcode integrates via `~/.jcode/mcp.json` / `.jcode/mcp.json` (`mcpServers` stdio schema) + skills (`.jcode/skills/<name>/SKILL.md` with `name`/`description` frontmatter) + prompt overlay / preferred-tools / swarm-prompt managed blocks. Installer: `addons/jcode/install.mjs` (idempotent managed blocks). Battery: `bin/test-jcode-ext.mjs` (43 checks).

**Memory semantics gotchas:** `search_memory` keyword matching tokenizes — hyphenated single tokens never match; use natural-language probe words. Deletes propagate asynchronously (poll ~6s before asserting gone). `add_memory` returns vectorstore `mem-general-*` ids only via `GET /api/memory/search`, not via MCP search output.

**cmd.exe swap trap:** `if errorlevel 1 (echo A) else (echo B) & copy x y` swallows the trailing `&` commands — binary swaps must run copy as standalone statements.

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
- **GIT_AUTHOR_NAME env override**: `GIT_AUTHOR_NAME=TormentNexus Bot` is set in the shell environment and overrides `git config user.name` in test repos. Tests must `t.Setenv` git identity vars. This was the root cause of `TestGitLogFallsBackLocally` - `localGitLog` was running in the correct test temp dir, but commits were attributed to the env var author.

## 2026-10-19 �?" v1.0.14 OpenCode Extension Session Observations

- **OpenCode V2 plugin gotchas** (source of truth: https://opencode.ai/v2/docs/build/plugins):
  - `Skill.Info` schema **requires `path`** — omitting it fails the skill transform and OpenCode **disables the entire plugin** (`disabled plugin after transform failure state=skill`). Always materialize SKILL.md and pass `path` + `content`.
  - Any transform schema failure disables the whole plugin, not just that registration. Validate every editor.add() payload against the documented shape (tool: name/description/input/options/execute; worktree: id/create/remove/list).
  - Plugin `options.baseUrl` does NOT reach tool executors automatically — `tool.run()` calls module-level helpers. Keep a module-level `RUNTIME_BASE` updated in `setup()`/`server()`.
  - `ctx.mcp.transform` `editor.set(name, cfg)` uses `{type:"local", command:[...], environment:{...}, timeout:{startup}}`. MCP tools normalize to `<server>_<tool>`; same-named plugin tools with namespace `<server>` override MCP duplicates (later registration wins) — that is desirable for richer plugin versions but be aware of it.
  - Plugin dirs auto-load from `.opencode/plugins/<name>/index.js` (package.json `exports` works). Default export needs `id` + `setup`; a `server()` export provides V1 compatibility.
- **Kernel tool surface topology** (why tools "exist" in one surface but not another):
  - `go/internal/tools.Registry` (= `s.toolsRegistry`) serves `POST /api/agent/tool` (the router every harness `mcp_call` uses).
  - `go/tools` (roottools) serves accessory tools; `go/cmd/tormentnexus/mcp_server.go` has its OWN switch for stdio MCP tools (proxies to kernel HTTP via `tnKernelGet`).
  - A tool can therefore work over stdio MCP yet 503 over the router. `go/internal/tools/kernel_bridge.go` is the fix pattern: thin self-proxies onto the kernel's own HTTP API. Added mcp_status/mcp_list_servers/mcp_list_tools/mcp_call_tool/mcp_server_test/inspect_window_ui (v1.0.14).
- **Test hygiene**: assert on the router envelope (`r.success !== false && !r.error`), never regex payload content — stored memories legitimately contain strings like "Error: fetch failed" and flip `/error.*failed/i` checks (bit test-mcp-tools.mjs search_memory once).
- **Windows binary swap**: `Move-Item -Force` does NOT overwrite an existing exe; use `cmd.exe /c copy /Y`. A running `hypernexus.exe` locks the file — kill processes first (there may be a stale multi-day-old pid; check `Get-NetTCPConnection -LocalPort 7778` for the real owner). The kernel has a single-instance guard that refuses to double-bind 7778 and says so on stderr.




