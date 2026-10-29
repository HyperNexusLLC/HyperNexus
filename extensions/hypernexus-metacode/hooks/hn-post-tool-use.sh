#!/bin/sh
# hn-post-tool-use: record tool context in HyperNexus. Best effort, never blocks.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"Meta Code tool used","content":"Meta Code tool used","tags":["system:tool-use","reason:meta-code"],"namespace":"project"}' >/dev/null 2>&1 || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/observations/record \
  -H 'Content-Type: application/json' \
  -d '{"title":"Meta Code tool used","content":"Meta Code tool used","tags":["system:tool-use","reason:meta-code"]}' >/dev/null 2>&1 || true
echo '{"continue": true}'
