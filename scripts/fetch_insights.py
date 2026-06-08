import urllib.request
import json

url = 'http://127.0.0.1:8000/api/insights/'
req = urllib.request.Request(url)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = resp.read().decode('utf-8')
        print('STATUS', resp.status)
        try:
            print(json.dumps(json.loads(body), indent=2))
        except Exception:
            print(body[:1000])
except Exception as e:
    print('ERROR', repr(e))
