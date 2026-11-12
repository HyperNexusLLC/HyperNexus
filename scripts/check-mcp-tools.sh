#!/bin/bash
echo "=== listTools ==="
curl -s 'http://127.0.0.1:7778/api/mcp/tools?simple=true' | python3 -c '
import json,sys
d=json.load(sys.stdin)
tools=d.get("data",[])
print("total:",len(tools))
for t in tools[:25]:
    print(" ", t.get("name","?"), "|", t.get("source","?"))
'
echo ""
echo "=== searchTools: memory ==="
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=memory&limit=5' | python3 -c '
import json,sys
d=json.load(sys.stdin)
tools=d.get("data",[])
print("results:",len(tools))
for t in tools[:5]:
    print(" ", t.get("name","?"), "| score:", t.get("score",0), "|", t.get("matchReason",""))
'
echo ""
echo "=== searchTools: search ==="
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=search&limit=5' | python3 -c '
import json,sys
d=json.load(sys.stdin)
tools=d.get("data",[])
print("results:",len(tools))
for t in tools[:5]:
    print(" ", t.get("name","?"), "| score:", t.get("score",0), "|", t.get("matchReason",""))
'
