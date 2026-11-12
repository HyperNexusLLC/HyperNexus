#!/bin/bash
systemctl stop hypernexus-kernel
sleep 2
rm -f /opt/tormentnexus/tormentnexus
cd /tmp
rm -f tormentnexus-linux-amd64
unzip -o tn-linux5.zip
cp tormentnexus-linux-amd64 /opt/tormentnexus/tormentnexus
chmod +x /opt/tormentnexus/tormentnexus
fuser -k 7778/tcp 2>/dev/null
sleep 1
systemctl reset-failed hypernexus-kernel 2>/dev/null
systemctl start hypernexus-kernel
sleep 4
echo "service: $(systemctl is-active hypernexus-kernel)"
echo "--- mcp tool search test ---"
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=memory+search&limit=5' | head -c 500
echo ""
echo "--- mcp status ---"
curl -s 'http://127.0.0.1:7778/api/mcp/status' | head -c 300
