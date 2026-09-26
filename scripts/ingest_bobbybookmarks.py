#!/usr/bin/env python3
"""
BobbyBookmarks Ingestion + Enrichment with MiMo v2.5
Processes incoming_resources.txt, deduplicates, fetches metadata, enriches with LLM
"""

import sqlite3
import json
import time
import re
import sys
import os
import urllib.request
import urllib.error
from urllib.parse import urlparse
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "atlas.db")
INPUT_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "incoming_resources.txt"
)
MIMO_URL = "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions"
MIMO_KEY = "tp-s0jae9p6m9d8pirs67549as0ewk9a1up0i1379o1kcg4u6r3"
MIMO_MODEL = "mimo-v2.5"

BORG_TAXONOMY = [
    "Agent Orchestration & Workflow",
    "Context Engineering & Isolation",
    "Memory & Persistence Architecture",
    "Interface & Developer UX",
    "Connectivity / MCP / A2A",
    "Infrastructure & Proxy Layers",
    "Guides & Industry Trends",
    "Coding Harness Tools",
    "AI Agents & Frameworks",
    "Search & Discovery",
    "Coding Tools & IDEs",
    "Developer Workflow & Tools",
    "Vector Databases & Embeddings",
    "Security & Red Teaming",
]


def call_mimo(prompt, max_tokens=800):
    """Call MiMo v2.5 API"""
    try:
        data = json.dumps(
            {
                "model": MIMO_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.3,
            }
        ).encode()

        req = urllib.request.Request(
            MIMO_URL,
            data=data,
            headers={
                "Authorization": f"Bearer {MIMO_KEY}",
                "Content-Type": "application/json",
            },
        )

        resp = urllib.request.urlopen(req, timeout=60)
        result = json.loads(resp.read())
        return result["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"  [!] MiMo error: {e}")
        return None


def normalize_url(u):
    nu = u.strip().rstrip("/").replace("http://", "https://")
    if nu.endswith("/"):
        nu = nu[:-1]
    return nu


def fetch_metadata(url):
    """Fetch basic metadata from URL"""
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0 (compatible; HyperNexusBot/1.0)"}
        )
        resp = urllib.request.urlopen(req, timeout=15)
        html = resp.read().decode("utf-8", errors="ignore")[:50000]

        title_match = re.search(
            r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL
        )
        title = title_match.group(1).strip() if title_match else ""

        desc_match = re.search(
            r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']',
            html,
            re.IGNORECASE,
        )
        if not desc_match:
            desc_match = re.search(
                r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']',
                html,
                re.IGNORECASE,
            )
        desc = desc_match.group(1).strip() if desc_match else ""

        return {"title": title[:200], "description": desc[:500]}
    except Exception as e:
        return {"title": "", "description": "", "error": str(e)}


def enrich_with_mimo(url, title, description):
    """Use MiMo v2.5 to categorize and enrich entry"""
    prompt = f"""Analyze this AI/developer tool resource and provide structured metadata.

URL: {url}
Title: {title}
Description: {description}

Respond in this EXACT format (one field per line, no extra text):
CATEGORY: [one of: {", ".join(BORG_TAXONOMY)}]
SHORT_DESCRIPTION: [1-2 sentence summary, max 150 chars]
LONG_DESCRIPTION: [3-5 sentence detailed summary]
MAIN_FEATURES: [comma-separated list of 3-5 key features]
INNOVATION_SCORE: [1-10 integer, 10=groundbreaking]
TAGS: [comma-separated tags, 3-5 items]"""

    result = call_mimo(prompt, max_tokens=600)
    if not result:
        return None

    fields = {}
    for line in result.split("\n"):
        line = line.strip()
        for field in [
            "CATEGORY",
            "SHORT_DESCRIPTION",
            "LONG_DESCRIPTION",
            "MAIN_FEATURES",
            "INNOVATION_SCORE",
            "TAGS",
        ]:
            if line.startswith(f"{field}:"):
                fields[field] = line[len(field) + 1 :].strip()
                break

    return fields


