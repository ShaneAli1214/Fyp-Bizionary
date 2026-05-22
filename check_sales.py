import sqlite3
conn = sqlite3.connect('db.sqlite3')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
sales_tables = [t[0] for t in tables if 'sales' in t[0]]
print("Sales tables:", sales_tables)
conn.close()