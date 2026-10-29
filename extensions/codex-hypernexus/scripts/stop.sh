#!/bin/sh
# Stop hook — log session end to HyperNexus L2 memory.
STDIN=$(cat)
[ -z "$STDIN" ] && exit 0
SESSION_ID=$(printf '%s' "$STDIN" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -s -m 3 -X POST 'http://127.0.0.1:7778/api/memory/facts/add' \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"Session ended: $SESSION_ID\",\"tags\":[\"system:session_end\",\"reason:codex\"],\"category\":\"session\",\"timestamp\":\"$TS\"}" >/dev/null 2>&1 || true
echo '{"continue": true}'
exit 0
