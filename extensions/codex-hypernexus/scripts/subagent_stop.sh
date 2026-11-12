#!/bin/sh
# SubagentStop hook — log subagent finish, always continue.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"content":"Codex subagent finished","tags":["system:hook","reason:codex","hook:subagent-stop"]}' >/dev/null 2>&1 || true
echo '{"continue": true}'
