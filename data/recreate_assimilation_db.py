#!/usr/bin/env python3
import sqlite3
import os

DB_PATH = "data/assimilation_state.db"

# Remove existing database files
for suffix in ["", "-shm", "-wal"]:
    try: os.remove(DB_PATH + suffix)
    except FileNotFoundError: pass

# Create fresh database with all columns that swarm expects
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute("""
CREATE TABLE IF NOT EXISTS mcp_servers (
    name TEXT PRIMARY KEY,
    package_name TEXT,
    description TEXT,
    version TEXT,
    status TEXT,
    added_at TEXT,
    implementation_notes TEXT,
    notes TEXT,
    gi TEXT,
    llm TEXT,
    tf TEXT,
    tf_capabilities TEXT,
    verification_status TEXT,
    test_status TEXT,
    web_search_count INTEGER,
    web_search_last_updated TEXT,
    github_url TEXT,
    source_repository TEXT,
    docs_url TEXT,
    pip_package TEXT,
    npm_package TEXT,
    docker_image TEXT,
    apt_package TEXT,
    score INTEGER,
    classification TEXT
)
""")
conn.commit()
conn.close()
print(f"✅ Recreated {DB_PATH} with full schema")
