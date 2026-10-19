# HANDOFF — T11 pi Extension Perf + Multi-Harness Contract

## Status: COMPLETE (2026-10-19)

Branch: feat/mimo-plugin-max-surface @ d9b3f9329 (pushed github)

## What was done
- **Fixed pi extension hot-path perf** (the "pi is slow" complaint): `before_agent_start`,
  `context`, and `input` hooks were calling `/api/memory/search` (~800ms vector+embed)
  under a 400ms budget → always timed out → **context injection silently injected nothing**.
  New `tnFastSearch()` uses `/api/memory/fts-search` (~15ms). Now context injection works
  AND is fast.
- **Non-blocking tool-suggestion feed**: context hook fire-and-forget POSTs to
  `/api/mcp/tool-suggestions` (PreemptiveAdvertiser). Never awaited.
- **New tool `hypernexus_suggest_tools`** (pi now has 11 tools): surfaces the monitor's
  proactive tool recommendations on demand.
- **Multi-harness + autonomous orchestration layer**: `addons/shared/hypernexus.manifest.json`
  (harness-agnostic capability manifest — uniform kernel bindings, budgets, never-throw
  contract, harness adapters pi/mimo/_template, orchestration workflows + autonomous
  dispatch hints) + `addons/shared/README.md` (contract rules for binding new harnesses).

## Key facts
- pi extension: `addons/pi/hypernexus.ts` (active copy `~/.pi/agent/extensions/hypernexus.ts`,
  kept IDENTICAL). 11 tools + 6 commands + 3 shortcuts + ~17 hooks.
- MCP in pi: `~/.pi/agent/mcp.json` already `exposure: direct` + hides
  `simulate_input`/`download_llamafile`. Verified valid + MCP stdio serves 58 tools.
- Hot-path budget 400ms (FTS), default 2500ms, fire-and-forget for side effects.
- Semantic memory embeddings: bundled all-MiniLM-L6-v2 (384-dim, local, no Ollama).

## Next steps for other sessions / harnesses
- Port the same FTS hot-path + suggestion-feed pattern to MiMoCode plugin for parity
  (mimo currently uses full search in some hooks — check `addons/mimo/plugin/`).
- Add a `_template` harness adapter (e.g. Cursor / Claude Code) binding capabilities via
  `addons/shared/hypernexus.manifest.json`.
- Wire an autonomous orchestrator that reads the manifest to dispatch across harnesses.
- Verify T10's TUI real interactive session test + Codemode Pi E2E (from prior handoff).

---

# HANDOFF — T10 MiMoCode Plugin SDK Surface Maximization

## Status: COMPLETE (2026-10-19)

Branch: feat/mimo-plugin-max-surface @ 5cea5332b (pushed github+gitlab, NOT merged per G0-G4)

## What was done
- Wired experimental.chat.messages.transform as safe observer (no mutation, feeds tool-suggestion monitor)
- TUI deep-wiring: keybind.create, kv persistence, route.register, event.subscribe, meta param
- TuiCommand keybind/suggested fields on hn-status
- Added 4 high-value kernel tools (13 total): memory_stats, memory_handoff, skills_search, system_overview
- Updated test assertions for 26-hook + 13-tool surface
- Final: 48/51 ext suite (3 kernel 503s) + 16/16 TUI suite

## SDK surface coverage
- 26/26 Hooks keys (23 fn + tool + auth + provider + config)
- 13 typed tools with Zod schemas
- Workspace adaptor registered
- TUI: keybind/kv/route/event/meta

## Remaining (non-plugin surfaces)
- Capability API (/v1 + mimo llm-server) — runtime feature
- model_groups, dynamic workflows, permission config rules — MiMoCode config
- ToolContext.ask() — Effect-based, low ROI for HTTP-only tools

## Next steps for other sessions
- TUI real interactive session test (mock is 16/16)
- Codemode Pi E2E (b8d2b3c3a)
- Cleanup: :7790 verification kernel (DONE)
