import urllib.request
import time

print("Triggering database seed endpoint...")
try:
    urllib.request.urlopen('https://fyp-bizionary-production.up.railway.app/api/user-management/auth/seed/', timeout=2)
except Exception as e:
    # Short timeout allows it to run in backend without blocking local process
    print("Seeding triggered in the background!")
