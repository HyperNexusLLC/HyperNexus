> **Canonical development lives in [TormentNexus](https://github.com/MDMAtk/TormentNexus)** — the open-source original. This repository is the **commercial HyperNexus edition**: the same codebase under commercial license terms, for hosted deployment, support, and enterprise use. Build from TormentNexus; license it as HyperNexus. (Consolidation decided 2026-10-23.)

# HyperNexus

**HyperNexus is the commercial face of TormentNexus — not a separate codebase.** It is a local-first AI control plane (Go sidecar on `:7778` plus consolidated Next.js dashboard on `:7779`) that sits between AI coding clients (Claude Code, Cursor, Codex, Pi, Muse, Gemini CLI, Antigravity, and others) and the models/tools behind them. Its core jobs are **progressive MCP tool routing** (injecting only the tool schemas relevant to the current prompt instead of the whole catalog), **provider failover** across API and local models, **multi-tier memory** (L1 session scratchpad + L2 SQLite/vector semantic store + L3 cold archive), and **multi-agent coordination** (cross-session bus + Edge CDP 9222 bridge).

The canonical open-source repo is **MDMAtk/TormentNexus**. This repository (under the HyperNexusLLC org on GitLab and GitHub; Go module path `gitlab.com/HyperNexusLLC/HyperNexus`) is its commercial mirror. `robertpelloni/HyperNexus` is an empty private placeholder — this is the real repo.

## Status

- **Alpha, under active development.** Current version is tracked in [`VERSION`](VERSION) (`1.0.46` as of 2026-11-12). Backwards compatibility is not guaranteed; APIs and config formats change without notice.
- Live proof of the routing/latency claims is **not yet closed** — see the TormentNexus README for the honest state of the benchmark work. Outreach is held until live proof and end-to-end Stripe billing settlement/webhook verification are complete.

## Pricing (finalized 2026-10-25)

- **Trial:** \$1.99 per team, up to 5 seats, 14 days, one trial per team, charged at trial start.
- **After trial:** \$5 per seat per month, per named user, from day 15.
- **Founding fee:** \$200 one-time per team, non-refundable, locking \$5/seat for 12 months. Founding window: 90 days or 25 teams, whichever first.
- Setup is self-serve plus a 1-hour founding onboarding call. Full export for 30 days after cancellation, then deleted.

*Note:* Marketing copy must match the finalized terms above; real-charge settlement, webhook state, and refund/cancel verification remain tracked in `TODO.md`.

## Layout

```text
go/             Go sidecar — the authoritative kernel (:7778)
  cmd/            tormentnexus (main hypernexus binary) and cloud server entry points
  internal/       httpapi, mcpimpl, memorystore (MiniLM + LRU cache), systray, mesh, controlplane
apps/
  web/            Consolidated single-page Next.js dashboard (:7779, @hypernexus/web)
  vscode/ jetbrains/ native-ui/ tormentnexus-extension/   editor, desktop & browser surfaces
addons/
  shared/         hypernexus.manifest.json, session-bus.mjs, cdp-bridge.mjs (muse/gemini/chatgpt)
  pi/ codex/ codex-gui/ mimo/ freebuff/ hax/ ...          per-harness extensions & launchers
packages/       Shared TypeScript/UI packages (pnpm workspace)
vendor/         Submodules (deepseek-harness, grok-build) + lumbros.me
scripts/        Build, version sync (sync-versions.mjs), priority (set-llm-priority.ps1), ops scripts
```

## Build & Run

Go sidecar (Go 1.25+):

```bash
# Windows: build.bat stamps VERSION into bin/hypernexus.exe
# Cross-platform / manual build:
cd go
go build -ldflags "-s -w -X gitlab.com/HyperNexusLLC/HyperNexus/internal/buildinfo.Version=$(cat ../VERSION)" -buildvcs=false -o ../bin/hypernexus ./cmd/tormentnexus
```

Web dashboard (Node 20+ & pnpm 10+):

```bash
pnpm install
cd apps/web && npx next build
node node_modules/next/dist/bin/next start -p 7779
```

Or use `start.bat` (Windows, launches services at `BelowNormal` priority) / `start.sh` (Linux/macOS). The kernel runs on `http://127.0.0.1:7778` (`/health`, `/api/index`) with a Windows system tray helper, and the consolidated dashboard runs at `http://127.0.0.1:7779/dashboard`. Configuration lives in `~/.hypernexus/` (`config.json`, `mcp.json`); see `DEPLOY.md`.

## Known Gaps & Caveats

- Alpha software; expect breaking changes.
- Live routing/latency benchmark proof and end-to-end live Stripe charge/refund test remain open.
- HyperNexus LLC is not yet legally formed (United Beats LLC is the formed contracting entity).
- A legacy file named `go/NUL` or oversized runtime DBs (`data/tormentnexus.db`) can cause issues on Windows or GitHub pushes if staged blindly — use `commit-and-push.bat` or explicit staging per `AGENTS.md`.

## Documentation

Core governance docs: `VISION.md`, `ROADMAP.md`, `TODO.md`, `DEPLOY.md`, `MEMORY.md`, `IDEAS.md`, `CHANGELOG.md`, `HANDOFF.md`, and `docs/SUBMODULES.md`. Where older assessment notes disagree with the code, believe the code.

## License

The underlying open-core code is AGPL-3.0 (see `LICENSE`); commercial licensing for hosted/enterprise deployment is the purpose of this repository.

## Links

- Canonical OSS repo: https://github.com/MDMAtk/TormentNexus
- Primary commercial mirror: https://gitlab.com/HyperNexusLLC/HyperNexus
- Site: https://hypernexus.site
- Author: https://robertpelloni.com
