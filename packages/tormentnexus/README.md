# tormentnexus

TormentNexus pi extension — connect pi to the TormentNexus local AI control plane.

```
pi install npm:tormentnexus
```

## What It Gives You

### 9 Custom Tools

| Tool | What It Does |
|------|-------------|
| `tn_memory_store` | Save decisions, patterns, facts to L2 vault with tags, categories, and optional per-project `.memdb` |
| `tn_memory_search` | Find memories by keyword, tag filter, or category |
| `tn_memory_vector_search` | Semantic vector search across L2 |
| `tn_tool_search` | Find MCP tools across 20+ servers |
| `tn_session_search` | Browse imported sessions from Claude, Aider, etc. |
| `tn_skill_manage` | Access 5,776+ reusable skill modules |
| `tn_code_search` | Search code by AST structure, semantics, or file pattern |
| `tn_context_harvest` | Pull relevant L2 context for current task |
| `tn_scratchpad` | Read/write L1 session scratchpad |
| `tn_subagent` | Dispatch tasks to TN sub-agents via SupervisorManager (sync/async) |

### 6 Slash Commands

`/tn-store`, `/tn-search`, `/tn-status`, `/tn-plan`, `/tn-purge`, `/tn-summary`

### 3 Keyboard Shortcuts

`Ctrl+Shift+M` — memory search; `Ctrl+Shift+T` — tool search; `Ctrl+Shift+P` — status

### Automatic Features

- Session priming with L2 context injection; per-turn context harvesting
- Enterprise RBAC enforcement on dangerous tool calls
- Auto-logging of turns and model changes to L2
- Compaction enrichment with L2 memory
- Live stats widget (single line below editor, 60s refresh)
- Inter-extension event bus (`tn:*` events)
- Input transformation: `@memory:keyword` expands to L2 context inline

## Memory System

### Per-Project .memdb Files

When `tn_memory_store` is called with a `project` parameter, memories are tagged with `project:<name>` and the global index syncs them to a portable `.memdb` file in the project directory. These `.memdb` files are git-tracked and survive clones.

```
tn_memory_store(content="fix: build bug", project="tormentnexus", tags=["pattern:build"])
```

On server startup, all `.memdb` files in the workspace are discovered and imported into the global index. Hourly rescan picks up new projects from git pull/clone.

### Tiers

| Tier | Name | Storage | Retention |
|------|------|---------|-----------|
| L1 | Scratchpad | `memory.db` (core_memory_scratchpad) | Session-scoped |
| L2 | Vault | `memory.db` (l2_vault + FTS5) | While heat > 10 |
| L3 | Cold Archive | `l3_cold_archive.db` | Indefinite |
| L4 | Limbo | `memory.db` (l4_limbo) | 90 days |
| Project | .memdb | `project/.memdb` (git-tracked) | Indefinite |

## Configuration

- Config directory: `~/.tormentnexus` (auto-migrated from `~/.tormentnexus-go`)
- Override: `TORMENTNEXUS_CONFIG_DIR` env var
- Workspace root: auto-detected, override with `TORMENTNEXUS_WORKSPACE_ROOT`

## CodeWhale Integration

**codewhale** integration at `.codewhale/skills/tormentnexus/SKILL.md` (auto-installed when codewhale is detected).

## License MIT
