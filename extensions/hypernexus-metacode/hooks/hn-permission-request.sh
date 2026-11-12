#!/bin/sh
# hn-permission-request: log permission prompt in HyperNexus. Never blocks.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"Meta Code permission request","content":"Meta Code permission request","tags":["system:hook","reason:meta-code","hook:permission-request"],"namespace":"project"}' >/dev/null 2>&1 || true
echo '{"continue": true}'
