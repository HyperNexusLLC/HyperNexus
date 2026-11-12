#!/usr/bin/env python3
"""
outreach_automation.py — Wednesday campaign entry point for campaign_scheduler.py.

Delegates to the outreach suite (run_outreach.py) which orchestrates:
  1. Initial top-100 outreach (rate-limited, 30/hour)
  2. Targeted CTO pitches from the DB
  3. Due follow-ups (day 5/10/15 schedule)

Usage:
  python outreach_automation.py                # full pipeline
  python outreach_automation.py --dry-run      # preview without sending
  python outreach_automation.py --initial      # only initial outreach
  python outreach_automation.py --followups    # only due follow-ups
"""

import subprocess
import sys
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUTREACH_DIR = os.path.join(HERE, "outreach")
RUNNER = os.path.join(OUTREACH_DIR, "run_outreach.py")


def main():
    if not os.path.exists(RUNNER):
        print(f"[outreach_automation] ERROR: {RUNNER} not found")
        sys.exit(1)

    cmd = [sys.executable, RUNNER]
    cmd.extend(sys.argv[1:])

    print(f"[outreach_automation] Delegating to: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=OUTREACH_DIR)

    if result.returncode == 0:
        print("[outreach_automation] Pipeline complete.")
    else:
        print(f"[outreach_automation] Pipeline exited with code {result.returncode}")
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
