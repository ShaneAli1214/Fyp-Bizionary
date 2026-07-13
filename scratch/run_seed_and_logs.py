import time
import urllib.request
import json
import socket

print("Waiting 45 seconds for Railway build to finish...")
time.sleep(45)

print("Triggering database seeding...")
try:
    urllib.request.urlopen('https://fyp-bizionary-production.up.railway.app/api/user-management/auth/seed/', timeout=5)
except Exception as e:
    # Timeout is expected since loaddata takes time
    print(f"Trigger request completed (got expected timeout/response: {e})")

print("Waiting 15 seconds for data dump restoration to progress...")
time.sleep(15)

print("Fetching restoration status logs...")
try:
    res = urllib.request.urlopen('https://fyp-bizionary-production.up.railway.app/api/user-management/auth/seed-logs/')
    data = json.loads(res.read().decode('utf-8'))
    print("Logs:")
    for line in data.get('logs', []):
        print("  ", line)
except Exception as e:
    print("Error fetching logs:", e)
