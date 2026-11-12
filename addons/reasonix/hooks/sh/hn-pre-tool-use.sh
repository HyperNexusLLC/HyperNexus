#!/bin/sh
# hn-pre-tool-use: RBAC gate for destructive patterns. Exit 2 blocks (PreToolUse only).
# Reads one JSON line on stdin; tool args live at .toolArgs (bash tool: .toolArgs.command).
# Requires jq when present; without jq, passes (the sidecar still enforces RBAC).
if ! command -v jq >/dev/null 2>&1; then exit 0; fi
CMD=$(printf '%s' "$STDIN" | jq -r '.toolArgs.command // .toolArgs.path // .toolArgs.file_path // ""' 2>/dev/null)
case "$CMD" in
  *rm\ -rf*|*mkfs*|*DROP\ SCHEMA*|*shutdown*|*reboot*|*git\ push*--force*|*git\ reset\ --hard*)
    echo "HyperNexus RBAC: destructive pattern blocked: $CMD" >&2
    exit 2 ;;
esac
exit 0
