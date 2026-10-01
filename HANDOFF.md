# HANDOFF.md — Session Handoff

## Session Date: 2026-10-01 (T55–T57)

## Summary

Provider breakdown aggregation, routing history persistence, dashboard HTTP fallbacks, Actions Node 22. Commit `7c0cc93` (v1.0.8).

## Completed (T55–T57)

- `metrics.ProviderBreakdown()` aggregates routing history per provider (requests/ok/errors/avg latency/models/status)
- `mergeProviderCatalog` merges routing usage with `providers.Catalog` (catalog-only providers show as idle)
- `/api/metrics/stats` fallback includes `providerBreakdown` + `routingHistory`
- `SetRoutingPersistence` + `saveRouting`/`loadRoutingFrom` — JSON ring at `MainConfigDir/metrics/routing-history.json`
- `Server.ensureMetricsPersistence` wires it at `New()` (skipped under `testing.Testing()`)
- Dashboard metrics: HTTP fallback when tRPC down + Provider Breakdown table
- Actions: checkout@v5, setup-go@v6, setup-node@v5, node-version 22 / NODE_VERSION 22

## Next agent must

- Deploy kernel (26276000 bytes stripped) + dashboard overlay to Hetzner if not yet live
- Verify smoke: `/api/metrics/provider-breakdown` shows real counts; routing history survives restart
- Watchdog `-MonitorOllama` still needs admin PowerShell

---
## Session Date: 2026-10-01 (T53/T54)

## Summary

Live routing history + dashboard wiring. Commit `4a3fb3a` (v1.0.7). Kernel 695f03cb + dashboard BUILD_ID `hAnndr1G1UQ1DrCgy_qfg` live on Hetzner.

## Completed (T53/T54)

- `ai.recordLLMRouting` hooks AutoRoute / AutoRouteWithModel / Router.Route
- `handleAgentRunTool` records tool routing (go-native / upstream / unavailable)
- Dashboard `/dashboard/skills`: working-set panel + Load/Unload
- Dashboard `/dashboard/metrics`: routing history table
- Fixed `fmt.Sprint` `<nil>` leak in `recordLocalMetric`
- Deploy gotcha: `/usr/local/bin/hypernexus` script wrapper holds :7778 — kill listeners before binary swap

---

## Session Date: 2026-10-01

## Summary

Metrics local fallbacks, skill working-set API, and Next.js dashboard redeploy. Commit `5ecbbf6` on `clean-main` (v1.0.6). Kernel + dashboard live on Hetzner.

## Completed (2026-10-01)

### Metrics (T50)
- `metrics.MetricsService` extended: `GetTimeline`, `RecordRouting`, `GetRoutingHistory` (500-entry ring)
- `handleMetricsStats` / `Timeline` / `RoutingHistory` fall back to local store (200, `fallback: go-local-metrics`) when upstream tRPC is down
- `handleMetricsTrack` always dual-writes locally via `recordLocalMetric`; routing-shaped payloads feed routing history

### Skills (T51)
- `handleSkillLoad` / `Unload` / `ListLoaded` implemented against an in-memory working set (was 501)
- Routes: `GET/POST /api/skills/load|unload|list-loaded` (`?id=` or JSON `{"id":"..."}`)

### Dashboard (T52)
- `apps/web` rebuilt (Next.js 16.2.6 standalone, BUILD_ID `P9HUWlTE6tqDCp2aXxkua`)
- Deployed via overlay: keep Hetzner `node_modules`, replace `.next-build`/`.next`/`server.js`/`public`
- `hypernexus-dashboard.service` active on `:7779`; `/dashboard` 200

### Live smoke (Hetzner)
- `GET /api/metrics/stats` → 200 `go-local-metrics`
- `GET /api/metrics/timeline` + `/routing-history` → 200 local fallbacks
- `GET /api/skills/load?id=smoke-skill` → 200; `list-loaded` shows it; `unload` removes it
- `GET :7779/dashboard` → 200; kernel `/dashboard` still 401 without token

---

## Session Date: 2026-09-30

## Summary

HyperNexus memory stack hardened end-to-end: L2 export/import, GraphRAG extraction + visualization, MCP tool schemas, Ollama fallbacks, dashboard auth, deploy/backup automation. Work pushed to `clean-main` as `c6bfaae` → `a897b44` → `bd065da` → `60ba63f` (+ this commit).

