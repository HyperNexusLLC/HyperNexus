# HyperNexus x Juggler GUI

Minimal HyperNexus integration for the Juggler web GUI harness (NEW files only; no existing files edited).

- Model: `meta/muse-spark-1.3-contributor`
- OpenAI-compatible base URL: `http://127.0.0.1:7778/v1` (served by the local HyperNexus kernel; see `connection.json`)
- Auth: live key-mint per run via `node addons/shared/bin/meta-muse-key.mjs` into `META_API_KEY` (pi owns refresh; stdout only, never stored)
- MCP: `mcp.json` launches the kernel over stdio (`hypernexus.exe mcp` with `HYPERNEXUS_URL` + `HYPERNEXUS_WORKSPACE_ROOT`)
- Tool policy: shell tools disabled in this GUI harness; use the HyperNexus parity tools exposed over MCP instead
- Kernel health: `GET http://127.0.0.1:7778/health` (do not restart, kill, or rebuild the kernel)
