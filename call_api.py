import requests
try:
    r = requests.get('http://127.0.0.1:8000/api/products/')
    print(r.status_code)
    try:
        data = r.json()
        print('len=', len(data))
        for p in data[:5]:
            print(p.get('sku'), p.get('name'), p.get('stock_quantity'))
    except Exception as e:
        print('response text:', r.text[:1000])
except Exception as e:
    print(f"Error: {e}")
