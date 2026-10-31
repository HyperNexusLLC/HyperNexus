#!/usr/bin/env python3
"""sync-meta-oauth.py — native Meta OAuth login for Prime Agent, sourced from pi.

Copies the Meta OAuth credential (type oauth: refresh + access + expires) from
pi's auth.json (~/.pi/agent/auth.json, created by `/login meta` in pi) into
Prime Agent's auth.json (~/.prime/agent/auth.json) under providers["meta"].

Prime Agent's Rust host reads the block opaquely; the HyperNexus kernel proxy
(http://127.0.0.1:7778/v1, the models.json meta baseUrl) resolves the Bearer
token as META_MUSE_API_KEY env > pi auth.json > prime auth.json, so a synced
prime-side oauth block makes prime self-sufficient when pi's file is absent.

Usage:
  python sync-meta-oauth.py            # sync (idempotent)
  python sync-meta-oauth.py --check    # exit 0 if prime meta block is oauth + access matches pi
  python sync-meta-oauth.py --restore-api-key  # revert prime meta block to api_key shape

Never prints token values — only prefixes/types/expiry. Never writes the
identity refresh anywhere except prime's own auth.json (user scope, not repo).
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path


def agent_file(name: str) -> Path:
    raw = __import__("os").environ.get("PRIME_AGENT_CODING_AGENT_DIR")
    if raw and name == "prime":
        return Path(raw).expanduser().resolve() / "auth.json"
    home = Path.home()
    return (home / ".prime" / "agent" / "auth.json") if name == "prime" else (home / ".pi" / "agent" / "auth.json")


def main() -> int:
    ap = argparse.ArgumentParser(description="Sync Meta OAuth from pi auth.json to prime-agent auth.json")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--restore-api-key", action="store_true")
    args = ap.parse_args()

    pi_auth = agent_file("pi")
    prime_auth = agent_file("prime")
    try:
        pi = json.loads(pi_auth.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"[sync-meta-oauth] cannot read {pi_auth}: {exc}")
        return 1
    meta = pi.get("meta") or {}
    if meta.get("type") != "oauth" or not meta.get("access"):
        print("[sync-meta-oauth] no Meta OAuth credential in pi auth.json (run /login meta in pi first)")
        return 1

    try:
        prime = json.loads(prime_auth.read_text(encoding="utf-8")) if prime_auth.exists() else {}
    except Exception as exc:
        print(f"[sync-meta-oauth] cannot read {prime_auth}: {exc}")
        return 1

    if args.restore_api_key:
        prime["meta"] = {"type": "api_key", "key": meta["access"]}
        bak = prime_auth.with_suffix(".json.pre-oauth-probe")
        if not bak.exists():
            shutil.copy2(prime_auth, bak)
        prime_auth.write_text(json.dumps(prime, indent=2), encoding="utf-8")
        print("[sync-meta-oauth] prime meta block reverted to api_key shape (access prefix %s...)" % meta["access"][:8])
        return 0

    cur = prime.get("meta") or {}
    synced = (
        cur.get("type") == "oauth"
        and cur.get("access") == meta.get("access")
        and cur.get("refresh") == meta.get("refresh")
    )
    if args.check:
        print("[sync-meta-oauth] %s (type=%s access=%s... expires=%s)" % (
            "in sync" if synced else "OUT OF SYNC",
            cur.get("type"), str(cur.get("access") or cur.get("key") or "")[:8], cur.get("expires")))
        return 0 if synced else 1

    if not synced:
        bak = prime_auth.with_suffix(".json.pre-oauth-probe")
        if prime_auth.exists() and not bak.exists():
            shutil.copy2(prime_auth, bak)
        prime["meta"] = {
            "type": "oauth",
            "refresh": meta.get("refresh"),
            "access": meta.get("access"),
            "expires": meta.get("expires"),
        }
        prime_auth.write_text(json.dumps(prime, indent=2), encoding="utf-8")
        print("[sync-meta-oauth] synced oauth (access %s... expires %s)" % (str(meta.get("access"))[:8], meta.get("expires")))
    else:
        print("[sync-meta-oauth] already in sync (access %s... expires %s)" % (str(meta.get("access"))[:8], meta.get("expires")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
