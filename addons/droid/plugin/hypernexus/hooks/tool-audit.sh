#!/usr/bin/env bash
# tool-audit.sh — fire-and-forget HyperNexus audit log for MCP/harness tool calls.
set -euo pipefail
BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
input="$(cat)"
tool="$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_name","?")[:64])' 2>/dev/null || echo ?)"
detail="$(printf '%s' "$input" | head -c 500 | tr '\n' ' ')"
( curl.exe -s -m 3 -X POST "$BASE/api/memory/observations/record" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"tool-call\",\"title\":\"droid-tool:${tool}\",\"content\":\"${tool} via droid\",\"metadata\":{\"source\":\"droid-plugin\",\"tool\":\"${tool}\"}}" >/dev/null 2>&1 || true ) &
exit 0
