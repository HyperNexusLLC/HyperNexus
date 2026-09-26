#!/usr/bin/env python3
"""
HyperNexus 30-Day Content Calendar Generator
Creates a complete posting schedule for X/Twitter, LinkedIn, Reddit
"""

import json
from datetime import datetime, timedelta

# Content themes mapped to days
CONTENT = {
    "problem": [
        "AI agents waste 80-90% of input tokens re-reading tool schemas on every request. Nobody talks about this because it's invisible -- until you see the bill.",
        "Your AI agent sends 50,000 tokens of tool schemas with every request. It needs 5. That's the whole pitch.",
        "Every MCP server you add doubles your context payload. Most agents never use 90% of the tools they load. The math is brutal.",
        "Token costs aren't a model pricing problem. They're a context engineering problem. Most teams optimize the wrong layer.",
    ],
    "solution": [
        "Built a Go daemon that routes only the 2-7 tools an agent actually needs per request. 92.7% token reduction. Benchmark: github.com/robertpelloni/HyperNexus",
        "Local vector routing (sqlite-vec) + progressive tool loading = 92.7% fewer input tokens. Single 15MB binary. Zero deps.",
        "The fix for context bloat isn't a bigger context window. It's sending less context. HyperNexus sends 2,500 tokens instead of 50,000.",
        "Sub-millisecond routing, <30MB RAM, 36+ AI clients supported. That's what 92.7% token reduction looks like when done right.",
    ],
    "benchmark": [
        "Benchmark: 76 tools loaded -> 2-7 per query. 8,994 tokens -> 660 average. $30K/year saved at 100K requests/mo. Run it yourself: github.com/robertpelloni/HyperNexus",
        "60-second benchmark. Reproducible. No cloud. Just run: python3 benchmark.py -- see the numbers yourself.",
        "I don't want you to trust my numbers. That's why the benchmark suite is in the repo. Run it. Verify it. Then we talk.",
    ],
    "architecture": [
        "How it works: 1) Agent sends query 2) sqlite-vec matches intent to tools 3) Only relevant schemas injected 4) LLM sees clean context. That's the whole system.",
        "The architecture is 3 layers: local embedding index, progressive router, and a thin MCP proxy. Each layer is <500 lines of Go.",
        "Why Go? 15MB binary, no runtime deps, sub-ms routing, cross-compiles everywhere. The right tool for the job.",
        "sqlite-vec embeds live locally. Zero data leaves your machine. Your tool schemas, your context, your business -- private by default.",
    ],
    "client_support": [
        "Works with 36+ AI clients: Cursor, Claude Code, Aider, Windsurf, Continue, Cline, Codex CLI, Gemini CLI, Qwen Code, and more.",
        "One MCP endpoint. Every AI client connects. One daemon routes for all of them. That's the control plane idea.",
        "Claude Desktop, Jan, Perplexity, Kimi, MiniMax, AnythingLLM, ZCode -- HyperNexus injects MCP configs into all of them automatically.",
    ],
    "acquisition": [
        "Building HyperNexus -- a universal AI control plane. Exploring strategic acquisition opportunities. Open to conversations with AI infra teams.",
        "If you run an AI coding product and care about unit economics, I'd love 15 minutes. We cut token costs by 92.7%.",
        "100+ AI companies got a technical note this week. If you didn't get one, ask me for the benchmark suite. It's open source.",
    ],
    "indie": [
        "Ship in public: 113 outreach emails sent, 1 response (auto-reply), 30 DM scripts ready, 0 downloads. Reality of building in public. We keep going.",
        "Day 30 of building HyperNexus: zero customers, three first-runs, one auto-reply from OpenAI. The grind is the product.",
        "Nobody owes you a download. Every first-run is earned. Every response is a gift. Keep shipping.",
    ],
    "call_to_action": [
        "Want to cut your agent token costs? The benchmark takes 60 seconds: github.com/robertpelloni/HyperNexus",
        "Free, open-source, self-hosted. Install in 2 minutes with one command: hypernexus.site/install.ps1",
        "The control plane for your AI tools is open source now. Try it before the VC-funded competitors price it.",
    ],
}

# Days of the week themes
DAY_THEMES = {
    0: "architecture",  # Monday
    1: "benchmark",     # Tuesday
    2: "client_support", # Wednesday
    3: "problem",       # Thursday
    4: "solution",      # Friday
    5: "indie",         # Saturday
    6: "call_to_action", # Sunday
}


def generate_calendar(days=30):
    """Generate a 30-day content calendar"""
    calendar = []
    start = datetime.now()

    for i in range(days):
        date = start + timedelta(days=i)
        theme = DAY_THEMES.get(date.weekday(), "problem")
        posts = CONTENT[theme]
        # Cycle through posts of the theme
        post_index = (i // 1) % len(posts)

        # Main post
        main_post = posts[post_index]

        # Additional themes for variety
        secondary_theme = "call_to_action" if theme != "call_to_action" else "solution"
        secondary = CONTENT[secondary_theme][i % len(CONTENT[secondary_theme])]

        calendar.append({
            "date": date.strftime("%Y-%m-%d"),
            "day": date.strftime("%A"),
            "theme": theme,
            "main_post": main_post,
            "secondary_post": secondary,
            "platforms": ["X", "LinkedIn"] if i % 3 != 0 else ["X", "LinkedIn", "Reddit"]
        })

    return calendar


def save_calendar(calendar):
    """Save calendar to markdown and JSON"""
    lines = []
    lines.append("# HyperNexus 30-Day Content Calendar\n")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
    lines.append("Post at 9:00 AM EST (best engagement for dev content)\n")
    lines.append("\n---\n")

    for day in calendar:
        lines.append(f"## {day['date']} ({day['day']}) — {day['theme'].replace('_', ' ').title()}")
        lines.append(f"**Platforms:** {', '.join(day['platforms'])}")
        lines.append("\n**Main Post (X/LinkedIn):**")
        lines.append(f"> {day['main_post']}")
        lines.append("\n**Secondary Post:**")
        lines.append(f"> {day['secondary_post']}")
        lines.append("\n---\n")

    content = "\n".join(lines)
    try:
        with open('../docs/CONTENT_CALENDAR.md', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Saved CONTENT_CALENDAR.md")
    except OSError as e:
        print(f"Could not save: {e}")

    try:
        with open('content_calendar.json', 'w', encoding='utf-8') as f:
            json.dump(calendar, f, indent=2)
        print("Saved content_calendar.json")
    except OSError as e:
        print(f"Could not save JSON: {e}")


def main():
    print("=" * 60)
    print("HyperNexus 30-Day Content Calendar")
    print("=" * 60)

    calendar = generate_calendar(30)
    save_calendar(calendar)

    print(f"\nGenerated {len(calendar)} days of content")
    print("\nPreview (first 5 days):")
    for day in calendar[:5]:
        print(f"\n[{day['date']}] {day['day']} — {day['theme']}")
        print(f"  {day['main_post'][:80]}...")


if __name__ == "__main__":
    main()
