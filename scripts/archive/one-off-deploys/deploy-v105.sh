#!/bin/bash
set -e
echo "=== Deploy v1.0.5 ==="
systemctl stop hypernexus-kernel 2>/dev/null || true
sleep 2
rm -f /opt/tormentnexus/tormentnexus
cd /tmp
unzip -o tn-v105.zip
cp tormentnexus-linux-amd64 /opt/tormentnexus/tormentnexus
chmod +x /opt/tormentnexus/tormentnexus
fuser -k 7778/tcp 2>/dev/null || true
sleep 1
systemctl reset-failed hypernexus-kernel 2>/dev/null || true
systemctl start hypernexus-kernel
sleep 5
echo "=== Health ==="
curl -s http://127.0.0.1:7778/health
echo ""
echo "=== searchTools ==="
curl -s "http://127.0.0.1:7778/api/mcp/tools/search?query=memory&limit=3"
echo ""
echo "=== Done ==="
