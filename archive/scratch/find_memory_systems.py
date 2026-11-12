import sqlite3
import sys

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    conn = sqlite3.connect("tormentnexus.db")
    cursor = conn.cursor()
    
    query = """
    SELECT title, url, description 
    FROM links_backlog 
    WHERE title LIKE '%memory%' 
       OR title LIKE '%mem0%'
       OR title LIKE '%zep%'
       OR description LIKE '%memory%'
       OR description LIKE '%mem0%'
       OR description LIKE '%zep%'
    LIMIT 50
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    
    print(f"Found {len(rows)} memory related entries:")
    for i, row in enumerate(rows):
        print(f"{i+1}. Title: {row[0]}")
        print(f"   URL: {row[1]}")
        print(f"   Desc: {row[2][:200]}...")
        print("-" * 50)
        
    conn.close()

if __name__ == "__main__":
    main()
