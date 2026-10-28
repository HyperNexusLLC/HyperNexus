#!/usr/bin/env bash
# hn-rbac.sh — HyperNexus RBAC guard for Crush (deny-list for destructive patterns).
# POSIX twin of hn-rbac.cmd: exit 2 blocks (stderr = reason), exit 0 allows.
# Runs inside the gate chain; never reads credentials, never throws.
# Input contract (per Crush hooks spec): tool name arrives in $CRUSH_TOOL_NAME,
# full JSON envelope on stdin. The shell command (if any) is extracted from
# stdin via CRUSH_TOOL_INPUT_COMMAND when present, else parsed from the JSON.
TOOL="${CRUSH_TOOL_NAME:-}"
RAW="$(cat 2>/dev/null)"
CMD_TEXT="${CRUSH_TOOL_INPUT_COMMAND:-}"
if [ -z "$CMD_TEXT" ]; then
  # Extract .tool_input.command from the JSON envelope without jq (portable sed).
  CMD_TEXT="$(printf '%s' "$RAW" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
fi
case "$TOOL" in
  bash|run_shell_command)
    if printf '%s' "$CMD_TEXT" | grep -qE 'rm[[:space:]]+-(rf|fr)[[:space:]]+/[[:space:]]*$|rm[[:space:]]+-(rf|fr)[[:space:]]+~|mkfs|:\(\)\{ *:\|:& *\};|format[[:space:]]+[A-Za-z]:|del[[:space:]]+/'; then
      echo "blocked by hypernexus-rbac: destructive shell pattern denied" >&2
      exit 2
    fi
    ;;
esac
echo '{"decision":"allow"}'
exit 0
