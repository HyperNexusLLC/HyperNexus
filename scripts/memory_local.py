#!/usr/bin/env python3
"""
Local Memory Storage for HyperNexus
Stores memories in .tormentnexus/agent_memory/memories.json

This script provides local memory storage for development and offline use.
For production, use the server API: POST /api/memory/facts/add

Usage:
  python scripts/memory_local.py store "Title" "Content" "tag1,tag2"
  python scripts/memory_local.py search "query" [limit]
  python scripts/memory_local.py list [limit]

Dual Storage Strategy:
  Memories should be stored BOTH locally AND on the server.
  Local: python scripts/memory_local.py store ...
  Server: curl -X POST http://localhost:7778/api/memory/facts/add ...
"""

import json
import sys
import hashlib
from datetime import datetime, timezone
from pathlib import Path

MEMORY_FILE = (
    Path(__file__).parent.parent
    / ".tormentnexus"
    / "agent_memory"
    / "memories.json"
)


def load_memories():
    """Load memories from file."""
    if not MEMORY_FILE.exists():
        return {
            "version": 1,
            "savedAt": datetime.now(timezone.utc).isoformat(),
            "memories": [],
        }

    try:
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {
            "version": 1,
            "savedAt": datetime.now(timezone.utc).isoformat(),
            "memories": [],
        }


def save_memories(data):
    """Save memories to file."""
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    data["savedAt"] = datetime.now(timezone.utc).isoformat()

    try:
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except IOError as e:
        print(f"Error saving memories: {e}")
        raise


def generate_id(content):
    """Generate a unique ID for a memory."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def add_memory(title, content, tags=None, namespace="project", memory_type="fact"):
    """Add a new memory."""
    data = load_memories()

    memory_id = generate_id(content)
    now = datetime.now(timezone.utc).isoformat()

    memory = {
        "id": memory_id,
        "content": content,
        "type": "working",
        "namespace": namespace,
        "metadata": {
            "memoryKind": memory_type,
            "source": "local_script",
            "tags": tags or [],
            "title": title,
        },
        "createdAt": now,
        "accessedAt": now,
        "accessCount": 0,
        "ttl": None,
    }

    # Check if memory already exists
    for existing in data["memories"]:
        if existing["id"] == memory_id:
            print(f"Memory already exists with ID: {memory_id}")
            return memory_id

    data["memories"].append(memory)
    save_memories(data)

    print(f"Memory stored with ID: {memory_id}")
    return memory_id


def search_memories(query, limit=10):
    """Search memories by content."""
    data = load_memories()

    results = []
    query_lower = query.lower()

    for memory in data["memories"]:
        content = memory.get("content", "").lower()
        title = memory.get("metadata", {}).get("title", "").lower()
        tags = [t.lower() for t in memory.get("metadata", {}).get("tags", [])]

        if (
            query_lower in content
            or query_lower in title
            or any(query_lower in tag for tag in tags)
        ):
            results.append(memory)

    # Sort by creation date (newest first)
    results.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

    return results[:limit]


def list_memories(limit=20):
    """List all memories."""
    data = load_memories()

    memories = data.get("memories", [])
    memories.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

    return memories[:limit]


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python memory_local.py store <title> <content> [tags]")
        print("  python memory_local.py search <query> [limit]")
        print("  python memory_local.py list [limit]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "store":
        if len(sys.argv) < 4:
            print("Usage: python memory_local.py store <title> <content> [tags]")
            sys.exit(1)

        title = sys.argv[2]
        content = sys.argv[3]
        tags = sys.argv[4].split(",") if len(sys.argv) > 4 else []

        add_memory(title, content, tags)

    elif command == "search":
        if len(sys.argv) < 3:
            print("Usage: python memory_local.py search <query> [limit]")
            sys.exit(1)

        query = sys.argv[2]
        try:
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        except ValueError:
            limit = 10

        results = search_memories(query, limit)
        print(f"Found {len(results)} memories:")
        for memory in results:
            title = memory.get("metadata", {}).get("title", "Untitled")
            content = memory.get("content", "")[:80]
            print(f"  - {title}: {content}...")

    elif command == "list":
        try:
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        except ValueError:
            limit = 20

        memories = list_memories(limit)
        print(f"Listing {len(memories)} memories:")
        for memory in memories:
            title = memory.get("metadata", {}).get("title", "Untitled")
            content = memory.get("content", "")[:80]
            print(f"  - {title}: {content}...")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
