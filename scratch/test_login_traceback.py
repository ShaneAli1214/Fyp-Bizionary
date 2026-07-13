import urllib.request
import json

req = urllib.request.Request(
    'https://fyp-bizionary-production.up.railway.app/api/user-management/auth/login/',
    data=json.dumps({'email': 'admin@bizionary.com', 'password': 'Bizionary123!'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

print("Sending request...")
try:
    res = urllib.request.urlopen(req)
    print("Response 200 OK:", res.read().decode('utf-8'))
except Exception as e:
    if hasattr(e, 'read'):
        print("Response Error:", e.read().decode('utf-8'))
    else:
        print("Exception:", e)
