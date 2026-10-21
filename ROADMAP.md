# HyperNexus — ROADMAP (structural, long-term)

> Version source of truth: `VERSION.md`. Every milestone bump commits + pushes with the version in the message.

## Current State Snapshot (2026-10-21)

| Layer | Status |
|---|---|
| Go kernel (:7778) | ✅ running, 49+ tools, systray (fixed ghost + TaskbarCreated) |
| Dashboard (:7779) | ✅ running (Next.js standalone) — **99 pages / 66 components / 4958-line home view** |
| MCP server (stdio) | ✅ 58 tools, exposure:direct in pi/mimo |
| pi extension | ✅ 22 tools + 7 commands + 17 hooks (robust, honest, fast) |
| mimo plugin | ✅ 22 tools + 26 hooks (reliability + our features merged) |
| Watchdog | ✅ active (stall-vs-death aware) |
| Ollama | ⚠️ running but `llama-server` binary missing → native embeds dead (we use bundled MiniLM) |
| Marketing agent (:8084) | ❌ not running |

---

## Milestone 1 — Dashboard Consolidation (HIGHEST VALUE)

**Problem:** 99 separate pages + 66 components + a 4958-line `dashboard-home-view.tsx`. Deeply fragmented; the nav (`nav-config.ts`) already maps ~26 anchor sections in the home view, but 99 standalone pages duplicate them. Users can't tell where anything is.

**Goal:** ONE consolidated dashboard surface — a single home view organized into a small number of high-value, ordered sections, with every feature reachable + described.

1. **Audit + canonicalize** the 99 pages → map each to a target section. Anything not represented is a gap.
2. **Order sections by value**, not alphabetically:
   1. Mission Control (health, status, quick actions) — always first.
   2. Memory & Knowledge (explorer, analytics, cold archive, skills, knowledge graph).
   3. Tools & MCP (catalog, inspector, console, router).
   4. Agents & Orchestration (swarm, council, director, workflows, subagents).
   5. Code & Runtime (code platform, sandbox, sessions).
   6. Observability (logs, metrics, audit, events, mesh).
   7. Commercial (billing, providers, API keys, plans).
   8. System (architecture, security, account, integrations).
3. **Decompose `dashboard-home-view.tsx`** (4958 lines) into one component per section, lazy-loaded. Reduces bundle + makes each reviewable/testable.
4. **Tooltips everywhere** — every panel, metric, and action gets a `title`/tooltip explaining *what it is, why it matters, and what to do*.
5. **Retire redundant pages** — subpages that just wrap a home section get redirected to their anchor (`/dashboard/x` → `/dashboard#x`).

## Milestone 2 — Kernel Resilience & Observability
- Embedding cache (in-memory vector matrix) for sub-second semantic search under load.
- Per-endpoint latency histogram exposed to the dashboard.
- Watchdog as a **scheduled task** (survives reboot) — currently a background process only.

## Milestone 3 — Extension Ecosystem Parity
- Port pi's `tn-orchestrate` + `workflow` + `browser` tools to mimo/opencode.
- Autonomous orchestration across harnesses via `addons/shared/hypernexus.manifest.json`.

## Milestone 4 — Data Integrity
- Memory `archive` vs `long_term` semantics — document + expose in UI (search now covers 100%, ranked).
- Backup/restore story for `memory.db` (currently ad-hoc `.bak` binaries, now gitignored).

## Milestone 5 — Production Hardening
- Replace the per-restart kernel deploys with a graceful, zero-downtime reload where possible.
- Full `DEPLOY.md` parity for Hetzner + local.
