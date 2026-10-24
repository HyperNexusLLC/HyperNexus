import sqlite3, sys

db = r"C:\Users\hyper\workspace\HyperNexus\catalog.db"
conn = sqlite3.connect(db)
cur = conn.cursor()

cur.execute("PRAGMA table_info(published_mcp_servers)")
cols = [r[1] for r in cur.fetchall()]
print("cols:", cols)

cur.execute("SELECT COUNT(*) FROM published_mcp_servers")
print("total rows:", cur.fetchone()[0])

# Search for stripe/billing/checkout/payment in any text column
for term in ("stripe", "billing", "checkout", "payment", "github", "kubernetes"):
    q = f"SELECT COUNT(*) FROM published_mcp_servers WHERE " + " OR ".join(
        f"{c} LIKE ?" for c in cols if True
    )
    # simpler: check name/description columns if they exist
    pass

# Just dump names that match
name_col = "name" if "name" in cols else cols[0]
for term in ("stripe", "billing", "checkout", "payment"):
    cur.execute(f"SELECT {name_col} FROM published_mcp_servers WHERE {name_col} LIKE ?",
                (f"%{term}%",))
    rows = cur.fetchall()
    print(f"{term}: {len(rows)} matches -> {[r[0] for r in rows[:8]]}")

cur.execute(f"SELECT {name_col} FROM published_mcp_servers LIMIT 20")
print("sample names:", [r[0] for r in cur.fetchall()])

# Also check published_skills
cur.execute("SELECT COUNT(*) FROM published_skills")
print("published_skills rows:", cur.fetchone()[0])
