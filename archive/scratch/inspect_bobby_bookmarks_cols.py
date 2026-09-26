import sqlite3

db_path = r"c:\Users\hyper\workspace\tormentnexus\tormentnexus.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get columns of bobby_bookmarks
cursor.execute("PRAGMA table_info(bobby_bookmarks);")
print("bobby_bookmarks columns:")
for col in cursor.fetchall():
    print(col)

# Search for memory related bookmarks
cursor.execute("SELECT title, url, tags FROM bobby_bookmarks WHERE title LIKE '%memory%' OR url LIKE '%memory%' OR tags LIKE '%memory%' LIMIT 50;")
results = cursor.fetchall()
print(f"\nFound {len(results)} memory-related bookmarks:")
for r in results:
    print(f"Title: {r[0]}\nURL: {r[1]}\nTags: {r[2]}\n---")

conn.close()
