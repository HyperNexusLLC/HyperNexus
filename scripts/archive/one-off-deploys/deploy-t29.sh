#!/bin/bash
set -e
echo "=== Deploy T29 MCP Catalog Indexing ==="
echo "Stopping kernel..."
systemctl stop hypernexus-kernel 2>/dev/null || true
sleep 2

echo "Removing old binary..."
rm -f /opt/tormentnexus/tormentnexus

echo "Unpacking new binary..."
cd /tmp
unzip -o tn-linux8.zip
cp tormentnexus-linux-amd64 /opt/tormentnexus/tormentnexus
chmod +x /opt/tormentnexus/tormentnexus

echo "Killing orphan processes on 7778..."
fuser -k 7778/tcp 2>/dev/null || true
sleep 1

echo "Starting kernel..."
systemctl reset-failed hypernexus-kernel 2>/dev/null || true
systemctl start hypernexus-kernel
sleep 5

echo "=== Health check ==="
curl -s http://127.0.0.1:7778/health || echo "HEALTH FAILED"

echo ""
echo "=== mcp.searchTools test (query=memory) ==="
curl -s "http://127.0.0.1:7778/api/mcp/tools/search?query=memory&limit=5" | head -c 2000

echo ""
echo "=== mcp.searchTools test (query=bash) ==="
curl -s "http://127.0.0.1:7778/api/mcp/tools/search?query=bash&limit=5" | head -c 2000

echo ""
echo "=== Done ==="