def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get existing URLs
    c.execute("SELECT url FROM entries")
    existing = set()
    for (u,) in c.fetchall():
        nu = normalize_url(u).lower().replace("www.", "")
        if "#" in nu:
            nu = nu.split("#")[0]
        existing.add(nu)

    print(f"Existing entries in DB: {len(existing)}")

    # Read incoming URLs
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw_urls = [line.strip() for line in f if line.strip()]

    print(f"URLs in incoming_resources.txt: {len(raw_urls)}")

    # Deduplicate
    seen = set()
    unique_urls = []
    for u in raw_urls:
        n = normalize_url(u).lower().replace("www.", "")
        if "#" in n:
            n = n.split("#")[0]
        if n not in seen and n not in existing:
            seen.add(n)
            unique_urls.append(u)

    print(f"New unique URLs to process: {len(unique_urls)}")

    if not unique_urls:
        print("Nothing to process!")
        conn.close()
        return

    # Process
    stats = {"processed": 0, "enriched": 0, "basic": 0, "errors": 0}

    for i, url in enumerate(unique_urls):
        print(f"\n[{i + 1}/{len(unique_urls)}] {url[:80]}...")

        # Fetch metadata
        meta = fetch_metadata(url)
        if "error" in meta:
            print(f"  [!] Fetch error: {meta['error'][:60]}")
            stats["errors"] += 1
            continue

        print(f"  Title: {meta['title'][:60]}")

        # Check if it's a GitHub repo
        is_github = 1 if "github.com" in url.lower() else 0
        owner = ""
        repo = ""
        if is_github:
            parts = urlparse(url).path.strip("/").split("/")
            if len(parts) >= 2:
                owner = parts[0]
                repo = parts[1]

        # Enrich with MiMo
        print("  Enriching with MiMo v2.5...")
        fields = enrich_with_mimo(url, meta["title"], meta["description"])

        if fields:
            innovation_raw = 5.0
            try:
                innovation_raw = float(fields.get("INNOVATION_SCORE", 5))
            except ValueError:
                pass

            try:
                c.execute(
                    """INSERT OR REPLACE INTO entries
                    (url, page_title, short_description, long_description, main_features,
                     tags, owner, repo, is_github, innovation_raw, innovation, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        url,
                        meta["title"],
                        fields.get("SHORT_DESCRIPTION", ""),
                        fields.get("LONG_DESCRIPTION", ""),
                        fields.get("MAIN_FEATURES", ""),
                        fields.get("TAGS", ""),
                        owner,
                        repo,
                        is_github,
                        innovation_raw,
                        innovation_raw,
                        datetime.now().isoformat(),
                    ),
                )
                conn.commit()
                stats["enriched"] += 1
                print(
                    f"  [OK] {fields.get('CATEGORY', 'N/A')} | Score: {innovation_raw}"
                )
            except Exception as e:
                print(f"  [!] DB error: {e}")
                stats["errors"] += 1
        else:
            # Save with basic metadata
            try:
                c.execute(
                    """INSERT OR REPLACE INTO entries
                    (url, page_title, owner, repo, is_github, innovation_raw, innovation, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        url,
                        meta["title"],
                        owner,
                        repo,
                        is_github,
                        5.0,
                        5.0,
                        datetime.now().isoformat(),
                    ),
                )
                conn.commit()
                stats["basic"] += 1
                print("  [~] Saved without enrichment")
            except Exception as e:
                print(f"  [!] DB error: {e}")
                stats["errors"] += 1

        stats["processed"] += 1
        time.sleep(1)  # Rate limit

    print(f"\n{'=' * 60}")
    print("Ingestion Complete!")
    print(f"  Processed: {stats['processed']}")
    print(f"  Enriched:  {stats['enriched']}")
    print(f"  Basic:     {stats['basic']}")
    print(f"  Errors:    {stats['errors']}")
    c.execute("SELECT COUNT(*) FROM entries")
    print(f"  Total DB:  {c.fetchone()[0]}")
    print(f"{'=' * 60}")

    conn.close()


if __name__ == "__main__":
    main()
