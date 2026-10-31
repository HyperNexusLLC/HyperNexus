#!/bin/sh
# hn-post-compact: note compaction in HyperNexus. Best effort.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"Muse Code post-compact noted","content":"Muse Code post-compact noted","tags":["system:hook","reason:muse-code","hook:post-compact"],"namespace":"project"}' >/dev/null 2>&1 || true
echo '{"continue": true}'
