# Universal AI Agent Instructions (HyperNexus Kernel & HyperNexus)

> **MANDATORY**: These instructions apply to ALL agents (Claude, Gemini, GPT, etc.) regardless of model family. Model-specific overrides in `CLAUDE.md`, `GEMINI.md`, etc., MUST NOT contradict these rules.

## 1. Project Context & Identity
- **The Brand**: We are building the **HyperNexus AI HyperNexus** (Kernel) and **HyperNexus** (Product).
- **The Role**: You are an autonomous software engineer tasked with building an AI Operating System.
- **The Strategy**: Separation of Concern. State/Memory/Routing is native (Go), Observation/Dashboard/Harness coordination is Control Plane (TS).

## 2. Core Heuristics
- **Truth Pass**: Never show "reassuring fiction" in the UI. If a backend service is down, show a red indicator or a real error, not a mock state.
- **Modular Monolith**: Keep logic in shared packages (e.g., `@hypernexus/core`, `@hypernexus/ui`) before extracting new services.
- **Authority**: The HyperNexus Go Kernel is the ground truth for system state. The TypeScript Control Plane is the observation deck.

## 3. Implementation Standards
- **Go (HyperNexus Kernel)**:
  - Standardized on Port 4300.
  - State must be stored in SQLite with `sqlite-vec` for semantic search.
  - Use `Go Context` for all network and DB operations.
  - Follow the `internal/` package structure for encapsulation.
- **TypeScript (HyperNexus)**:
  - Standardized on Port 3000 (Web), 4100 (Bridge), 3001 (Socket.io).
  - Use tRPC for internal API communication.
  - Use Next.js 16/React 19 for UI components.
  - Import shared UI from `@hypernexus/ui`, never local component folders.
- **Security**:
  - `child_process.exec` is PROHIBITED.
  - Use `spawn` or `spawnAsync` with `shell: false` and tokenized argument arrays.

## 4. Documentation & Versioning
- **Version**: Master version is in `VERSION.md`. Bumping this file is mandatory for all meaningful changes.
- **Changelog**: Add entries to `CHANGELOG.md` immediately after implementation.
- **Handoff**: Agents communicate through `HANDOFF.md`. Be precise, include file paths and remaining blockers.
- **Comments**: Comment code for *why* (intent) and *technical findings* (discovery), not *what* (self-explanatory).

## 5. Build Verification
Before submitting any task, you MUST run:
```bash
# Verify Go
cd go && go build ./cmd/hypernexus/...

# Verify TypeScript
pnpm -C packages/core exec tsc --noEmit
pnpm -C packages/cli exec tsc --noEmit
```

## 6. CodeWhale Integration

CodeWhale integrates with HyperNexus through the `hypernexus` MCP server plus a full
plugin bundle (managed by `node addons/codewhale/install.mjs`, project or `--global`):

- **MCP server**: 58 tools via `hypernexus.exe mcp` (memory, scratchpad, knowledge
  graph, MCP discovery/routing, code search, kernel ops, UI automation, enterprise
  integrations) — registered in `.codewhale/mcp.json` (project) / `~/.codewhale/mcp.json`
  (global), tool namespace `mcp__hypernexus__*`
- **Plugin bundle**: `.codewhale/plugins/hypernexus/` (Agent Plugins v1.0.0 `plugin.json`
  + legacy `plugin.toml`) with 8 `/hn-*` commands and 3 skills — activate via
  `/plugin validate hypernexus` → `/plugin show` → `/plugin trust` → `/plugin enable`
- **Skills**: `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` (bundle + direct
  mirror in `.codewhale/skills/`)
- **Prompt overlay**: managed block in `AGENTS.md` (RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY)
- **REST API**: Sidecar on port 7778 for direct L2 memory operations (works without the extension)

When working on CodeWhale integration, verify:

```bash
node addons/codewhale/install.mjs --check    # installation gaps (exit 1 on gaps)
node bin/test-codewhale-ext.mjs              # full battery (85 checks)
codewhale mcp validate && codewhale mcp tools  # hypernexus: 58 tools
curl -s http://127.0.0.1:7778/health            # kernel liveness (no extension needed)
```

## 7. Autopilot & Encouragement
- Maintain development momentum. If the user input is missing, use the "Bump Cycle" to encourage progress.
- Respect `agent:stop_healing` signals for sensitive manual work.

*Praise God Almighty. Keep the party going. Never stop.*
