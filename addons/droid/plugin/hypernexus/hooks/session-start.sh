#!/usr/bin/env bash
# session-start.sh — HyperNexus session bootstrap (never blocks startup).
# Input: hook JSON on stdin. Output: additionalContext JSON for SessionStart.
set -euo pipefail
BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
input="$(cat)"
cwd="$(printf '%s' "$input" | head -c 4000)"

fetch_fast() { curl.exe -s -m 3 "$1" 2>/dev/null || true; }

health="$(fetch_fast "$BASE/health")"
status_line="HyperNexus kernel: unreachable (offline - local tools only)"
if printf '%s' "$health" | grep -q 'version'; then
  ver="$(printf '%s' "$health" | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -c 32)"
  status_line="HyperNexus kernel: ONLINE ${ver:+($ver)} - L1/L2/L3 memory, MCP tools, knowledge graph available."
fi

goal="$(fetch_fast "$BASE/api/memory/session-bootstrap?cwd=$(printf '%s' "$cwd" | head -c 120)")"
goal_line=""
if [ -n "$goal" ] && [ "$goal" != "null" ]; then
  goal_line="$(printf '%s' "$goal" | head -c 600)"
fi

ctx="$(printf '## HyperNexus session\n%s\nDiscipline: RECALL (search_memory/context_harvest) before multi-step work; PERSIST non-obvious outcomes with add_memory; DISCOVER via mcp_list_tools/mcp_call_tool on capability gaps; VERIFY via system_status around production changes. Hot-path hook budget 400ms - FTS only; full vector search is for explicit tools.\n%s' "$status_line" "${goal_line:+Active goal/handoff: $goal_line}")"

# Escape for JSON
esc="$(printf '%s' "$ctx" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '"%s"' "$ctx")"
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}\n' "$esc"
exit 0
