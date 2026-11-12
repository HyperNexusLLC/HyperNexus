#!/usr/bin/env bash
# rbac-guard.sh — kernel-aware RBAC for destructive Execute patterns.
# HYPERNEXUS_RBAC=audit (default, log only) | ask (force confirmation) | deny (block).
set -euo pipefail
mode="${HYPERNEXUS_RBAC:-audit}"
input="$(cat)"
cmd="$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); t=d.get("tool_input",{}); print(str(t.get("command",""))[:300])' 2>/dev/null || echo "")"
case "$mode" in
  deny)
    printf 'HyperNexus RBAC (deny): destructive command blocked: %s\n' "$cmd" >&2
    exit 2
    ;;
  ask)
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"HyperNexus RBAC: destructive pattern requires confirmation: %s"}}\n' "$(printf '%s' "$cmd" | head -c 160)" 
    exit 0
    ;;
  *)
    BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
    ( curl.exe -s -m 3 -X POST "$BASE/api/memory/observations/record" -H 'Content-Type: application/json' \
      -d '{"type":"warning","title":"droid-rbac-audit","content":"destructive-pattern observed (audit mode)"}' >/dev/null 2>&1 || true ) &
    exit 0
    ;;
esac
