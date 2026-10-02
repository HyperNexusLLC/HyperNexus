# TODO — HyperNexus

> **Last Updated:** 2026-10-02
> **Current Version:** 1.0.11
> **Status:** Core infrastructure complete, dashboard consolidated, production deployed, all MCP servers connected

---

## 🔥 Critical Path

### Security & Ops

- [ ] **Rotate remaining API keys** — 20+ credentials pending (see `docs/API_KEY_ROTATION_CHECKLIST.md`)
- [ ] **Reddit password** — `Temppass0!` is CRITICAL (dictionary-crackable), rotate immediately
- [x] **Stripe webhook delivery** — handler wired at `/api/billing/stripe/webhook`, 11 STRIPE_* env vars on Hetzner, returns 400 on unsigned POST (expected)
- [ ] **License file** — kernel runs in free mode (`hypernexus.lic` not found)

### Dashboard Completeness

- [x] **Wire HTTP fallbacks for 3 tRPC-only pages** — `mcp/search`, `mcp/inspector`, `mcp/ai-tools` all wired via `use-mcp-http.ts`
- [x] **MCP server connections** — 56/56 connected via `POST /api/mcp/connect-all`; 4 alwaysOn auto-start at boot
- [x] **Session import errors** — 38→0 errors fixed (scanner buffer, extractAllStrings fallback, config exclusion, silent skip for empty transcripts)

### Build & Tests

- [x] **Fix pre-existing test failures** — `TestToolResultSnapshots`, `TestVerifyLicense`, `TestResolveClientTargets` all fixed
- [x] **Deploy v1.0.11 to Hetzner** — production running v1.0.11
- [x] **Sync package versions on Hetzner** — node_modules present, dashboard returns 200

---

## 📈 Short-Term (Next Sprint)

### Product

- [x] **MCP Client Examples** — Python, TypeScript, Go examples in `examples/mcp-clients/`
- [x] **API Documentation** — OpenAPI 3.0 spec generated from kernel API index (554 routes) at `docs/openapi.json`
- [x] **Getting Started Tutorial** — 5-minute quickstart in `docs/QUICKSTART.md`
- [ ] **Video Demo** — 2-minute product demo

### Integration

- [ ] **Full MCP catalog indexing** — 26k+ tools from Glama.ai (catalog-sync works but limited)
- [x] **Cloud Landing Page** — `cloud/landing` with hero, features, stats, CTA, footer
- [x] **Pricing Page** — `/pricing` with Stripe checkout integration (3 tiers: Basic $29, Pro $99, Commercial $499)

---

## 🚀 Medium-Term (This Month)

### Cloud Features

- [ ] **User Dashboard** — Account management, usage stats
- [ ] **Team Accounts** — Shared memory pools
- [ ] **SSO Integration** — SAML/OIDC for enterprise
- [ ] **Custom Domains** — white-label support

### Billing

- [x] **License Key System** — Ed25519-signed tokens via `go/cmd/licensegen` (keygen + signed `hypernexus.lic`)
- [x] **Usage Metering** — `/api/usage/metering` returns memory count, versioned IDs, scratchpad keys
- [ ] **Referral Program** — Credits for referrals

---

## 🧠 Competitive Gap Features

> From competitive analysis of mem0, Zep, LangMem, Letta, Hindsight, SuperMemory.
> See `docs/competitive-analysis.md` for details.

### Quick Wins (1-2 weeks)

- [x] **Temporal Edges in Graph** — `valid_from`/`valid_to` already in `go/internal/graph/schema.go` (DATETIME columns on graph_edges)
- [x] **Fact Conflict Resolution** — `resolveConflictLocked` + `extractSubject` in `go/internal/memory/manager.go` — supersede contradicting facts/preferences on Store
- [x] **Memory Export/Import** — `/api/memory/export`, `/api/memory/import`, `/api/memory/l2/export`, `/api/memory/l2/import` all working

### Differentiation (1 month)

- [x] **Cross-Agent Memory Sharing** — real Memorix L2 vault with ACL/TTL in `mcpimpl/cross_agent_memory.go` (replaced stubs)
- [x] **Mental Model Extraction** — `MentalModelReflection` in `vector_sqlite.go` (LLM synthesis via AutoRoute/Ollama, runs hourly in sleep cycle)

### Enterprise (2-3 months)

- [x] **SOC2/HIPAA Compliance** — Audit logging via `commercial.Auditor`, encryption at rest via `memorystore/encryption.go` (AES-256-GCM, `HYPERNEXUS_MEMORY_ENCRYPTION_KEY`)
- [x] **Memory Access Control** — RBAC via `MemoryAccessControl` (admin/writer/reader/guest) + `RoleForResource`/`SetUserRole`/`ListRoles` in `commercial/commercial.go`
- [x] **Memory Versioning** — git-like history via `RecordVersion`/`VersionHistory`/`GetVersion` + HTTP endpoints `/api/memory/versions*`
- [x] **Usage Metering** — `/api/usage/metering` returns memory count, versioned IDs, scratchpad keys

---

## ✅ Completed (2026-10)

### v1.0.11 — MCP Auto-Start, Connect All, HTTP Fallbacks

- [x] MCP alwaysOn auto-start (4 servers at kernel boot)
- [x] MCP Connect All endpoint (`POST /api/mcp/connect-all` — 56/56 servers)
- [x] `mcp-yfinance-server` config fix (uvx)
- [x] ai-tools page HTTP fallbacks
- [x] All Go tests pass (3 pre-existing failures fixed)
- [x] Hetzner deploy v1.0.11
- [x] Archive 16 obsolete scripts (nondestructive)
- [x] Full rebuild verification (Go kernel + dashboard)
- [x] Service restart with health checks

### v1.0.10 — Dashboard Consolidation

- [x] Sidebar navigation fix (anchor links into single-page dashboard)
- [x] catalog.db corruption repair (LFS pointer fix)
- [x] Kernel binary rebuild from source

### v1.0.9 — HTTP Fallbacks

- [x] `use-startup-status.ts` hook (tRPC primary + kernel HTTP fallback)
- [x] Startup checks for dashboard-compatible shape

### v1.0.8 — Intelligent Merge

- [x] 79 `go/internal/` files from feature branch (L3, gossip, mcpimpl tools)
- [x] mcpimpl redeclaration resolution (batch files win over stubs)
- [x] Dual-remote git (GitHub + GitLab) unified history

### v1.0.5 — MCP Search & Production

- [x] `searchAccessoryTools` + `handleMCPSearchTools` merge
- [x] Hetzner production deploy verified
- [x] Disk cleanup 84% → 74%
- [x] API key rotation checklist
