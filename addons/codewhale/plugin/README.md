# hypernexus — Codewhale plugin bundle

HyperNexus AI control plane integration for Codewhale (Agent Plugins v1.0.0).

## Contents

- `plugin.json` — canonical manifest (Agent Plugins v1.0.0), `extensions["net.codewhale"]`
  declares `commands/` and `skills/`.
- `plugin.toml` — legacy manifest kept for the AGENTS.md-documented path
  `.codewhale/plugins/hypernexus/plugin.toml`. Keep in sync with `plugin.json`.
- `mcp.json` — the `hypernexus` stdio MCP server (`hypernexus.exe mcp`), 58 tools:
  L2 memory, L1 scratchpad, knowledge-graph extraction, MCP discovery + call routing,
  code search, kernel health/billing.
- `commands/` — 8 `/hn-*` commands: `hn-status`, `hn-store`, `hn-search`, `hn-tools`,
  `hn-session`, `hn-context`, `hn-summary`, `hn-purge`.
- `skills/` — `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` (exposed as
  `hypernexus:<skill-name>` when the bundle is enabled; the installer also mirrors them
  to `skills/` for direct discovery).

## Activation

1. Install (done by `node addons/codewhale/install.mjs`, project or `--global`).
2. `/plugin validate hypernexus` → `/plugin show hypernexus` — review without executing.
3. The person runs the exact `/plugin trust ...` confirmation, then
   `/plugin enable hypernexus`.
4. Restart the session (or `/reload`) so the MCP server connects and commands pin.

Every bundle starts untrusted and disabled — trust and enablement are always the
person's decision.

## Degradation

Everything the bundle touches is also reachable over plain HTTP on the kernel
(`http://127.0.0.1:7778`). The bundle is an accelerator, not a dependency.
