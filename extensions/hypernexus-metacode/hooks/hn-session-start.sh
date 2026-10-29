#!/bin/sh
# hn-session-start: log Meta Code session start to HyperNexus L2 memory. Best effort.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"Meta Code session started","content":"Meta Code session started","tags":["system:session","reason:meta-code"]}' >/dev/null 2>&1 || true
echo '{"continue": true}'
