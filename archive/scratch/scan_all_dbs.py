import sqlite3
import glob

db_files = glob.glob("bobbybookmarks/*.db") + glob.glob("*.db")
print("Found DB files:", db_files)

for db_path in db_files:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"\nDB: {db_path}")
    print("Tables:", tables)
    conn.close()
