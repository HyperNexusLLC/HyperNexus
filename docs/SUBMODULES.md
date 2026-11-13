# Submodule Structural Map

Regenerated 2026-11-12 (v1.0.46 repo-sync, Session SYNC5). Source of truth: `.gitmodules` + `git -C <submodule> rev-parse HEAD` across all 3 submodules (`git fetch --all --tags` clean, 0 nested `.gitmodules`, 0 submodule feature branches). `vendor/deepseek-harness` local `master` branch ref fast-forwarded to `origin/master` (`e8f7b93a34`, dsh v0.2.2-rc.2); `vendor/grok-build` (`2bdd1d6a`) and `lumbros.me` (`16261e0`) verified at exact upstream `main` tips. Untracked HyperNexus overlays inside `vendor/deepseek-harness` (`README-HYPERNEXUS.md`, `hypernexus.cordis.yml`) and `vendor/grok-build` (`.grok/`, `hypernexus-mcp.toml`) retained as-is.

| Path | Remote URL | Commit | Branch/Describe |
|---|---|---|---|
| `vendor/deepseek-harness` | https://github.com/deepseek-ai/deepseek-harness.git | `e8f7b93a344964de3dca1ace9e72b6e4d6de87cb` | dsh-v0.2.2-rc.2 (upstream master) |
| `vendor/grok-build` | https://github.com/xai-org/grok-build.git | `2bdd1d6a6369de0e8c68132ea4539e9abd9e14a8` | main |
| `lumbros.me` | https://github.com/candlestixxx/lumbros.me | `16261e00c12afe745a2d3e58168c12f27b80e1f8` | main |

Notes:
- No nested submodules (none of the three has its own `.gitmodules`).
- `vendor/` is listed in `.gitignore` for stray files; the submodule gitlinks above are tracked normally.
- deepseek-harness was bumped 2026-11-05 from `5badb1500` (v0.2.1-alpha.1) to upstream HEAD `fcc0ad4621`, then 2026-11-11 (SYNC4) to `e8f7b93a34` (v0.2.2-rc.2). Root Go module does not import it (docs/addon references only); integration re-verification is tracked in TODO.md.
- Historical note: legacy submodules under `go/submodules/` and `apps/maestro` were decommissioned earlier (see git history); the three above are the only active submodules.
