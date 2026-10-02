#!/usr/bin/env python3
"""HyperNexus MCP Python client example.

Connects to the HyperNexus Go kernel HTTP API to list tools,
search for a tool, and call it.

Usage:
    python python-client.py
    python python-client.py --search "file read"
    python python-client.py --call run_python --args '{"code": "print(1+1)"}'
"""

import argparse
import json
import sys
import urllib.request

BASE = "http://127.0.0.1:7778"


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=10) as r:
        return json.loads(r.read())


def post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE}{path}", data=data, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def main():
    parser = argparse.ArgumentParser(description="HyperNexus MCP Python client")
    parser.add_argument("--search", help="Search tools by query")
    parser.add_argument("--call", help="Call a tool by name")
    parser.add_argument("--args", default="{}", help="JSON arguments for --call")
    args = parser.parse_args()

    # Health check
    health = get("/health")
    print(f"Kernel: {health}")

    if args.search:
        result = post("/api/mcp/tools/search", {"query": args.search})
        tools = result.get("tools", [])
        print(f"Found {len(tools)} tools:")
        for t in tools[:10]:
            print(f"  - {t.get('name', '?')}: {t.get('description', '')[:80]}")
    elif args.call:
        tool_args = json.loads(args.args)
        result = post("/api/mcp/tools/call", {"tool": args.call, "args": tool_args})
        print(json.dumps(result, indent=2))
    else:
        # List all tools
        result = get("/api/mcp/tools")
        tools = result.get("tools", [])
        print(f"Available tools ({len(tools)}):")
        for t in tools[:20]:
            print(f"  - {t.get('name', '?')}")
        if len(tools) > 20:
            print(f"  ... and {len(tools) - 20} more")


if __name__ == "__main__":
    main()
