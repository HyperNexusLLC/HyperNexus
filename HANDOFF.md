# HANDOFF.md — Session Handoff

## Session Date: 2026-09-30

## Summary

HyperNexus memory stack hardened end-to-end: L2 export/import, GraphRAG extraction + visualization, MCP tool schemas, Ollama fallbacks, dashboard auth, deploy/backup automation. Work pushed to `clean-main` as `c6bfaae` → `a897b44` → `bd065da` → `60ba63f` (+ this commit).

## Completed

### Memory & Graph
- `/api/memory/l2/export` + `import` with error reporting; round-trip stable (27→27)
- `memory_extract_relations` + `memory_extract_relations_batch` (pattern + Ollama JSON triples)
- `/api/memory/graph` with entity slug labels (`ent-ollama`) and memory previews
- `/api/memory/graph/cleanup` drops opaque hashed `ent-xxxxxxxx` nodes
- Conflict detector: Jaccard ≥0.9 / polarity flips / conflicting numbers only; upsert does not cascade-supersede
- Relation-aware `SemanticSearch` boosts `l2_relations` neighbors
- `search` returns `sources: [upstream|local-json|vectorstore]`
- Dual-write `AddRelation` → `l2_relations` + `memory_relations`
- FTS5 external-content delete triggers fixed; legacy table dropped on open

### MCP / Tools
- `tools.NativeToolMeta` — full `inputSchema` for 34 native tools (replaces incomplete switch)
- `memory_extract_relations(_batch)` registered in kernel registry
- `/api/agent/tool` accepts `name|toolName` + `arguments|args`
- mcp.jsonc: 0 missing binaries (uvx/npx fallbacks); serena `--from` args split

### Ops
- Dashboard `HYPERNEXUS_DASHBOARD_TOKEN` (login form + write-API guard)
- `scripts/backup-l2.sh` cron `17 3 * * *` on Hetzner (keep 14)
- `.github/workflows/deploy-hetzner.yml` (needs `HETZNER_SSH_KEY` secret)
- `scripts/test-l2-roundtrip.ps1` + `scripts/hetzner-setup.sh`
- Nginx `/kernel-dashboard` → `:7778/dashboard`

## Hetzner state

- Kernel `/opt/tormentnexus/tormentnexus` (Linux amd64), systemd `hypernexus-kernel` port 7778
- Ollama systemd enabled, `nomic-embed-text`
- Dashboard token file: `/root/.hn-dashboard-token`
- L2 backups: `/opt/tormentnexus/backups/l2`
- Graph ~36 nodes / 103+ edges; 25 long_term memories after supersede fix

## Next agent must

1. **GitHub secrets** (user to run `gh auth login` first, or paste in UI):
   - `HETZNER_SSH_KEY` = `~/.ssh/id_ed25519` private key
   - `HETZNER_KNOWN_HOSTS` = `5.161.250.43 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMyQFzZa+hPrs8qZ4hQLogP5UnC8M5dj5M4VZSN5DcZl`
2. Verify `ci.yml` green on GitHub Actions after push
3. Re-embed / re-extract after any VectorStore schema change
4. Build Linux with `GOOS=linux GOARCH=amd64 CGO_ENABLED=0` — never ship Windows `.exe` to Hetzner

## Branch / remotes

- Branch: `clean-main` (not `main`)
- Remotes: `github`, `gitlab` (no `origin`)
- Push both: `git push github clean-main; git push gitlab clean-main`

## Useful scripts (repo)

- `scripts/backup-l2.sh` — Hetzner L2/agent-memory backup
- `scripts/test-l2-roundtrip.ps1` — export/import verification
- `scripts/hetzner-setup.sh` — deploy + token + cron one-shot
