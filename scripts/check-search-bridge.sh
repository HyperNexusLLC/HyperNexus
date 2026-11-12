#!/bin/bash
curl -s 'http://127.0.0.1:7778/api/mcp/tools/search?query=memory&limit=5' | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("success:", d.get("success"))
print("results:", len(d.get("data",[])))
print("bridge:", json.dumps(d.get("bridge",{}), indent=2)[:500])
'
