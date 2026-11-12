#!/usr/bin/env bash
# session-stop.sh — persist a turn summary to L2 (fire-and-forget).
set -euo pipefail
BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
( curl.exe -s -m 3 -X POST "$BASE/api/memory/facts/add" -H 'Content-Type: application/json' \
  -d '{"title":"droid-turn-summary","content":"Droid turn completed (auto-checkpoint).","tags":["session","droid"],"namespace":"project"}' >/dev/null 2>&1 || true ) &
exit 0
