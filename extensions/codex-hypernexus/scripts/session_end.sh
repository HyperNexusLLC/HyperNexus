#!/bin/sh
# SessionEnd hook (main session only) — archive session to L2 memory.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"content":"Codex session ended","tags":["system:session","reason:codex","hook:session-end"]}' >/dev/null 2>&1 || true
echo '{"continue": true}'
