#!/usr/bin/env python3
"""
HyperNexus Startup Directory Submissions
Free distribution channels for early-stage products
"""

from datetime import datetime

DIRECTORIES = [
    {
        "name": "Product Hunt",
        "url": "https://www.producthunt.com/posts/new",
        "type": "Launch platform",
        "description": "Main launch channel. Post at midnight PST for max visibility.",
        "status": "not_submitted",
        "notes": "See PRODUCT_HUNT_LAUNCH.md for full kit",
        "cost": "Free",
    },
    {
        "name": "AlternativeTo",
        "url": "https://alternativeto.net/",
        "type": "Software directory",
        "description": "List as alternative to Cursor/Copilot/Copilot for token optimization",
        "status": "not_submitted",
        "notes": "Good SEO traffic. Tag: alternative to Cursor, Copilot",
        "cost": "Free",
    },
    {
        "name": "Hacker News (Show HN)",
        "url": "https://news.ycombinator.com/submit",
        "type": "Community",
        "description": "Already submitted once. Wait 2-3 weeks for second attempt with new angle.",
        "status": "submitted",
        "notes": "Original: 'Show HN: TormentNexus – Local-first Go control plane'",
        "cost": "Free",
    },
    {
        "name": "GitHub Trending",
        "url": "https://github.com/trending",
        "type": "Organic distribution",
        "description": "Get repo on trending by posting updates, good README, and community engagement",
        "status": "active",
        "notes": "README.md is critical. Add demo GIF.",
        "cost": "Free",
    },
    {
        "name": "SaaSHub",
        "url": "https://www.saashub.com/",
        "type": "SaaS directory",
        "description": "List for developer tools category",
        "status": "not_submitted",
        "notes": "Free tier available",
        "cost": "Free",
    },
    {
        "name": "Fazier",
        "url": "https://www.fazier.com/",
        "type": "SaaS directory",
        "description": "Developer tool listings",
        "status": "not_submitted",
        "notes": "",
        "cost": "Free",
    },
    {
        "name": "BetaList",
        "url": "https://betalist.com/",
        "type": "Startup community",
        "description": "Showcase beta product to early adopters",
        "status": "not_submitted",
        "notes": "Good for early feedback and signups",
        "cost": "Free",
    },
    {
        "name": "Indie Hackers",
        "url": "https://www.indiehackers.com/",
        "type": "Indie community",
        "description": "Post product milestones and journey updates",
        "status": "not_submitted",
        "notes": "Good for solo dev narrative",
        "cost": "Free",
    },
    {
        "name": "Dev.to",
        "url": "https://dev.to/",
        "type": "Dev community",
        "description": "Technical blog posts about the architecture",
        "status": "not_submitted",
        "notes": "Great for SEO and dev audience",
        "cost": "Free",
    },
    {
        "name": "Medium",
        "url": "https://medium.com/",
        "type": "Blog platform",
        "description": "Long-form technical articles",
        "status": "not_submitted",
        "notes": "Cross-post from dev.to",
        "cost": "Free",
    },
    {
        "name": "X/Twitter",
        "url": "https://twitter.com/",
        "type": "Social",
        "description": "Daily posting from content calendar",
        "status": "active",
        "notes": "See CONTENT_CALENDAR.md",
        "cost": "Free",
    },
    {
        "name": "LinkedIn",
        "url": "https://www.linkedin.com/",
        "type": "Social",
        "description": "B2B outreach and thought leadership",
        "status": "active",
        "notes": "See LINKEDIN_OUTREACH.md",
        "cost": "Free",
    },
    {
        "name": "Reddit",
        "url": "https://www.reddit.com/",
        "type": "Community",
        "description": "Technical showcase in relevant subreddits",
        "status": "prepared",
        "notes": "See REDDIT_OUTREACH.md",
        "cost": "Free",
    },
    {
        "name": "Discord",
        "url": "https://discord.gg/Hj9P3GbVxR",
        "type": "Community",
        "description": "Product community server",
        "status": "active",
        "notes": "Invite: discord.gg/Hj9P3GbVxR",
        "cost": "Free",
    },
    {
        "name": "Changelog",
        "url": "https://changelog.com/",
        "type": "Dev podcast/community",
        "description": "Submit for podcast consideration",
        "status": "not_submitted",
        "notes": "They cover developer tools",
        "cost": "Free",
    },
    {
        "name": "Hacker News",
        "url": "https://news.ycombinator.com/",
        "type": "Community",
        "description": "Regular posts in comments and Ask HN",
        "status": "active",
        "notes": "Comment on relevant threads",
        "cost": "Free",
    },
]


def main():
    print("=" * 60)
    print("HyperNexus Startup Directory Submissions")
    print("=" * 60)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    lines = []
    lines.append("# HyperNexus Startup Directory Submissions\n")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")

    submitted = [d for d in DIRECTORIES if d["status"] in ("active", "submitted")]
    pending = [d for d in DIRECTORIES if d["status"] not in ("active", "submitted")]

    lines.append(f"**Active:** {len(submitted)} | **Pending:** {len(pending)}\n")
    lines.append("\n---\n")

    lines.append("## Active Channels\n")
    for d in submitted:
        lines.append(f"- **{d['name']}** ({d['type']}) — {d['notes']}")

    lines.append("\n## Pending Submissions\n")
    for d in pending:
        lines.append(f"### {d['name']}")
        lines.append(f"- URL: {d['url']}")
        lines.append(f"- Type: {d['type']}")
        lines.append(f"- Cost: {d['cost']}")
        lines.append(f"- Description: {d['description']}")
        lines.append(f"- Notes: {d['notes']}")
        lines.append("")

    content = "\n".join(lines)
    try:
        with open('../docs/DIRECTORY_SUBMISSIONS.md', 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\nSaved DIRECTORY_SUBMISSIONS.md ({len(DIRECTORIES)} directories)")
    except OSError as e:
        print(f"Could not save: {e}")

    print("\nPending submissions to complete:")
    for d in pending:
        print(f"  [ ] {d['name']} — {d['url']}")


if __name__ == "__main__":
    main()
