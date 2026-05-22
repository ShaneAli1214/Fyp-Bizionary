import urllib.request, json, sys
url = 'http://127.0.0.1:8000/api/products/'
try:
    resp = urllib.request.urlopen(url, timeout=5)
    data = json.load(resp)
    if isinstance(data, dict) and 'count' in data:
        print('API count:', data.get('count'))
    elif isinstance(data, list):
        print('API count:', len(data))
    else:
        print('API response type:', type(data))
except Exception as e:
    print('Request failed:', e)
    sys.exit(1)
