"""
Reddit Reply Queue Generator
Scrapes Reddit for relevant threads and generates intelligent replies using MiMo v2.5
"""

import json
import time
import sys
import os
import websocket
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llm_reply import generate_reply

# Subreddits to monitor
SUBREDDITS = [
    "mcp",
    "ClaudeAI",
    "LocalLLaMA",
    "MachineLearning",
    "SaaS",
    "startups",
    "SideProject",
    "webdev",
    "artificial",
    "ChatGPT",
    "LangChain",
    "OpenAI",
    "AI_Agents",
    "LLMDevs",
    "selfhosted",
]

# Keywords for relevance filtering
RELEVANT_KEYWORDS = [
    "mcp",
    "model context protocol",
    "tool routing",
    "tool server",
    "rate limit",
    "429",
    "quota",
    "api limit",
    "memory",
    "forget",
    "context",
    "remember",
    "persistent",
    "agent",
    "framework",
    "orchestration",
    "workflow",
    "open source",
    "self-host",
    "selfhost",
    "free",
    "claude",
    "cursor",
    "copilot",
    "ai coding",
    "llm",
    "local ai",
    "ollama",
    "lm studio",
    "startup",
    "saas",
    "launch",
    "build",
    "developer tools",
    "dev tools",
    "productivity",
]

QUEUE_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "reddit_reply_queue.json"
)


def get_cdp_url():
    try:
        resp = urllib.request.urlopen("http://localhost:9222/json", timeout=5)
        tabs = json.loads(resp.read())
        for tab in tabs:
            if "edge://newtab" in tab.get("url", ""):
                return tab.get("webSocketDebuggerUrl")
        if tabs:
            return tabs[0].get("webSocketDebuggerUrl")
    except Exception:
        pass
    return None


def scrape_subreddit(ws, subreddit):
    """Scrape posts from a subreddit"""
    ws.send(
        json.dumps(
            {
                "id": 1,
                "method": "Page.navigate",
                "params": {"url": f"https://old.reddit.com/r/{subreddit}/new/"},
            }
        )
    )
    time.sleep(5)

    ws.send(
        json.dumps(
            {
                "id": 2,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": """
            (function() {
                var posts = [];
                var items = document.querySelectorAll('.link');
                for (var i = 0; i < Math.min(items.length, 25); i++) {
                    var titleLink = items[i].querySelector('a.title');
                    var commentsLink = items[i].querySelector('a.comments');
                    if (titleLink) {
                        var commentText = commentsLink ? commentsLink.textContent.trim() : '0 comments';
                        var commentCount = parseInt(commentText) || 0;
                        posts.push({
                            title: titleLink.textContent.trim(),
                            url: commentsLink ? commentsLink.href : titleLink.href,
                            comments: commentCount
                        });
                    }
                }
                return JSON.stringify(posts);
            })()
            """,
                    "returnByValue": True,
                },
            }
        )
    )
    time.sleep(2)

    for _ in range(5):
        try:
            ws.settimeout(3)
            d = json.loads(ws.recv())
            if d.get("id") == 2:
                return json.loads(
                    d.get("result", {}).get("result", {}).get("value", "[]")
                )
        except:
            continue
    return []


def is_relevant(title):
    """Check if title is relevant"""
    title_lower = title.lower()
    return any(kw in title_lower for kw in RELEVANT_KEYWORDS)


def load_queue():
    """Load existing reply queue"""
    try:
        with open(QUEUE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []


def save_queue(queue):
    """Save reply queue"""
    with open(QUEUE_FILE, "w", encoding="utf-8") as f:
        json.dump(queue, f, indent=2)


def main():
    ws_url = get_cdp_url()
    if not ws_url:
        print("Could not connect to browser")
        return

    print(f"Connecting to: {ws_url}")
    ws = websocket.create_connection(ws_url, timeout=15)
    print("Connected!")

    # Load existing queue
    queue = load_queue()
    existing_urls = {r["url"] for r in queue}
    print(f"Existing queue: {len(queue)} replies")

    # Scrape all subreddits
    all_threads = []
    for sub in SUBREDDITS:
        print(f"\n[Scraping] r/{sub}...")
        threads = scrape_subreddit(ws, sub)
        print(f"  Found {len(threads)} posts")

        # Filter for relevant threads with good engagement
        for t in threads:
            if (
                is_relevant(t["title"])
                and 2 <= t.get("comments", 0) <= 100
                and t["url"] not in existing_urls
            ):
                t["sub"] = sub
                all_threads.append(t)

        time.sleep(1)

    ws.close()

    print(f"\n{'=' * 60}")
    print(f"Found {len(all_threads)} new relevant threads")
    print(f"{'=' * 60}")

    # Generate replies for top threads
    new_replies = 0
    for i, thread in enumerate(all_threads[:15]):
        print(f"\n[{i + 1}/{min(len(all_threads), 15)}] {thread['title'][:50]}...")

        reply = generate_reply(thread["title"], platform="reddit")

        if reply:
            queue.append(
                {
                    "url": thread["url"],
                    "title": thread["title"],
                    "sub": thread["sub"],
                    "comments": thread["comments"],
                    "reply": reply,
                    "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
            new_replies += 1
            print(f"  OK: {reply[:60]}...")
        else:
            print("  FAIL")

        time.sleep(0.5)

    # Save updated queue
    save_queue(queue)

    print(f"\n{'=' * 60}")
    print("Summary:")
    print(f"  New replies generated: {new_replies}")
    print(f"  Total queue size: {len(queue)}")
    print(f"  Queue saved to: {QUEUE_FILE}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
