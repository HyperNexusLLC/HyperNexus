#!/bin/sh
# hn-subagent-start: log subagent start in HyperNexus. Best effort.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"VS Code subagent started","content":"VS Code subagent started","tags":["system:hook","reason:vscode","hook:subagent-start"],"namespace":"project"}' >/dev/null 2>&1 || true
echo '{"continue": true}'
