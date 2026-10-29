#!/bin/sh
# hn-pre-compact: checkpoint context before compaction. Best effort.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"Meta Code pre-compact checkpoint","content":"Meta Code pre-compact checkpoint","tags":["system:hook","reason:meta-code","hook:pre-compact"],"namespace":"project"}' >/dev/null 2>&1 || true
echo '{"continue": true}'
