import sqlite3

db = r"C:\Users\hyper\workspace\HyperNexus\catalog.db"
conn = sqlite3.connect(db)
cur = conn.cursor()

for term in ("stripe", "billing", "checkout", "payment", "github", "kubernetes", "deploy"):
    cur.execute(
        "SELECT display_name, description FROM published_mcp_servers "
        "WHERE display_name LIKE ? OR description LIKE ? LIMIT 5",
        (f"%{term}%", f"%{term}%"),
    )
    rows = cur.fetchall()
    print(f"{term}: {len(rows)} matches")
    for r in rows[:3]:
        print(f"    {r[0]} | {(r[1] or '')[:80]}")

cur.execute("SELECT display_name, description FROM published_mcp_servers LIMIT 12")
print("\nsample servers:")
for r in cur.fetchall():
    print(f"  {r[0]} | {(r[1] or '')[:70]}")

# Check if there is a tools table or tool-level data somewhere
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("\ntables:", [r[0] for r in cur.fetchall()])

cur.execute("SELECT COUNT(*) FROM links_backlog")
print("links_backlog:", cur.fetchone()[0])
