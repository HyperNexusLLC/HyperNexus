#!/usr/bin/env bash
# session-end.sh — write handoff artifact on session end (fire-and-forget).
set -euo pipefail
BASE="${HYPERNEXUS_URL:-http://127.0.0.1:7778}"
( curl.exe -s -m 3 -X POST "$BASE/api/agent-memory/handoff" -H 'Content-Type: application/json' \
  -d '{"summary":"Droid session ended (auto-handoff).","tags":["session","handoff","droid"]}' >/dev/null 2>&1 || true ) &
exit 0
