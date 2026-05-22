import sqlite3
conn = sqlite3.connect('db.sqlite3')
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM sales")
count = c.fetchone()[0]
print(f"Sales table has {count} rows")
if count > 0:
    c.execute("SELECT * FROM sales LIMIT 3")
    rows = c.fetchall()
    print("First 3 rows:", rows)
conn.close()