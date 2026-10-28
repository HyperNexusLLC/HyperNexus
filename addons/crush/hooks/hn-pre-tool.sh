#!/usr/bin/env bash
# hn-pre-tool.sh — HyperNexus PreToolUse gate for Crush (fail-open allow-gate).
# =============================================================================
# Crush runs PreToolUse hooks before each tool call: JSON on stdin, metadata in
# CRUSH_TOOL_NAME / CRUSH_TOOL_INPUT_* env vars. Exit 0 = allow (stdout parsed as
# JSON decision), exit 2 = deny (stderr = reason), anything else = non-blocking.
# This gate allows everything and performs NO network I/O (hot path stays fast).
# Policy hook-point: add targeted exit-2 denials below for destructive patterns.
# Never reads credentials, never throws.
TOOL="${CRUSH_TOOL_NAME:-}"
INPUT="$(cat 2>/dev/null)"
case "$TOOL" in
  bash|run_shell_command)
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
