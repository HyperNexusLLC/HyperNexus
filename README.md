# HyperNexus

**HyperNexus is the commercial face of TormentNexus — not a separate
codebase.** It is the same AI control plane (multi-agent orchestration, MCP
tooling, provider routing, session continuity) under a commercial name, plus
cloud hosting and a thin commercial facade for corporate licensing.

The canonical open-source repo is **MDMAtk/TormentNexus**. This repo is its
commercial mirror. An automated sync from TormentNexus to this repo is planned
but not yet in place; the two trees are currently synced by hand, so they can
drift.

## Status

**Alpha, under active development.** Version 1.0.0-alpha.254 as of the
2026-11-12 repo sync. Backwards compatibility is not guaranteed. Last commit:
**2026-11-12** (Go build repair after an upstream merge).

Live proof of the routing/latency claims is **not closed** — see the
TormentNexus README for the honest state of the benchmark work. No paying
customers yet; outreach is held until live proof and billing verification
exist.

## Pricing (finalized 2026-10-25)

- **Trial:** $1.99 per team, up to 5 seats, 14 days, one trial per team,
  charged at trial start.
- **After trial:** $5 per seat per month, per named user, from day 15.
- **Founding fee:** $200 one-time per team, non-refundable, locking $5/seat
  for 12 months. Founding window: 90 days or 25 teams, whichever first.
- Setup is self-serve plus a 1-hour founding onboarding call. Full export
  for 30 days after cancellation, then deleted.

Note: the marketing site has at various points shown prices that do not match
these terms. The terms above are the finalized ones; the site still needs to
be reconciled to them, and a real-charge test (charge, settle, subscription
state, refund/cancel path) is still undone.

## What it is

Same system as TormentNexus:

- **MCP registry and catalog** — local SQLite catalog of MCP servers/tools,
  plus native Go tool implementations.
- **Provider routing** — fast router plus background queueing; router pinned
  to `qwen3:1.7b` (think off).
- **Multi-agent orchestration** — swarm launcher, task plane, session bus,
  CDP bridge, operator dashboard.
- **Memory & context** — persistent memory bank, context portal, LanceDB.

## What's not / known gaps

- Not production-ready. Alpha software; expect breaking changes and bugs.
- Live proof not closed; no spec benchmark has validated the performance
  claims.
- HyperNexus LLC is **not yet legally formed** — nothing is filed or signed
  under that name. (United Beats LLC is the formed contracting entity.)
- The repo is large and carries dead weight: stale docs, temp files, session
  archives, duplicate harness configs.

## Getting started

Same as TormentNexus: Go toolchain + Node.js; `start.bat` / `start.sh`
launchers. See `DEPLOY.md` and `docs/` for details. For the authoritative
description of the system, read the TormentNexus README.

## License

The underlying code is AGPL-3.0 (open core, see `LICENSE`); commercial
licensing is the point of this repo's existence.

## Links

- Canonical OSS repo: https://github.com/MDMAtk/TormentNexus
- Site: https://hypernexus.site
- Author: https://robertpelloni.com
