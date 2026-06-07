import sqlite3
conn = sqlite3.connect('db.sqlite3')
c = conn.cursor()
tables = [t[0] for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
for table in sorted(tables):
    if any(k in table for k in ['sale', 'purchase', 'invoice', 'revenue', 'expense']):
        try:
            count = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"{table}: {count}")
        except Exception as e:
            print(f"{table}: error {e}")
conn.close()
