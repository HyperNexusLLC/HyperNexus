#!/bin/sh
# hn-post-tool-use: record tool context in HyperNexus. Best effort.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/tool-context \
  -H 'Content-Type: application/json' \
  -d '{"content":"Muse Code tool used"}' >/dev/null 2>&1 || true
echo '{"continue": true}'
