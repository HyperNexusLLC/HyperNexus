#!/bin/bash
# Generate API key and test it
API_KEY=$(openssl rand -hex 32)
echo "HYPERNEXUS_API_KEY=$API_KEY" >> /opt/tormentnexus/.env
echo "API Key: $API_KEY"
echo "=== Test write ==="
curl -s -X POST http://127.0.0.1:7778/api/config/upsert \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":"test"}'
echo
echo "=== Test read (no key needed) ==="
curl -s http://127.0.0.1:7778/health
