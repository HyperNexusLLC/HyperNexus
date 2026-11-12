#!/usr/bin/env bash
# hn-pre-tool.sh — HyperNexus PreToolUse gate for Open Interpreter (fail-open allow-gate).
# By-convention twin of crush hn-pre-tool.sh. Open Interpreter runs no PreToolUse hooks,
# so this documents the gate policy and can be run manually. Exit 0 = allow
# (stdout parsed as JSON decision), exit 2 = deny (stderr = reason).
# Performs NO network I/O (hot path stays fast). Never reads credentials, never throws.
TOOL="${CRUSH_TOOL_NAME:-${TOOL_NAME:-}}"
INPUT="$(cat 2>/dev/null)"
case "$TOOL" in
  bash|run_shell_command|"")
    case "$INPUT" in
      *"rm -rf /"*|*"rm -rf ~"*|*"mkfs"*|*":(){:|:&};:"*)
        echo "blocked: destructive shell pattern denied by hypernexus-gate" >&2
        exit 2
        ;;
    esac
    ;;
esac
echo '{"decision":"allow"}'
exit 0
