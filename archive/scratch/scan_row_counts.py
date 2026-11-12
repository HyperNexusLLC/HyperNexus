import sqlite3
import glob
import os

db_files = glob.glob("bobbybookmarks/*.db") + glob.glob("*.db")
print("Found DB files:", db_files)

for db_path in db_files:
    if not os.path.exists(db_path):
        continue
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"\nDB: {db_path}")
        for t in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {t}")
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"  Table {t}: {count} rows")
            except Exception as ex:
                pass
        conn.close()
    except Exception as e:
        print(f"Error reading {db_path}: {e}")
