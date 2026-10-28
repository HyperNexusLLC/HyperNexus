#!/usr/bin/env bash
# subagent-stop.sh — persist subagent outcome to L2 (fire-and-forget).
set -euo pipefail
BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
input="$(cat)"
result="$(printf '%s' "$input" | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("task_result",""))[:500]))' 2>/dev/null || echo "")"
[ -z "$result" ] && exit 0
( curl.exe -s -m 3 -X POST "$BASE/api/memory/facts/add" -H 'Content-Type: application/json' \
  -d "{\"title\":\"droid-subagent-result\",\"content\":$(printf '%s' "$result" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),\"tags\":[\"subagent\",\"droid\"],\"namespace\":\"project\"}" >/dev/null 2>&1 || true ) &
exit 0
