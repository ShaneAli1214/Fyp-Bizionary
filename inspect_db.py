import sqlite3

conn = sqlite3.connect('db.sqlite3')
c = conn.cursor()

# Get all tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()

print("Tables in database:")
for table in tables:
    table_name = table[0]
    print(f"\n{table_name}:")
    try:
        # Get row count
        c.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = c.fetchone()[0]
        print(f"  Rows: {count}")
        if count > 0:
            # Get column names
            c.execute(f"PRAGMA table_info({table_name})")
            columns = c.fetchall()
            col_names = [col[1] for col in columns]
            print(f"  Columns: {', '.join(col_names)}")
            # Get first 3 rows
            c.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = c.fetchall()
            for row in rows:
                print(f"    {row}")
    except Exception as e:
        print(f"  Error: {e}")

conn.close()