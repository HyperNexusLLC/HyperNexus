#!/usr/bin/env python3
"""hn-observe.py — HyperNexus observer hook for Prime Agent.

Prime Agent has no native hook API, so this script is invoked explicitly at
session boundaries (or from a scheduled prompt) to log lifecycle events to
the HyperNexus kernel:

  python hooks/hn-observe.py start [--session <id>]
  python hooks/hn-observe.py turn --summary "..." [--session <id>]
  python hooks/hn-observe.py end [--summary "..."] [--session <id>]

Each event writes BOTH:
  - POST /api/memory/facts/add (tags ARRAY: ["prime-agent-hook", "hook:<event>"])
  - POST /api/memory/observations/record (entity graph)

Contract: always exits 0 and prints {"continue": true}. Never throws, never
blocks (2.5s budget per POST), never reads credentials. Kernel-down degrades
to silence (still exit 0 + continue:true).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request

BASE = os.environ.get("HYPERNEXUS_URL", "http://127.0.0.1:7778").rstrip("/")
BUDGET_S = 2.5


def post(path: str, body: dict) -> None:
    try:
        req = urllib.request.Request(
            BASE + path,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=BUDGET_S) as resp:
            resp.read(65536)
    except Exception:
        pass  # fail-soft: a down kernel must never stall a turn


def main() -> int:
    ap = argparse.ArgumentParser(description="Log a Prime Agent lifecycle event to HyperNexus")
    ap.add_argument("event", choices=["start", "turn", "end"])
    ap.add_argument("--session", default=os.environ.get("PRIME_AGENT_SESSION_ID", "unknown"))
    ap.add_argument("--summary", default="")
    args = ap.parse_args()

    session = args.session or "unknown"
    summary = (args.summary or "").strip()[:2000]
    text = {
        "start": f"[prime-agent-hook:session_start] session={session}",
        "turn": f"[prime-agent-hook:turn_end] session={session}" + (f" {summary}" if summary else ""),
        "end": f"[prime-agent-hook:session_shutdown] session={session}" + (f" {summary}" if summary else ""),
    }[args.event]

    post("/api/memory/facts/add", {
        "content": text,
        "tags": ["prime-agent-hook", f"hook:{args.event}"],
        "type": "observation",
    })
    post("/api/memory/observations/record", {
        "kind": f"prime-agent:{args.event}",
        "content": text[:300],
        "files": [],
    })
    print(json.dumps({"continue": True}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
