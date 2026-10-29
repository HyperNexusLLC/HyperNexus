# hax × HyperNexus

Native hax integration for the HyperNexus control plane. hax is a minimalist
C binary with **no MCP / extension / plugin / hook runtime** (deliberate —
see hax `docs/philosophy.md`), so this adapter binds to the four substrates
hax *does* support:

| hax substrate | This adapter |
|---|---|
| Custom providers (`providers.<id>`) | `meta` provider: `openai-responses` → `https://api.meta.ai/v1`, key live-read from pi OAuth auth.json via `HAX_META_API_KEY` |
| Presets (incl. subagent roles) | `meta` (daily driver) + `hn-worker` (HyperNexus worker role) |
| Skills (`~/.config/hax/skills/`) | `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` (mirrored in `skills/`) |
| AGENTS.md hierarchy | Managed `hypernexus` overlay block in repo `AGENTS.md` (+ optional global) |
| Unix composition (`hax -p`, `@file`) | `hn.mjs` CLI driver (all 31 manifest capabilities) + 11 `@`-mentionable `commands/hn-*.md` + `scripts/` turn scripts |

## Setup

```sh
node addons/hax/install.mjs              # provider + presets + skills + AGENTS overlay
eval "$(sh addons/hax/scripts/meta-env.sh)"  # live Meta OAuth key from pi auth.json
hax --preset meta                        # Meta Muse Spark 1.3 Contributor
```

`install.mjs --check` verifies; `--uninstall` removes; `--global` also writes
the global `~/.config/hax/AGENTS.md` overlay. The OAuth key is **never** written
to `config.json` — it is read live per shell (24h mint lifetime; re-source after
`pi` re-login).

## Discipline loop

**RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY** via `hn.mjs`:

```sh
node addons/hax/hn.mjs fts "<keywords>" 5      # hot-path recall (~15ms)
node addons/hax/hn.mjs harvest "<task>" 8      # L2 context + tool suggestions
node addons/hax/hn.mjs tools "<need>"          # semantic tool discovery
node addons/hax/hn.mjs call <tool> '<args>'    # universal dispatcher
node addons/hax/hn.mjs store "<t>" "<c>" "tags" # persist (facts/add write path)
node addons/hax/hn.mjs status                 # verify kernel liveness
```

Turn-equivalent scripts: `scripts/hn-prime.sh` (session start),
`scripts/hn-turn.sh pre|post|compact` (context / turn-end / compact hooks,
run outside-process around `hax -p`).

## Tests

```sh
HAX_META_API_KEY=... node bin/test-hax-ext.mjs   # 70 checks, all green
```

Covers provider wiring, presets, installer idempotence, skill bytes,
overlay, all 33 driver verbs incl. store→search→update→delete round-trip,
turn scripts, 5 live hax runs, doc accuracy, and kernel-down degradation.

## Saturated-host notes (loadavg 80+)

- `hn.mjs` retries transport timeouts once with backoff (`HN_RETRIES`, default 1);
  HTTP error statuses are never retried. Budgets widen via `HN_FAST_MS` /
  `HN_TIMEOUT_MS` (battery: 30s/120s/2 retries, 180s exec caps).
- Slow-but-correct endpoints observed at loadavg 120–175: `mcp-status` (~44s),
  `overview`, `code`, `graph-search`, turn scripts — all pass with patient budgets.
- `billing` can exceed even 280s when SQLite is contended (five serialized
  5s-busy-timeout opens inside the handler): it answers at normal load (battery
  H6 green at 70/70 baseline) but is the first to time out on a wedged box.
  Treat a billing timeout as load signal, not integration failure.
