#!/bin/bash
systemctl stop hypernexus-kernel
sleep 2
rm -f /opt/tormentnexus/tormentnexus
cd /tmp
rm -f tormentnexus-linux-amd64
unzip -o tn-linux4.zip
cp tormentnexus-linux-amd64 /opt/tormentnexus/tormentnexus
chmod +x /opt/tormentnexus/tormentnexus
fuser -k 7778/tcp 2>/dev/null
sleep 1
systemctl reset-failed hypernexus-kernel 2>/dev/null
systemctl start hypernexus-kernel
sleep 4
echo "service: $(systemctl is-active hypernexus-kernel)"
echo "--- title test ---"
curl -s -X POST http://127.0.0.1:7778/api/memory/facts/add -H 'Content-Type: application/json' -d '{"title":"Title field now preserved","content":"Testing that title is stored in metadata.","tags":["test"],"namespace":"project"}'
echo ""
curl -s 'http://127.0.0.1:7778/api/memory/search?query=Title+field+now+preserved&limit=1'
echo ""
echo "--- disk ---"
df -h /
