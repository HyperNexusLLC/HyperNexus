#!/usr/bin/env bash
# prompt-submit.sh — fast FTS context injection + @memory:key expansion (hot path, never blocks).
set -euo pipefail
BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
input="$(cat)"
prompt="$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("prompt","")[:2000])' 2>/dev/null || echo "")"
[ -z "$prompt" ] && exit 0

# Extract @memory:key tokens
keys="$(printf '%s' "$prompt" | grep -o '@memory:[A-Za-z0-9_.-]*' | sed 's/@memory://' | head -5 || true)"
q="$(printf '%s' "$prompt" | tr '\n' ' ' | head -c 80 | sed 's/[^A-Za-z0-9 _-]/ /g')"

ctx=""
if [ -n "$keys" ]; then
  for k in $keys; do
    r="$(curl.exe -s -m 2 "$BASE/api/memory/fts-search?q=$(printf '%s' "$k" | head -c 40)&limit=2" 2>/dev/null | head -c 900 || true)"
    [ -n "$r" ] && ctx="${ctx}@memory:${k} => ${r}\n"
  done
else
  [ -n "$q" ] && ctx="$(curl.exe -s -m 2 "$BASE/api/memory/fts-search?q=$(printf '%s' "$q" | head -c 60)&limit=3" 2>/dev/null | head -c 1200 || true)"
fi
[ -z "$ctx" ] || [ "$ctx" = "null" ] && exit 0

esc="$(printf '%s' "$ctx" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '""')"
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"HyperNexus recall (fast FTS): %s"}}\n' "$esc"
exit 0
