#!/bin/sh
# UserPromptSubmit hook — capture prompt to HyperNexus for context.
STDIN=$(cat)
[ -z "$STDIN" ] && exit 0
SESSION_ID=$(printf '%s' "$STDIN" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -s -m 3 -X POST 'http://127.0.0.1:7778/api/memory/user-prompts/capture' \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"User prompt submitted in session $SESSION_ID\",\"tags\":[\"system:user-prompt\",\"reason:codex\"],\"category\":\"session\",\"timestamp\":\"$TS\"}" >/dev/null 2>&1 || true
echo '{"continue": true}'
exit 0
