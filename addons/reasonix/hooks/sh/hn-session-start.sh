#!/bin/sh
# hn-session-start: log Reasonix session start to HyperNexus L2. Best effort, never blocks.
# Runs as a native Reasonix SessionStart hook (global settings.json). Reads one JSON line on stdin.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/add \
  -H 'Content-Type: application/json' \
  -d '{"content":"Reasonix session started","tags":["system:session","reason:reasonix"]}' >/dev/null 2>&1 || true
exit 0
