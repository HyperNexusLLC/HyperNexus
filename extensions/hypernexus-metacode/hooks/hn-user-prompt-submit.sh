#!/bin/sh
# hn-user-prompt-submit: capture prompt context in HyperNexus. Best effort.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"Meta Code prompt submitted","content":"Meta Code prompt submitted","tags":["system:user-prompt","reason:meta-code"],"namespace":"project"}' >/dev/null 2>&1 || true
echo '{"continue": true}'
