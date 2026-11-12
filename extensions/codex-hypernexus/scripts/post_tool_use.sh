#!/bin/sh
# PostToolUse hook — record tool result context to HyperNexus.
STDIN=$(cat)
[ -z "$STDIN" ] && exit 0
SESSION_ID=$(printf '%s' "$STDIN" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
TOOL_NAME=$(printf '%s' "$STDIN" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
[ -z "$TOOL_NAME" ] && TOOL_NAME=$(printf '%s' "$STDIN" | sed -n 's/.*"toolName"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
[ -z "$TOOL_NAME" ] && TOOL_NAME="unknown"
curl -s -m 3 -X POST 'http://127.0.0.1:7778/api/memory/observations/record' \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"Codex tool used: $TOOL_NAME\",\"toolName\":\"$TOOL_NAME\",\"type\":\"tool-use\",\"namespace\":\"project\"}" >/dev/null 2>&1 || true
echo '{"continue": true}'
exit 0
