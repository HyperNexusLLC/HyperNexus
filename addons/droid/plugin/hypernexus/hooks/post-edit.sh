#!/usr/bin/env bash
# post-edit.sh — format changed file + record observation (fire-and-forget kernel write).
set -euo pipefail
BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
input="$(cat)"
file="$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); t=d.get("tool_input",{}); print(str(t.get("file_path",t.get("path","")))[:300]))' 2>/dev/null || echo "")"
( curl.exe -s -m 3 -X POST "$BASE/api/memory/observations/record" -H 'Content-Type: application/json' \
  -d "{\"type\":\"progress\",\"title\":\"droid-edit\",\"content\":\"file edited via droid\",\"filesModified\":[\"${file}\"],\"metadata\":{\"source\":\"droid-plugin\"}}" >/dev/null 2>&1 || true ) &
exit 0
