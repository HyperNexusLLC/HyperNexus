# Global Submodule & Reference Mapping

Regenerated 2026-11-12 (v1.0.46 repo-sync, Session SYNC5). Source of truth: `.gitmodules` + `git -C <submodule> rev-parse HEAD` across all 3 submodules (`git fetch --all --tags` clean, 0 nested `.gitmodules`, 0 submodule feature branches). `vendor/deepseek-harness` local `master` branch ref fast-forwarded to `origin/master` (`e8f7b93a34`, dsh v0.2.2-rc.2); `vendor/grok-build` (`2bdd1d6a`) and `lumbros.me` (`16261e0`) verified at exact upstream `main` tips. Untracked HyperNexus overlays inside `vendor/deepseek-harness` (`README-HYPERNEXUS.md`, `hypernexus.cordis.yml`) and `vendor/grok-build` (`.grok/`, `hypernexus-mcp.toml`) retained as-is.

As of `v1.0.0-alpha.254` (2026-11-12 sync), the repository carries 3 active git submodules inherited from upstream `origin/main`. Update with `git submodule update --init --recursive` (add `--remote` to track branch tips).

| Path | Remote URL | Pinned commit | Notes |
|---|---|---|---|
| `vendor/deepseek-harness` | https://github.com/deepseek-ai/deepseek-harness.git | `e8f7b93a344964de3dca1ace9e72b6e4d6de87cb` | dsh-v0.2.2-rc.2 (upstream master) |
| `vendor/grok-build` | https://github.com/xai-org/grok-build.git | `2bdd1d6a6369de0e8c68132ea4539e9abd9e14a8` | main |
| `lumbros.me` | https://github.com/candlestixxx/lumbros.me | `16261e00c12afe745a2d3e58168c12f27b80e1f8` | main |

Notes:
- No nested submodules (none of the three has its own `.gitmodules`).
- `vendor/` is listed in `.gitignore` for stray files; the submodule gitlinks above are tracked normally.
- deepseek-harness was bumped 2026-11-05 from `5badb1500` (v0.2.1-alpha.1) to upstream HEAD `fcc0ad4621`, then 2026-11-11 (SYNC4) to `e8f7b93a34` (v0.2.2-rc.2). Root Go module does not import it (docs/addon references only); integration re-verification is tracked in TODO.md.
- Historical note: legacy submodules under `go/submodules/` and `apps/maestro` were decommissioned earlier (see git history); the three above are the only active submodules.

| `lumbros.me` | https://github.com/candlestixxx/lumbros.me | `16261e00c12afe745a2d3e58168c12f27b80e1f8` | Site content |
| `vendor/deepseek-harness` | https://github.com/deepseek-ai/deepseek-harness.git | `e8f7b93a344964de3dca1ace9e72b6e4d6de87cb` | Updated to tracking tip during alpha.254 sync |
| `vendor/grok-build` | https://github.com/xai-org/grok-build.git | `2bdd1d6a6369de0e8c68132ea4539e9abd9e14a8` | Vendor reference |

Legacy submodules decommissioned at `v1.0.0-alpha.231` (including `apps/maestro` and all checkouts under `go/submodules/`) remain removed.

The repository has transitioned to a unified monorepo topology:
* **Go Sidecar Kernel**: Main orchestration plane managed under `go/`.
* **Client Applications**: Shared under `apps/` and packages managed in `packages/` via pnpm workspaces.
* **Archived Reference Material**: Legacy crawler scripts and databases have been safely archived under `/archive/` (which is untracked via `.gitignore`).

