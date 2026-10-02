# TODO — HyperNexus

> **Last Updated:** 2026-10-02
> **Current Version:** 1.0.11
> **Status:** Core infrastructure complete, dashboard consolidated, production deployed

---

## 🔥 Critical Path

### Security & Ops

- [ ] **Rotate remaining API keys** — 20+ credentials pending (see `docs/API_KEY_ROTATION_CHECKLIST.md`)
- [ ] **Reddit password** — `Temppass0!` is CRITICAL (dictionary-crackable), rotate immediately
- [ ] **Stripe webhook delivery** — payments process but subscriptions don't activate if webhooks don't reach server
- [ ] **License file** — kernel runs in free mode (`hypernexus.lic` not found)

### Dashboard Completeness

- [ ] **Wire HTTP fallbacks for 3 tRPC-only pages** — `mcp/search`, `mcp/inspector`, `mcp/ai-tools` still use pure tRPC
- [ ] **MCP server connections** — only 1 of 60+ servers connected at startup
- [ ] **Session import errors** — 38 errors during auto-import (old/corrupt session files)

### Build & Tests

- [ ] **Fix pre-existing test failures** — `TestToolResultSnapshots`, `TestVerifyLicense`, `TestResolveClientTargets`
- [ ] **Deploy v1.0.11 to Hetzner** — production still on v1.0.5
- [ ] **Sync package versions on Hetzner** — `pnpm install` on server for standalone build

---

## 📈 Short-Term (Next Sprint)

### Product

- [ ] **MCP Client Examples** — Python, TypeScript, Go examples
- [ ] **API Documentation** — OpenAPI/Swagger spec
- [ ] **Getting Started Tutorial** — 5-minute quickstart
- [ ] **Video Demo** — 2-minute product demo

### Integration

- [ ] **Full MCP catalog indexing** — 26k+ tools from Glama.ai (catalog-sync works but limited)
- [ ] **Cloud Landing Page** — Build cloud.hypernexus.site frontend
- [ ] **Pricing Page** — Stripe checkout for both tiers

---

## 🚀 Medium-Term (This Month)

### Cloud Features

- [ ] **User Dashboard** — Account management, usage stats
- [ ] **Team Accounts** — Shared memory pools
- [ ] **SSO Integration** — SAML/OIDC for enterprise
- [ ] **Custom Domains** — white-label support

### Billing

- [ ] **License Key System** — Ed25519-signed tokens
- [ ] **Usage Metering** — Track API calls, storage
- [ ] **Referral Program** — Credits for referrals

---

## 🧠 Competitive Gap Features

> From competitive analysis of mem0, Zep, LangMem, Letta, Hindsight, SuperMemory.
> See `docs/competitive-analysis.md` for details.

### Quick Wins (1-2 weeks)

- [ ] **Temporal Edges in Graph** — `valid_from`/`valid_to` on `graph_edges`
- [ ] **Fact Conflict Resolution** — Smart ADD/UPDATE/DELETE for contradicting memories
- [ ] **Memory Export/Import** — Portable JSON/JSONL bundles

### Differentiation (1 month)

- [ ] **Cross-Agent Memory Sharing** — Shared L2 vault with access control
- [ ] **Mental Model Extraction** — Background reflection distilling patterns from L2

### Enterprise (2-3 months)

- [ ] **SOC2/HIPAA Compliance** — Audit logging, encryption at rest
- [ ] **Memory Access Control** — RBAC on memory read/write
- [ ] **Memory Versioning** — Git-like history for memory changes

---

## ✅ Completed (2026-10)

### v1.0.11 — Script Cleanup & Rebuild

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
