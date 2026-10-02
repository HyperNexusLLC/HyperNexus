#!/bin/bash
systemctl stop hypernexus-kernel
sleep 2
rm -f /opt/tormentnexus/tormentnexus
cd /tmp
rm -f tormentnexus-linux-amd64
unzip -o tn-linux6.zip
cp tormentnexus-linux-amd64 /opt/tormentnexus/tormentnexus
chmod +x /opt/tormentnexus/tormentnexus
fuser -k 7778/tcp 2>/dev/null
sleep 1
systemctl reset-failed hypernexus-kernel 2>/dev/null
systemctl start hypernexus-kernel
sleep 4
echo "service: $(systemctl is-active hypernexus-kernel)"
echo "--- search: memory ---"
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=memory&limit=5' | head -c 600
echo ""
echo "--- search: code execution ---"
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=execute+code&limit=5' | head -c 600
echo ""
echo "--- search: save fact ---"
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=save+fact&limit=5' | head -c 600
