import sqlite3
import os

db_path = "bobbybookmarks/tormentnexus.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Searching bobbybookmarks/tormentnexus.db links_backlog for memory systems...")
cursor.execute("""
    SELECT url, title, description, tags FROM links_backlog 
    WHERE (url LIKE '%memory%' OR title LIKE '%memory%' OR description LIKE '%memory%')
    LIMIT 30
""")
for i, row in enumerate(cursor.fetchall()):
    print(f"\n[{i+1}] {row[0]}")
    print(f"Title: {row[1]}")
    print(f"Description: {row[2]}")
    print(f"Tags: {row[3]}")

print("\n" + "="*50 + "\n")
print("Searching bobbybookmarks/tormentnexus.db imported_session_memories for memory systems...")
cursor.execute("""
    SELECT DISTINCT kind FROM imported_session_memories
""")
print("Kinds of imported session memories:", cursor.fetchall())

cursor.execute("""
    SELECT content, tags FROM imported_session_memories
    WHERE (content LIKE '%memory%' OR content LIKE '%mem%') AND (content LIKE '%system%' OR content LIKE '%arch%')
    LIMIT 10
""")
print("\nSample memory system descriptions:")
for row in cursor.fetchall():
    print(f"- {row[0][:300]} (Tags: {row[1]})")

conn.close()
