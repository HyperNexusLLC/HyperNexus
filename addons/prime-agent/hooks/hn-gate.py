#!/usr/bin/env python3
"""hn-gate.py — HyperNexus pre-tool allow-gate for Prime Agent.

Validates a proposed tool call offline (no network I/O, keeping the hot path
under budget) and allows everything unless it matches a dangerous pattern.

  python hooks/hn-gate.py --tool <name> --args '<json>'   # exit 0 = allow

Contract: exit 0 allows the call and prints {"continue": true}; exit 2 blocks
it (stderr becomes the tool error). Anything unexpected fails open (exit 0).
Never reads credentials, never throws.

Dangerous patterns (mirroring the pi/jcode routing rules): rm -rf, sudo,
chmod -R 777, DROP TABLE, fork bombs.
"""

from __future__ import annotations

import argparse
import json
import re
import sys

DENY = [
    (r"\brm\s+-rf\b", "refused: recursive-force delete"),
    (r"\bsudo\b", "refused: privilege escalation"),
    (r"\bchmod\s+-R\s+777\b", "refused: world-writable recursion"),
    (r"\bDROP\s+TABLE\b", "refused: destructive SQL"),
    (r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;", "refused: fork bomb"),
]


def main() -> int:
    ap = argparse.ArgumentParser(description="Fail-open allow-gate for a Prime Agent tool call")
    ap.add_argument("--tool", default="")
    ap.add_argument("--args", default="{}")
    args = ap.parse_args()

    blob = f"{args.tool} {args.args}"
    try:
        for pattern, reason in DENY:
            if re.search(pattern, blob, re.IGNORECASE):
                print(reason, file=sys.stderr)
                print(json.dumps({"continue": False, "reason": reason}))
                return 2
    except Exception:
        pass  # fail open
    print(json.dumps({"continue": True}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
