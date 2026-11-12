#!/usr/bin/env python3
"""
HyperNexus Daily Marketing Status
One command to check everything
"""

import os
import sys
import subprocess
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def run(cmd, cwd=SCRIPT_DIR, timeout=60):
    """Run a command and return output"""
    try:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return result.stdout + result.stderr
    except Exception as e:
        return str(e)


def main():
    print("=" * 60)
    print("HYPERNEXUS DAILY MARKETING STATUS")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)

    # 1. Outreach stats
    print("\n--- OUTREACH DATABASE ---")
    stats = run([sys.executable, '-c', '''
from outreach_top100 import Top100Outreach
o = Top100Outreach()
o.get_stats()
o.close()
'''])
    print(stats.strip())

    # 2. Response check summary
    print("\n--- RESPONSES ---")
    try:
        with open(os.path.join(SCRIPT_DIR, 'response_tracking.json'), 'r', encoding='utf-8') as f:
            import json
            data = json.load(f)
            responses = data.get('responses', [])
            print(f"Total responses tracked: {len(responses)}")
            for r in responses[:5]:
                print(f"  - {r.get('sender', 'Unknown')}: {r.get('subject', '')}")
    except Exception as e:
        print(f"  No response tracking file: {e}")

    # 3. Server health
    print("\n--- SERVER HEALTH ---")
    import requests
    try:
        health = requests.get('https://hypernexus.site/api/go/health', timeout=15).json()
        print(f"  Go Kernel: OK (uptime {health.get('uptimeSec', 0) // 86400} days)")
    except Exception as e:
        print(f"  Go Kernel: FAILED ({e})")

    try:
        dash = requests.get('https://hypernexus.site/dashboard', timeout=15)
        print(f"  Dashboard: HTTP {dash.status_code}")
    except Exception as e:
        print(f"  Dashboard: FAILED ({e})")

    # 4. Telemetry
    print("\n--- TELEMETRY (30 days) ---")
    try:
        telemetry = requests.get('https://hypernexus.site/api/v1/telemetry/first_run?days=30', timeout=15).json()
        total_runs = sum(m.get('firstRuns', 0) for m in telemetry.get('metrics', []))
        total_downloads = sum(m.get('downloads', 0) for m in telemetry.get('metrics', []))
        print(f"  First runs: {total_runs}")
        print(f"  Downloads: {total_downloads}")
    except Exception as e:
        print(f"  Telemetry: FAILED ({e})")

    # 5. Today's content
    print("\n--- TODAY'S CONTENT ---")
    today = datetime.now().strftime('%Y-%m-%d')
    try:
        with open(os.path.join(SCRIPT_DIR, 'content_calendar.json'), 'r', encoding='utf-8') as f:
            import json
            calendar = json.load(f)
            today_post = next((d for d in calendar if d['date'] == today), None)
            if today_post:
                print(f"  Theme: {today_post['theme']}")
                print(f"  Post: {today_post['main_post'][:100]}...")
            else:
                print("  No post scheduled for today")
    except Exception as e:
        print(f"  Calendar: {e}")

    # 6. Next actions
    print("\n--- NEXT ACTIONS ---")
    print("  1. Send 3-5 X/Twitter DMs (docs/X_TWITTER_DM_SCRIPTS.md)")
    print("  2. Send 10 LinkedIn connections (docs/LINKEDIN_OUTREACH.md)")
    print("  3. Post today's content (docs/CONTENT_CALENDAR.md)")
    print("  4. Check Gmail inbox for responses")
    print("  5. Submit 2 directories (docs/DIRECTORY_SUBMISSIONS.md)")

    print("\n" + "=" * 60)
    print("DONE - Have a productive day!")
    print("=" * 60)


if __name__ == "__main__":
    main()
