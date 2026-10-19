# HyperNexus — Shared Extension Contract

`hypernexus.manifest.json` is the **single source of truth** for the HyperNexus
integration surface across coding harnesses. It is what lets **pi**, **MiMoCode**,
and future harnesses (and an **autonomous orchestrator**) share one discoverable
capability set instead of each drifting on its own.

## Why this exists

Several harnesses run side-by-side, each with its own extension/plugin built by a
different agent or session:

| Harness | Adapter | API |
|---|---|---|
| pi | `addons/pi/hypernexus.ts` | `@earendil-works/pi-coding-agent` (ExtensionAPI) |
| MiMoCode | `addons/mimo/plugin/hypernexus/index.js` | `@mimo-ai/plugin` (Plugin SDK) |
| *(next)* | `addons/<harness>/` | *that harness's plugin/extension API* |

Without a shared contract each adapter reimplements the kernel calls, response
normalization, and budgets — and they drift. The manifest declares the **what**
(capabilities + kernel bindings + budgets); each adapter supplies only the **how**
(the harness's registration primitive).

## The rules every adapter must honor

1. **Budgeted + never throws.** Every kernel call uses `AbortSignal.timeout(budgetMs)`
   and resolves to a fallback on failure. A hung kernel must never stall a turn.
2. **Hot-path = FTS only.** Turn-critical hooks (`before_agent_start`, `context`,
   `input`) call `/api/memory/fts-search` (~15ms) within `hotPathBudgetMs` (400ms).
   Never call `/api/memory/search` (vector+embed, ~800ms) on a hot path.
3. **Fire-and-forget side effects.** Audit logs and memory writes on per-event hooks
   are dispatched, not awaited, in the turn path.
4. **Normalize at the boundary.** The kernel returns `data[].record` (FTS) vs `data[]`
   (search) vs `{data}` (bridge). Hide these differences behind one helper so harness
   code reads a single shape.
5. **Kernel is the source of truth.** If an adapter is unavailable, call the kernel
   binding in the manifest directly.

## Adding a new harness

1. Copy the `_template` entry in `manifest.json` → `harnesses.<yourname>`.
2. Implement an adapter that binds each `capabilities[].id` to your harness's tool
   registration primitive. Use the `kernel` block for the call and the `contract`
   block for budgets/error handling.
3. Map the capability id → your tool name in `capabilities[].harness.<yourname>`.
4. Wire the `hooks` (at minimum: `context` fast-FTS injection + fire-and-forget
   suggestion feed) so behavior matches across harnesses.

The capability ids are stable — an orchestrator can call `memory_search` and let the
active harness resolve it to `hypernexus_memory_search`, or call the kernel URL directly.

## Autonomous orchestration

An autonomous agent reads `manifest.json`:

- **Discover** — enumerate `capabilities[]` (id, description, category).
- **Route** — pick a capability; call `kernel.method` + `kernel.path`, or the
  harness-native tool in `harness.<active>`.
- **Compose** — follow `orchestration.workflows` (MEM-FIRST, DISCOVER, HARVEST,
  HANDOFF, OPS) and the shared loop `RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY`.
- **Budget** — respect `budgetMs`; never exceed `hotPathBudgetMs` on turn paths.
- **Degrade** — on kernel failure, return a short note; never throw into the turn.

## Keeping adapters in sync

The manifest is generated/validated against the adapters' tool lists. When you add or
rename a tool in any adapter, update `capabilities[]` and the `harness{}` bindings so
the orchestrator sees the same surface everywhere.
