#!/bin/sh
# hn-post-tool-use: record tool context in HyperNexus. Best effort, never blocks.
# Runs as a native Reasonix PostToolUse hook. Reads one JSON line on stdin.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/tool-context \
  -H 'Content-Type: application/json' \
  -d '{"content":"Reasonix tool used"}' >/dev/null 2>&1 || true
exit 0
