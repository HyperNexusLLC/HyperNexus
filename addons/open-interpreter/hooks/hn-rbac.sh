#!/usr/bin/env bash
# hn-rbac.sh — HyperNexus RBAC guard for Open Interpreter (deny-list for destructive patterns).
# By-convention twin of crush hn-rbac.sh: Open Interpreter has no PreToolUse hook API,
# so run this manually before destructive shell work, or follow it as policy.
# Exit 2 blocks (stderr = reason), exit 0 allows. Never reads credentials, never throws.
TOOL="${CRUSH_TOOL_NAME:-${TOOL_NAME:-}}"
RAW="$(cat 2>/dev/null)"
CMD_TEXT="${CRUSH_TOOL_INPUT_COMMAND:-${TOOL_INPUT_COMMAND:-}}"
if [ -z "$CMD_TEXT" ]; then
  CMD_TEXT="$(printf '%s' "$RAW" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
fi
case "$TOOL" in
  bash|run_shell_command|"")
    # Check CMD_TEXT and RAW as separate lines so the $ anchor matches
    # (crush twin greps CMD_TEXT only; concatenation would break the $ anchor).
    if printf '%s\n%s' "$CMD_TEXT" "$RAW" | grep -qE 'rm[[:space:]]+-(rf|fr)[[:space:]]+/[[:space:]]*$|rm[[:space:]]+-(rf|fr)[[:space:]]+~|mkfs|:\(\)\{ *:\|:& *\};|format[[:space:]]+[A-Za-z]:|del[[:space:]]+/'; then
      echo "blocked by hypernexus-rbac: destructive shell pattern denied" >&2
      exit 2
    fi
    ;;
esac
echo '{"decision":"allow"}'
exit 0
