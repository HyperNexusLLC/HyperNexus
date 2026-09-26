import sqlite3
import os

db_path = r"c:\Users\hyper\workspace\tormentnexus\tormentnexus.db"
print(f"Database size: {os.path.getsize(db_path)} bytes")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]
print(f"Total tables: {len(tables)}")
print("Tables list:", tables)
for table in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        count = cursor.fetchone()[0]
        print(f"- {table}: {count} rows")
    except Exception as e:
        print(f"- {table}: Error: {e}")
conn.close()