## Completed

### Memory & Graph
- `/api/memory/l2/export` + `import` with error reporting; round-trip stable (27→27)
- `memory_extract_relations` + `memory_extract_relations_batch` (pattern + Ollama JSON triples)
- `/api/memory/graph` with entity slug labels (`ent-ollama`) and memory previews
- `/api/memory/graph/cleanup` drops opaque hashed `ent-xxxxxxxx` nodes
- Conflict detector: Jaccard ≥0.9 / polarity flips / conflicting numbers only; upsert does not cascade-supersede
- Relation-aware `SemanticSearch` boosts `l2_relations` neighbors
- `search` returns `sources: [upstream|local-json|vectorstore]`
- Dual-write `AddRelation` → `l2_relations` + `memory_relations`
- FTS5 external-content delete triggers fixed; legacy table dropped on open

### MCP / Tools
- `tools.NativeToolMeta` — full `inputSchema` for 34 native tools (replaces incomplete switch)
- `memory_extract_relations(_batch)` registered in kernel registry
- `/api/agent/tool` accepts `name|toolName` + `arguments|args`
- mcp.jsonc: 0 missing binaries (uvx/npx fallbacks); serena `--from` args split

### Ops
- Dashboard `HYPERNEXUS_DASHBOARD_TOKEN` (login form + write-API guard)
- Write auth accepts `X-Dashboard-Token`, `?token=`, `Authorization: Bearer`, `hn_dash_token` cookie
- `scripts/backup-l2.sh` cron `17 3 * * *` on Hetzner (keep 14)
- `.github/workflows/deploy-hetzner.yml` (gzip + size check + smoke tests; needs `HETZNER_SSH_KEY` secret)
- `scripts/test-l2-roundtrip.ps1` + `scripts/hetzner-setup.sh`
- Nginx `/kernel-dashboard` → `:7778/dashboard`

### Live auth verification (2026-09-30)
- `POST /api/memory/l2/import` without/with wrong token → 401
- `POST /api/memory/l2/import` with `X-Dashboard-Token` or `?token=` → 200
- `POST /api/memory/graph/cleanup` without token → 401; with token → 200
- `GET /kernel-dashboard` without token → 401
- `GET /api/memory/l2/export` remains open (read path for local agents)

## Hetzner state

- Kernel `/opt/tormentnexus/tormentnexus` (Linux amd64), systemd `hypernexus-kernel` port 7778
- Ollama systemd enabled, `nomic-embed-text`
- Dashboard token file: `/root/.hn-dashboard-token`
- L2 backups: `/opt/tormentnexus/backups/l2`
- Graph ~36 nodes / 103+ edges; 25 long_term memories after supersede fix

## Next agent must

1. ~~GitHub secrets~~ — **DONE** `HETZNER_SSH_KEY` + `HETZNER_KNOWN_HOSTS` set (2026-09-30). `gh` logged in as `robertpelloni`.
2. ~~Verify CI~~ — **DONE** HyperNexus CI green (build/lint/test) + `deploy-hetzner.yml` green (push + workflow_dispatch)
3. Re-embed / re-extract after any VectorStore schema change
4. Build Linux with `GOOS=linux GOARCH=amd64 CGO_ENABLED=0` — never ship Windows `.exe` to Hetzner
5. CI deploy uses `scripts/ci-deploy-hetzner.sh` (gzip + size check + smoke tests). Secrets-in-`if` is invalid — use `env.HAS_SSH_KEY`.

6. **Dashboard overlay deploy** — Windows pnpm standalone `node_modules` are broken symlinks on Linux. Keep Hetzner `node_modules`, overlay only `.next-build`/`.next`/`server.js`/`public`. Full standalone tar from Windows fails with `Cannot find module 'next'`.

## Branch / remotes

- Branch: `clean-main` (not `main`)
- Remotes: `github`, `gitlab` (no `origin`)
- Push both: `git push github clean-main; git push gitlab clean-main`

## Useful scripts (repo)

- `scripts/backup-l2.sh` — Hetzner L2/agent-memory backup
- `scripts/test-l2-roundtrip.ps1` — export/import verification
- `scripts/hetzner-setup.sh` — deploy + token + cron one-shot
