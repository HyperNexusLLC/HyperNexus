---
name: hypernexus
description: HyperNexus persistent memory and model wiring for harness2.
---

# HyperNexus for harness2

Connect harness2 (google-research) runs to HyperNexus for persistent
memory and Meta model wiring.

## Wiring

harness2 is env-only: it has no MCP/skill/command/hook runtime, so the
integration is model env plus the kernel HTTP API. The installer sets the
solver/improver/codex/judge model env (persistent) and mints the judge key
live into the process env (never stored):

```bash
node addons/harness2/install.mjs
node addons/harness2/install.mjs --check
```

- Models: `meta/muse-spark-1.3-contributor` via `HARNESS2_SOLVER_MODEL`,
  `HARNESS2_IMPROVER_MODEL`, `HARNESS2_CODEX_MODEL`, `HARNESS2_JUDGE_MODEL`.
- Judge endpoint: kernel proxy `HARNESS2_JUDGE_BASE_URL=http://127.0.0.1:7778/v1`
  with `HARNESS2_JUDGE_API_KEY` minted live from pi OAuth
  (`node addons/harness2/bin/meta-muse-key.mjs --check`; pi owns refresh).
- `addons/harness2/mcp.json` is the portable stdio MCP sample for bridges
  that can host one; harness2 itself consumes the kernel over HTTP.

(Kernel is on `http://127.0.0.1:7778`.)

## Available Tools (via kernel HTTP)

- `GET /api/memory/search?q=` - Search memories
- `POST /api/memory/add` - Save a memory
- `GET /health` - Kernel liveness + version

## Usage

1. Install (see above; needs `~/workspace/harness2` + `harness2-setup jb`),
   then mint the union key into the shell:

   ```powershell
   $env:META_API_KEY = "$(node addons/harness2/bin/meta-muse-key.mjs)"
   ```

2. Run harness2; judge calls route through the kernel proxy above.

## Verify Connection

```bash
node addons/harness2/install.mjs --check
node addons/harness2/bin/meta-muse-key.mjs --check
```
