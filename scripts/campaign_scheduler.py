#!/usr/bin/env python3
"""HyperNexus Marketing Campaign Scheduler.

Schedules and tracks marketing campaigns across channels:
- Content calendar (blog, social)
- Reddit outreach
- X/Twitter outreach
- Directory submissions
- Email outreach

Usage:
    python scripts/campaign_scheduler.py status     # Show campaign status
    python scripts/campaign_scheduler.py schedule   # Generate weekly schedule
    python scripts/campaign_scheduler.py execute    # Run pending campaigns
    python scripts/campaign_scheduler.py report     # Generate performance report
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
CAMPAIGN_FILE = PROJECT_ROOT / ".tormentnexus" / "campaigns.json"

CAMPAIGNS = {
    "content_calendar": {
        "name": "Content Calendar",
        "channel": "blog",
        "frequency": "weekly",
        "scripts": ["scripts/content_calendar.py", "scripts/gen-blog.py"],
        "status": "ready",
        "priority": 1,
    },
    "reddit_outreach": {
        "name": "Reddit Outreach",
        "channel": "reddit",
        "frequency": "daily",
        "scripts": ["scripts/reddit_outreach.py", "scripts/auto_post_reddit.py"],
        "status": "ready",
        "priority": 2,
    },
    "x_twitter_outreach": {
        "name": "X/Twitter Outreach",
        "channel": "twitter",
        "frequency": "daily",
        "scripts": ["scripts/x_dm_outreach.py", "scripts/auto_twitter_v2.py"],
        "status": "ready",
        "priority": 3,
    },
    "directory_submissions": {
        "name": "Directory Submissions",
        "channel": "directories",
        "frequency": "weekly",
        "scripts": ["scripts/directory_submissions.py"],
        "status": "ready",
        "priority": 4,
    },
    "email_outreach": {
        "name": "Email Outreach",
        "channel": "email",
        "frequency": "weekly",
        "scripts": ["scripts/outreach_automation.py", "scripts/outreach_top100.py"],
        "status": "ready",
        "priority": 5,
    },
    "linkedin": {
        "name": "LinkedIn Outreach",
        "channel": "linkedin",
        "frequency": "weekly",
        "scripts": ["scripts/auto_linkedin_page.py", "scripts/post_linkedin_article.py"],
        "status": "ready",
        "priority": 6,
    },
    "product_hunt": {
        "name": "Product Hunt Launch",
        "channel": "producthunt",
        "frequency": "once",
        "scripts": [],
        "status": "planned",
        "priority": 7,
    },
}

WEEKLY_SCHEDULE = {
    "monday": ["content_calendar", "directory_submissions"],
    "tuesday": ["reddit_outreach", "x_twitter_outreach"],
    "wednesday": ["email_outreach", "linkedin"],
    "thursday": ["reddit_outreach", "x_twitter_outreach"],
    "friday": ["content_calendar", "reddit_outreach"],
    "saturday": ["x_twitter_outreach"],
    "sunday": [],
}


def load_state():
    if CAMPAIGN_FILE.exists():
        return json.loads(CAMPAIGN_FILE.read_text())
    return {"executions": [], "last_run": None}


def save_state(state):
    CAMPAIGN_FILE.parent.mkdir(parents=True, exist_ok=True)
    CAMPAIGN_FILE.write_text(json.dumps(state, indent=2))


def cmd_status():
    print("=" * 60)
    print("HyperNexus Marketing Campaign Status")
    print("=" * 60)
    for key, campaign in sorted(CAMPAIGNS.items(), key=lambda x: x[1]["priority"]):
        status_icon = {"ready": "✓", "planned": "○", "running": "▶", "done": "✓"}.get(
            campaign["status"], "?"
        )
        print(f"  {status_icon} {campaign['name']:30s} [{campaign['channel']:12s}] {campaign['frequency']}")
    print()
    state = load_state()
    if state["last_run"]:
        print(f"  Last run: {state['last_run']}")
    print(f"  Total executions: {len(state['executions'])}")


def cmd_schedule():
    print("=" * 60)
    print("Weekly Marketing Schedule")
    print("=" * 60)
    for day, campaigns in WEEKLY_SCHEDULE.items():
        print(f"\n  {day.upper()}")
        if not campaigns:
            print("    (rest)")
        for camp_key in campaigns:
            camp = CAMPAIGNS[camp_key]
            scripts = ", ".join(camp["scripts"]) if camp["scripts"] else "(manual)"
            print(f"    • {camp['name']} — {scripts}")
    print(f"\n  Total: {sum(len(v) for v in WEEKLY_SCHEDULE.values())} campaign slots per week")


def cmd_execute():
    state = load_state()
    today = datetime.now().strftime("%A").lower()
    today_campaigns = WEEKLY_SCHEDULE.get(today, [])
    
    print(f"Executing campaigns for {today.upper()}...")
    for camp_key in today_campaigns:
        camp = CAMPAIGNS[camp_key]
        print(f"\n  ▶ {camp['name']}")
        for script in camp["scripts"]:
            script_path = PROJECT_ROOT / script
            if script_path.exists():
                print(f"    Running: {script}")
                # Note: actual execution requires human review for external posts
                state["executions"].append({
                    "campaign": camp_key,
                    "script": script,
                    "timestamp": datetime.now().isoformat(),
                    "status": "queued",
                })
            else:
                print(f"    SKIP (not found): {script}")
    
    state["last_run"] = datetime.now().isoformat()
    save_state(state)
    print(f"\n  {len(today_campaigns)} campaigns queued for {today.upper()}")
    print("  NOTE: External posts require human review before publishing.")


def cmd_report():
    state = load_state()
    print("=" * 60)
    print("Marketing Performance Report")
    print("=" * 60)
    
    by_campaign = {}
    for ex in state["executions"]:
        by_campaign.setdefault(ex["campaign"], []).append(ex)
    
    for camp_key, executions in sorted(by_campaign.items()):
        camp = CAMPAIGNS.get(camp_key, {})
        print(f"\n  {camp.get('name', camp_key)}")
        print(f"    Executions: {len(executions)}")
        if executions:
            last = executions[-1]
            print(f"    Last run: {last['timestamp']}")
    
    if not state["executions"]:
        print("\n  No executions yet. Run 'execute' to start.")
    
    print(f"\n  Report generated: {datetime.now().isoformat()}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    cmd = sys.argv[1]
    if cmd == "status":
        cmd_status()
    elif cmd == "schedule":
        cmd_schedule()
    elif cmd == "execute":
        cmd_execute()
    elif cmd == "report":
        cmd_report()
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)
