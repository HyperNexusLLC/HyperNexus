# TODO — HyperNexus

> **Last Updated:** 2026-07-18
> **Current Version:** 1.0.0-b1
> **Status:** Infrastructure complete, preparing for public launch

---

## 🔥 Critical Path (This Week)

### Launch Preparation

- [x] **GitLab Migration** — Module path, CI/CD, deployment
- [x] **Cloud Infrastructure** — API, MCP transport, Docker provisioning
- [x] **Hetzner Deployment** — 14 services, 5 containers running
- [x] **SSL Setup** — Scripts for cloud.hypernexus.site
- [x] **Scheduled Healthchecks** — GitLab CI/CD monitoring
- [ ] **Cloud Landing Page** — Build cloud.hypernexus.site frontend
- [ ] **Pricing Page** — Implement Stripe checkout for both tiers
- [ ] **Product Hunt Launch** — Craft narrative and launch
- [ ] **Reddit Posts** — r/LocalLLaMA, r/MachineLearning
- [ ] **Hacker News** — Show HN post

### Twitter Bot

- [ ] **Add Twitter API Credits** — developer.twitter.com (402 error)
- [ ] **Test Auto-Posting** — Verify content generation works
- [ ] **Schedule Posts** — Regular content cadence

---

## 📈 Growth Phase (Next 2 Weeks)

### Product

- [ ] **MCP Client Examples** — Python, TypeScript, Go examples
- [ ] **API Documentation** — OpenAPI/Swagger spec
- [ ] **Getting Started Tutorial** — 5-minute quickstart
- [ ] **Video Demo** — 2-minute product demo for Product Hunt
- [ ] **VS Code Extension** — Sidebar with memory and catalog

### Marketing

- [ ] **Blog Series** — "Why AI Needs Persistent Memory"
- [ ] **Case Studies** — Real-world developer workflows
- [ ] **Community Discord** — Set up channels and bots
- [ ] **GitHub Discussions** — Enable in repo settings
- [ ] **Contributing Guide** — How to contribute

### Sales

- [ ] **Corporate Pitch Deck** — Slide deck for enterprise
- [ ] **Sales One-Pager** — PDF for outreach
- [ ] **Enterprise Outreach** — Target 10 companies
- [ ] **Demo Environment** — cloud.hypernexus.site/demo

---

## 🚀 Scale Phase (This Month)

### Cloud Features

- [ ] **User Dashboard** — Account management, usage stats
- [ ] **Team Accounts** — Shared memory pools
- [ ] **SSO Integration** — SAML/OIDC for enterprise
- [ ] **Audit Logs** — Compliance and security
- [ ] **Custom Domains** — white-label support

### Billing

- [ ] **Stripe Checkout** — $50 lifetime or $5/month
- [ ] **License Key System** — Ed25519-signed tokens
- [ ] **Usage Metering** — Track API calls, storage
- [ ] **Invoice Generation** — PDF invoices for businesses
- [ ] **Referral Program** — Credits for referrals

### Partnerships

- [ ] **DeepSeek Partnership** — Official integration
- [ ] **Ollama Collaboration** — Featured in ecosystem
- [ ] **Cursor Integration** — Deep integration
- [ ] **GitHub Copilot** — Feed context to Copilot

---

## ✅ Completed (July 2026)

### Infrastructure

- [x] Go sidecar on port 7778
- [x] Next.js dashboard on port 7779
- [x] Cloud API on port 7780
- [x] MCP Streamable HTTP transport
- [x] Docker container provisioning
- [x] Automatic backup system
- [x] SSL certificate automation
- [x] GitLab CI/CD pipeline
- [x] Scheduled healthchecks

### Migration

- [x] GitHub → GitLab module path
- [x] 427 files updated
- [x] Docker containers renamed
- [x] Hetzner services updated
- [x] nginx configurations updated

### Documentation

- [x] Cloud deployment guide
- [x] SSL setup documentation
- [x] API reference
- [x] Hetzner migration script

