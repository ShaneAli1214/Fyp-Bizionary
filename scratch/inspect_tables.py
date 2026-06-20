import sqlite3
import os

db_path = 'db.sqlite3'
print(f"Checking database at: {os.path.abspath(db_path)}")
print(f"File size: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall()]

print("\nTables and row counts:")
for table in sorted(tables):
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"  {table}: {count} records")
    except Exception as e:
        print(f"  Error reading {table}: {e}")

conn.close()
