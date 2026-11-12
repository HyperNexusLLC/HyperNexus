#!/bin/sh
# PostCompact hook — note compaction result in L2 memory, always continue.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"content":"Codex post-compact noted","tags":["system:hook","reason:codex","hook:post-compact"]}' >/dev/null 2>&1 || true
echo '{"continue": true}'
