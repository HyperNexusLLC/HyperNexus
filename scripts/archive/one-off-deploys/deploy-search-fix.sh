#!/bin/bash
systemctl stop hypernexus-kernel
sleep 2
rm -f /opt/tormentnexus/tormentnexus
cd /tmp
rm -f tormentnexus-linux-amd64
unzip -o tn-linux7.zip
cp tormentnexus-linux-amd64 /opt/tormentnexus/tormentnexus
chmod +x /opt/tormentnexus/tormentnexus
fuser -k 7778/tcp 2>/dev/null
sleep 1
systemctl reset-failed hypernexus-kernel 2>/dev/null
systemctl start hypernexus-kernel
sleep 4
echo "service: $(systemctl is-active hypernexus-kernel)"
echo ""
echo "=== search: memory ==="
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=memory&limit=5' | python3 -c '
import json,sys
d=json.load(sys.stdin)
tools=d.get("data",[])
print("results:",len(tools))
for t in tools[:5]:
    print(" ", t.get("name","?"), "| score:", t.get("score",0), "|", t.get("matchReason",""))
'
echo ""
echo "=== search: search ==="
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=search&limit=5' | python3 -c '
import json,sys
d=json.load(sys.stdin)
tools=d.get("data",[])
print("results:",len(tools))
for t in tools[:5]:
    print(" ", t.get("name","?"), "| score:", t.get("score",0), "|", t.get("matchReason",""))
'
echo ""
echo "=== search: file ==="
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=file&limit=5' | python3 -c '
import json,sys
d=json.load(sys.stdin)
tools=d.get("data",[])
print("results:",len(tools))
for t in tools[:5]:
    print(" ", t.get("name","?"), "| score:", t.get("score",0), "|", t.get("matchReason",""))
'
