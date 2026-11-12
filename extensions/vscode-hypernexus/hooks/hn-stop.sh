#!/bin/sh
# hn-stop: record turn end in HyperNexus. Best effort, never blocks.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"VS Code turn ended","content":"VS Code turn ended","tags":["system:stop","reason:vscode"],"namespace":"project"}' >/dev/null 2>&1 || true
echo '{"continue": true}'
