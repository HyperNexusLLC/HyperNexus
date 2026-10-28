#!/usr/bin/env bash
# pre-compact.sh — enrich compaction with related L2 context (bounded, never blocks).
set -euo pipefail
BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
input="$(cat)"
hint="$(printf '%s' "$input" | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("custom_instructions",""))[:200])' 2>/dev/null || echo "")"
[ -z "$hint" ] && hint="recent hypernexus droid session"
ctx="$(curl.exe -s -m 3 "$BASE/api/memory/fts-search?q=$(printf '%s' "$hint" | head -c 60)&limit=3" 2>/dev/null | head -c 1000 || true)"
[ -z "$ctx" ] || [ "$ctx" = "null" ] && exit 0
esc="$(printf '%s' "$ctx" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '""')"
printf '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":"HyperNexus compaction context: %s"}}\n' "$esc"
exit 0
