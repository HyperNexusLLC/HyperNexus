#!/bin/sh
# hn-pre-tool-use: recall HyperNexus memory context before a tool runs. Best effort, never blocks.
read -r STDIN || true
curl -s -m 3 "http://127.0.0.1:7778/api/memory/session-bootstrap" >/dev/null 2>&1 || true
echo '{"continue": true}'
