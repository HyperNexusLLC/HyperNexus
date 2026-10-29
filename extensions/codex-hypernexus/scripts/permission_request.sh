#!/bin/sh
# PermissionRequest hook — pass-through (never block). Logs the request.
read -r STDIN || true
curl -s -m 3 -X POST http://127.0.0.1:7778/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"content":"Codex permission request seen","tags":["system:hook","reason:codex","hook:permission-request"]}' >/dev/null 2>&1 || true
echo '{"continue": true}'
