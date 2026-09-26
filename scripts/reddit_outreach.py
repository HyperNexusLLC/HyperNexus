#!/usr/bin/env python3
"""
HyperNexus Reddit Outreach Guide & Automation Prep
Strategic posting guide for relevant subreddits
"""

from datetime import datetime

SUBREDDITS = {
    "show_and_tell": [
        {
            "name": "r/LocalLLaMA",
            "subscribers": "400K+",
            "post_type": "Technical showcase",
            "title": "I built a Go daemon that cuts MCP tool context from 50K to 2.5K tokens (92.7% reduction)",
            "body": """I got tired of watching my AI agents waste tokens re-sending all 76 MCP tool schemas on every request. So I built a local-first control plane in Go that uses sqlite-vec to route only the relevant tools into context.

Results from the benchmark:
• 76 tools -> 2-7 tools per query
• 8,994 tokens -> 660 tokens average (92.7% reduction)
• $30K/year savings at 100K requests/month (Claude 3.5 Sonnet pricing)

Architecture:
• Single compiled Go binary (~15MB)
• sqlite-vec local vector embeddings
• Zero external dependencies
• Sub-millisecond routing latency

Works with 36+ AI clients: Cursor, Claude Code, Aider, Continue, Cline, and more.

Benchmark suite is open source so you can verify the numbers yourself:
https://github.com/robertpelloni/HyperNexus

Happy to answer technical questions about the routing algorithm or benchmark methodology!"""
        },
        {
            "name": "r/ArtificialIntelligence",
            "subscribers": "2.5M+",
            "post_type": "Technical showcase",
            "title": "AI agents waste 80-90% of input tokens on tool schemas — I built a 15MB Go daemon that fixes this",
            "body": """The hidden cost of AI agents isn't the model — it's the context.

Every time an agent calls a tool, the full schema gets re-sent. With 50+ tools (MCP servers, IDE integrations, browser automation), that's 50K+ tokens of waste per request.

I built HyperNexus: a local control plane that uses vector embeddings (sqlite-vec) to inject only the 2-7 tools actually relevant to each query.

Key numbers:
• 92.7% input token reduction (benchmarked, reproducible)
• Single 15MB Go binary, <30MB RAM
• Works with Cursor, Claude Code, Aider + 33 more
• Local-first: no data leaves your machine

The benchmark is open source — run it yourself:
https://github.com/robertpelloni/HyperNexus

Questions? Ask away."""
        },
        {
            "name": "r/SideProject",
            "subscribers": "200K+",
            "post_type": "Indie dev showcase",
            "title": "I built an open-source AI control plane that cut my agent token bill by 92.7%",
            "body": """Solo dev here. Building HyperNexus — a universal control plane for AI tools.

The problem I solved: AI agents waste 80-90% of input tokens re-reading tool schemas. I built a Go daemon with sqlite-vec that routes only relevant tools per request.

Stats after 30 days:
• 92.7% token reduction
• $30K/year theoretical savings at scale
• 36+ AI clients supported
• 113 companies contacted in outreach this week

Open source: https://github.com/robertpelloni/HyperNexus

The grind is real — 3 first-runs, 1 auto-reply from OpenAI. But the tech is solid. Would love feedback from this community!"""
        },
        {
            "name": "r/programming",
            "subscribers": "4.5M+",
            "post_type": "Technical deep-dive",
            "title": "Progressive tool routing: cutting LLM context from 50K to 2.5K tokens with sqlite-vec",
            "body": """I've been working on a system that reduces AI agent context bloat by 92.7%.

The insight: most input tokens sent to LLMs by agent frameworks are static tool schemas. When an agent has 50+ tools available, the framework sends all of them on every request — even when the query only needs 2-3.

My approach: a local Go daemon that:
1. Maintains embeddings of all tool schemas in sqlite-vec
2. On each request, computes semantic similarity between the query and tool schemas
3. Injects only the top-K relevant schemas into context

Results:
• 76 tools loaded -> 2-7 per query (based on intent)
• 8,994 tokens -> 660 average
• Sub-millisecond routing latency

Technical details: https://github.com/robertpelloni/HyperNexus

Curious what the community thinks about the tradeoffs — semantic routing vs. all-tools-loaded."""
        },
        {
            "name": "r/ClaudeAI",
            "subscribers": "150K+",
            "post_type": "MCP showcase",
            "title": "MCP context bloat is real — here's how to cut it by 92.7%",
            "body": """If you use Claude with MCP servers, you know the pain: every request re-sends ALL tool schemas from every MCP server. Add 5-10 servers and you're burning 50K+ tokens per request just on schemas.

I built a local routing layer that:
• Sits between Claude and MCP servers
• Uses sqlite-vec embeddings to pick only relevant tools
• Cuts schema tokens by 92.7% (benchmarked)

Works with Claude Desktop, Claude Code, Cursor, and 33+ other clients.

Open source benchmark: https://github.com/robertpelloni/HyperNexus

Would love feedback from heavy MCP users!"""
        },
    ]
}

REDDIT_RULES = """
## Reddit Posting Rules (CRITICAL)

1. **Don't use multiple accounts to upvote** — instant ban
2. **Don't post the same content twice** — use different angles per subreddit
3. **Engage in comments for 1-2 hours** after posting
4. **No affiliate links** in self-posts (company site links are OK)
5. **Read the subreddit sidebar rules** before posting
6. **Reddit is 90% comment engagement, 10% posting**
7. **Space out posts**: max 1-2 per week per subreddit
8. **Never delete and repost** — shadowban risk
9. **Contribute value before promoting**: have comment history in the subreddit
10. **Be genuine** — Reddit users can smell marketing a mile away
"""


def main():
    print("=" * 60)
    print("HyperNexus Reddit Outreach Guide")
    print("=" * 60)

    lines = []
    lines.append("# HyperNexus Reddit Outreach Guide\n")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
    lines.append(REDDIT_RULES)
    lines.append("\n---\n")

    for category, posts in SUBREDDITS.items():
        lines.append(f"## {category.replace('_', ' ').title()}\n")
        for post in posts:
            lines.append(f"### {post['name']} ({post['subscribers']})")
            lines.append(f"**Type:** {post['post_type']}")
            lines.append(f"\n**Title:** {post['title']}")
            lines.append("\n**Body:**")
            lines.append("```")
            lines.append(post['body'])
            lines.append("```")
            lines.append("\n---\n")

    content = "\n".join(lines)
    try:
        with open('../docs/REDDIT_OUTREACH.md', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Saved REDDIT_OUTREACH.md")
    except OSError as e:
        print(f"Could not save: {e}")


if __name__ == "__main__":
    main()
