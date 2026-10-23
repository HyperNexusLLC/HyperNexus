> **Canonical development lives in [TormentNexus](https://github.com/MDMAtk/TormentNexus)** — the open-source original. This repository is the **commercial HyperNexus edition**: the same codebase under commercial license terms, for hosted deployment, support, and enterprise use. Build from TormentNexus; license it as HyperNexus. (Consolidation decided 2026-10-23.)

# HyperNexus

HyperNexus is a local-first AI control plane: a Go sidecar plus a web dashboard that sits between AI coding clients (Claude Code, Cursor, Codex, Gemini CLI, and others) and the models/tools behind them. Its core jobs are **progressive MCP tool routing** (injecting only the tool schemas relevant to the current prompt instead of the whole catalog), **provider failover** across API and local models, **two-tier memory** (ephemeral session scratchpad + persistent SQLite-backed semantic store), and **multi-agent coordination**.

This repository (under the HyperNexusLLC org) is the commercial edition; canonical development lives in TormentNexus, and this tree is its commercial mirror. The open-source counterpart is TormentNexus (tormentnexus.site). `robertpelloni/HyperNexus` is an empty private placeholder — this is the real repo. The Go module path is `gitlab.com/HyperNexusLLC/HyperNexus`; the tree is mirrored between GitHub and GitLab.

## Status

- Version **1.0.11** (see `VERSION`). Pre-launch: the product site (hypernexus.site) sells seats and the checkout is live, but the software should be treated as alpha — APIs and config formats change without notice.
- Development is heavily bot-assisted with a high commit cadence, and the tree shows it: compiled binaries (`go/tn-kernel-linux`, `go/tormentnexus-linux-amd64`), queue databases, and a file literally named `NUL` under `go/` are committed. **`NUL` breaks checkouts on Windows** — clone on Linux/macOS, or expect to fight that file.
- The previous README carried marketing figures (tool counts, server counts, a placeholder Discord badge). They were removed in this rewrite because they could not be verified from the code.

## Layout

```
go/          Go sidecar — the kernel
  cmd/         hypernexus (main binary) and cloud server entry points
  internal/    httpapi, mcp client sync, memorystore
  agent/ agents/ llm/ mcp/ orchestrator/ security/ tools/ tui/ repl/
apps/
  web/         Next.js dashboard (@hypernexus/web)
  vscode/ jetbrains/ native-ui/   editor & desktop integrations
  tormentnexus-extension/ borg-extension/
packages/      Shared packages (pnpm workspace)
npm/ dist/     Installer packages and release artifacts
scripts/       Build and utility scripts
```

## Build & run

Go sidecar (Go 1.25+):

```bash
cd go
go build ./...
```

Web dashboard (Node + pnpm):

```bash
cd apps/web
pnpm install
pnpm dev
```

Per the project's own docs, the installed binary runs as `hypernexus serve`, with the sidecar on port 7778 and the dashboard at `http://localhost:7779/dashboard`. Configuration lives in `~/.hypernexus/` (`config.json`, `mcp.json`); see `.env.example` and `DEPLOY.md`.

There are also Dockerfiles (`Dockerfile`, `Dockerfile.prod`, `Dockerfile.quick`) and a `Makefile` at the repo root.

## Docs in this repo

`VISION.md`, `ROADMAP.md`, `TODO.md`, `HANDOFF.md`, plus a large set of analysis/assessment documents (`MCP_ASSIMILATION_REPORT.md`, `TORMENTNEXUS_FEATURE_ASSESSMENT.md`, `ANALYSIS_MISSING_FEATURES.md`, …). They are working notes from the development process, of varying age — where they disagree with the code, believe the code.

## License

Dual licensing — see `LICENSE` and `LICENSE.txt` in the repo root.
