# Submodule Structural Map

Regenerated 2026-11-07 (v1.0.30 repo-sync, Session SYNC3). Source of truth: `.gitmodules` + `git submodule status`. All three re-fetched this session: no new upstream commits, no feature branches, pointers unchanged. Untracked HyperNexus overlays inside `vendor/deepseek-harness` (`README-HYPERNEXUS.md`, `hypernexus.cordis.yml`) and `vendor/grok-build` (`.grok/`, `hypernexus-mcp.toml`) retained as-is.

| Path | Remote URL | Commit | Branch/Describe |
|---|---|---|---|
| `vendor/deepseek-harness` | https://github.com/deepseek-ai/deepseek-harness.git | `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` | dsh-v0.2.1-alpha.2-4443-gfcc0ad4621 (upstream master, release-dsh-0.2.2-rc.1 merge) |
| `vendor/grok-build` | https://github.com/xai-org/grok-build.git | `2bdd1d6a6369de0e8c68132ea4539e9abd9e14a8` | main |
| `lumbros.me` | https://github.com/candlestixxx/lumbros.me | `16261e00c12afe745a2d3e58168c12f27b80e1f8` | main |

Notes:
- No nested submodules (none of the three has its own `.gitmodules`).
- `vendor/` is listed in `.gitignore` for stray files; the submodule gitlinks above are tracked normally.
- deepseek-harness was bumped 2026-11-05 from `5badb1500` (v0.2.1-alpha.1) to upstream HEAD `fcc0ad4621`. Root Go module does not import it (docs/addon references only); integration re-verification is tracked in TODO.md.
- Historical note: legacy submodules under `go/submodules/` and `apps/maestro` were decommissioned earlier (see git history); the three above are the only active submodules.
