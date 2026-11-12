# Global Submodule & Reference Mapping

As of `v1.0.0-alpha.254` (2026-11-12 sync), the repository carries 3 active git submodules inherited from upstream `origin/main`. Update with `git submodule update --init --recursive` (add `--remote` to track branch tips).

| Path | Remote URL | Pinned commit | Notes |
|---|---|---|---|
| `lumbros.me` | https://github.com/candlestixxx/lumbros.me | `16261e00c12afe745a2d3e58168c12f27b80e1f8` | Site content |
| `vendor/deepseek-harness` | https://github.com/deepseek-ai/deepseek-harness.git | `e8f7b93a344964de3dca1ace9e72b6e4d6de87cb` | Updated to tracking tip during alpha.254 sync |
| `vendor/grok-build` | https://github.com/xai-org/grok-build.git | `2bdd1d6a6369de0e8c68132ea4539e9abd9e14a8` | Vendor reference |

Legacy submodules decommissioned at `v1.0.0-alpha.231` (including `apps/maestro` and all checkouts under `go/submodules/`) remain removed.

The repository has transitioned to a unified monorepo topology:
* **Go Sidecar Kernel**: Main orchestration plane managed under `go/`.
* **Client Applications**: Shared under `apps/` and packages managed in `packages/` via pnpm workspaces.
* **Archived Reference Material**: Legacy crawler scripts and databases have been safely archived under `/archive/` (which is untracked via `.gitignore`).