---

## 🧠 Competitive Gap Features (from BobbyBookmarks analysis)

> These features were identified by analyzing competitors: mem0, Zep, LangMem, Letta, Hindsight, SuperMemory
> See `docs/competitive-analysis.md` for full details.

### Phase 1: Quick Wins (1-2 weeks)

- [ ] **Temporal Edges in Graph** — Add `valid_from`/`valid_to` columns to `graph_edges` table
  - Enables tracking when facts were true and how they evolved
  - Competitors: mem0 (Mem0g), Zep (Graphiti)
  - Priority: MEDIUM

- [ ] **Memory Type Enum** — Add `memory_type` field to memories table
  - Values: `semantic` (facts), `episodic` (interactions), `procedural` (how-to)
  - Enables explicit separation of memory kinds
  - Competitors: LangMem (3-tier), Hindsight (World/Experiences/Models)
  - Priority: LOW (our tag system covers this implicitly)

- [ ] **Fact Conflict Resolution** — Smart ADD/UPDATE/DELETE logic for memories
  - When new memory contradicts existing one, flag for review or auto-update
  - Prevents stale facts from polluting context
  - Competitors: mem0 (explicit reconciliation)
  - Priority: MEDIUM

### Phase 2: Differentiation (1 month)

- [ ] **Mental Model Extraction** — Periodic reflection that distills high-level patterns
  - Background agent that reviews L2 memories and creates abstract mental models
  - Similar to how humans form generalizations from specific experiences
  - Competitors: Hindsight (biomimetic reflection)
  - Priority: LOW

- [ ] **Cross-Agent Memory Sharing** — Shared L2 vault across agent instances
  - Team-wide memory pool so agents learn from each other
  - Already partially implemented via L2, needs access control
  - Priority: MEDIUM

- [ ] **Memory Export/Import** — Portable memory bundles for team sync
  - Export memories as JSON/JSONL for backup or migration
  - Import memories from other instances
  - Enables "memory as code" workflow
  - Priority: MEDIUM

### Phase 3: Enterprise Features (2-3 months)

- [ ] **SOC2/HIPAA Compliance** — Audit logging, encryption at rest
  - Required for enterprise customers in regulated industries
  - Competitors: Zep Cloud (SOC2 Type 2 / HIPAA)
  - Priority: LOW (until we have enterprise demand)

- [ ] **Memory Access Control** — RBAC on memory read/write
  - Role-based permissions for who can read/write which memories
  - Already have RBAC framework, extend to memories
  - Priority: MEDIUM

- [ ] **Memory Versioning** — Git-like history for memory changes
  - Track who changed what and when
  - Rollback to previous memory states
  - Priority: LOW

---

## 📊 Metrics to Track

| Metric | Current | Target (Month) | Target (Quarter) |
|--------|---------|----------------|------------------|
| GitLab Stars | 0 | 100 | 1,000 |
| npm Downloads | 0 | 500/week | 5,000/week |
| Cloud Users | 0 | 50 | 500 |
| Paying Customers | 0 | 10 | 100 |
| MRR | $0 | $500 | $5,000 |
| Test Coverage | ~20% | 60% | 80% |
| Contributors | 1 | 5 | 20 |

---

## 🎯 Success Criteria

**Launch Success (This Week):**

- [ ] Product Hunt #1 Product of the Day
- [ ] 50+ GitLab stars
- [ ] 100+ visitors to cloud.hypernexus.site
- [ ] 5+ signups for cloud beta
- [ ] Front page of r/LocalLLaMA

**Growth Success (This Month):**

- [ ] 500+ GitLab stars
- [ ] 50 paying customers
- [ ] $500 MRR
- [ ] 50+ Discord members
- [ ] 3+ case studies published

**Scale Success (This Quarter):**

- [ ] 5,000+ GitLab stars
- [ ] 500 paying customers
- [ ] $5,000 MRR
- [ ] Enterprise pilot with 1 company
- [ ] 20+ contributors
