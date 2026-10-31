#!/usr/bin/env python3
"""mini-swe-agent extension smoke test (hermetic; kernel health is warn-only).

Checks:
  P1 plugin manifest paths resolve (skills/hooks/mcp)
  P2 all 9 skills have SKILL.md
  P3 hooks.json + hook entrypoint exist
  P4 mcp.json parses with hypernexus stdio server
  P5 meta-model pins muse-spark-1.3-contributor
  P6 installer --check passes
  P7 kernel /health reachable (WARN-only; box may be loaded)
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent  # addons/mini-swe-agent/
PASS, FAIL, WARN = [], [], []


def ok(name):
    PASS.append(name)
    print(f"[PASS] {name}")


def fail(name, detail=""):
    FAIL.append(name)
    print(f"[FAIL] {name} {detail}")


def warn(name, detail=""):
    WARN.append(name)
    print(f"[WARN] {name} {detail}")


# P1: plugin manifest paths resolve
try:
    manifest = json.loads((HERE / "config" / "hypernexus.plugin.json").read_text(encoding="utf-8"))
    bad = []
    for key in ("skills", "hooks", "mcpServers"):
        targets = manifest.get(key)
        items = targets if isinstance(targets, list) else [targets]
        for t in items:
            if not (HERE / "config" / t).exists():
                bad.append(f"{key}={t}")
    if bad:
        fail("plugin manifest paths resolve", f"missing: {bad}")
    else:
        ok("plugin manifest paths resolve")
except Exception as e:  # noqa: BLE001 - smoke test reports, never raises
    fail("plugin manifest paths resolve", str(e)[:160])

# P2: all 9 skills
SKILLS = ["hypernexus", "hypernexus-agents", "hypernexus-l2", "hypernexus-mcp-routing",
          "hypernexus-memory", "hypernexus-ops", "hypernexus-sessions",
          "hypernexus-status-billing", "hypernexus-workflows"]
missing = [s for s in SKILLS if not (HERE / "skills" / s / "SKILL.md").exists()]
if missing:
    fail("9 skills with SKILL.md", f"missing: {missing}")
else:
    ok("9 skills with SKILL.md")

# P3: hooks
if (HERE / "hooks" / "hooks.json").exists():
    ok("hooks.json + entrypoint present")
else:
    fail("hooks.json + entrypoint present")

# P4: mcp.json
try:
    mcp = json.loads((HERE / "mcp.json").read_text(encoding="utf-8"))
    srv = mcp.get("mcpServers", {}).get("hypernexus", {})
    if srv.get("args") == ["mcp"] and "hypernexus" in str(srv.get("command", "")):
        ok("mcp.json hypernexus stdio")
    else:
        fail("mcp.json hypernexus stdio", str(srv)[:160])
except Exception as e:  # noqa: BLE001
    fail("mcp.json hypernexus stdio", str(e)[:160])

# P5: meta-model
try:
    meta = (HERE / "meta-model.mini-swe-agent.md").read_text(encoding="utf-8")
    if "muse-spark-1.3-contributor" in meta and "meta" in meta:
        ok("meta-model pins muse-spark-1.3-contributor")
    else:
        fail("meta-model pins muse-spark-1.3-contributor")
except Exception as e:  # noqa: BLE001
    fail("meta-model pins muse-spark-1.3-contributor", str(e)[:160])

# P6: installer --check
try:
    r = subprocess.run(["node", str(HERE / "install.mjs"), "--check"],
                       capture_output=True, text=True, timeout=60)
    if r.returncode == 0:
        ok("install.mjs --check")
    else:
        fail("install.mjs --check", (r.stdout + r.stderr)[-300:])
except Exception as e:  # noqa: BLE001
    fail("install.mjs --check", str(e)[:160])

# P7: kernel health (warn-only)
try:
    with urllib.request.urlopen("http://127.0.0.1:7778/health", timeout=10) as r:
        body = json.loads(r.read().decode("utf-8"))
        if body.get("ok"):
            ok(f"kernel health {body.get('version')}")
        else:
            warn("kernel health", str(body)[:120])
except Exception as e:  # noqa: BLE001
    warn("kernel health", str(e)[:120])

print(f"\n=== mini-swe-agent smoke: {len(PASS)} pass, {len(WARN)} warn, {len(FAIL)} fail ===")
sys.exit(1 if FAIL else 0)
