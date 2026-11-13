# Dashboard Consolidation Audit — 2026-11-13

## Current shape

- Canonical surface: `apps/web/src/app/dashboard/dashboard-home-view.tsx`, a single-page
  console with sticky anchor navigation. Sections: mission-control,
  cross-session-coordination (new), memory-graphrag, mcp-registry,
  research-workflows, health-metrics, skills-workflows, security-audit,
  healer-cognition, integrations, governance-billing.
- Sidebar: `apps/web/src/components/Sidebar.tsx` renders
  `SIDEBAR_SECTIONS` from `apps/web/src/components/mcp/nav-config.ts`
  (7 sections, collapsible, favorites/recents/search + command palette).
- Legacy weight: ~60 top-level `apps/web/src/app/dashboard/*` page directories
  (plus ~20 `mcp/*` subpages). Many are already `RedirectPage` stubs
  (~285-300 byte files); the rest carry unique views that were folded into
  the home page. They are not linked from the sidebar; retiring them is a
  separate, careful pass (TODO already tracks it).

## Findings this pass

1. **Duplicate sidebar anchors.** Several items pointed at the same anchor
   with overlapping purpose (e.g. Tool Catalog / Tools Inspector / Tool
   Console / Tool Karma all -> `#mcp-registry`; Swarm & Agents and Workflows
   both -> `#research-workflows`). Sidebar dedupe is by href, so duplicates
   also collapsed unpredictably in favorites/palette.
   **Fixed:** nav items merged per anchor with combined tooltips; count
   reduced while every anchor stays reachable.
2. **Wrong anchor.** Healer & Auto-Repair pointed at `#mission-control`;
   its section is `#healer-cognition`. **Fixed.**
3. **Cross-session interconnect invisible.** The session bus, watcher,
   CDP bridge, ack receipts and `/api/agent/orchestrate` had no dashboard
   representation. **Fixed:** new read-only `CrossSessionBusPanel`
   (registered sessions, unanswered messages, replies, web deliveries;
   loading/error/empty states; 10s refresh) placed directly under
   Mission Control, plus a "Sessions & Coordination" sidebar item and a
   "Sessions" home tab.
4. **System tray already exists and is sensible.**
   `go/internal/systray/systray_windows.go`: Open Dashboard, full event
   logs (+last-10 clickable log entries), version/status info, autostart
   toggle, and **Exit All Processes** with a Yes/No choice (quit everything
   vs kernel-only). Ghost-icon cleanup on shutdown is implemented.
   It starts with the Go kernel's desktop path; headless serve has no tray.
5. **Tooltips.** Nav items all carry `title` tooltips; the new panel uses
   descriptive `title` attributes on headers, metrics, registry and
   activity rows. Remaining gap: per-card forms inside legacy sub-views.

## Value order after this pass

Overview (Dashboard, Mission Control, Sessions & Coordination, MCP,
Memory) -> Agents & Automation -> Tools & Code -> Memory & Knowledge ->
Infrastructure -> Integrations -> Admin. Highest-value live operations
(kernel/session health, cross-session work, tool registry) are within the
first two sidebar sections and the first screen of the home page.

## Next steps (tracked in TODO)

- Retire remaining legacy `dashboard/*` routes only after verifying each
  unique fetch is represented on the home page (do not stub blindly).
- Continue decomposing `dashboard-home-view.tsx` (4.6k+ lines) into
  per-section components; `dashboard-consolidated-sections.tsx` and the
  new cross-session panel are the pattern.
- Add forms/filters to the health/skills/security consolidated sections
  (currently read-mostly).
- Kernel-side: batch/SQLite the memory-facts write path; the dashboard
  bus panel already reads the fast scratchpad transport.
