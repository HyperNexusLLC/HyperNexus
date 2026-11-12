#!/bin/sh
# hn-session-end: capture a session summary in HyperNexus. Best effort, never blocks.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/session-summaries/capture \
  -H 'Content-Type: application/json' \
  -d '{"summary":"Meta Code session ended"}' >/dev/null 2>&1 || true
echo '{"continue": true}'
