import sqlite3

for path in (r"C:\Users\hyper\workspace\HyperNexus\hypernexus.db",
             r"C:\Users\hyper\workspace\HyperNexus\catalog.db"):
    print("=== " + path)
    try:
        c = sqlite3.connect("file:" + path.replace("\\", "/") + "?mode=ro", uri=True)
    except Exception as e:
        print("  open failed:", e)
        continue
    tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    print("  tables:", tables)
    for t in tables:
        try:
            n = c.execute("SELECT COUNT(*) FROM [" + t + "]").fetchone()[0]
            cols = [r[1] for r in c.execute("PRAGMA table_info([" + t + "])")]
            print("  ", t, "rows=", n, "cols=", cols[:12])
        except Exception as e:
            print("  ", t, "err:", e)
    c.close()
