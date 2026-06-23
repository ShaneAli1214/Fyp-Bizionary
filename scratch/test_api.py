import urllib.request
import json

try:
    url = "http://127.0.0.1:8000/api/dashboard/kpis/"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("API response keys:")
        print(list(data.keys()))
        print("\nSelected finance fields:")
        for k in ['total_revenue', 'total_cogs', 'gross_profit', 'net_profit', 'net_cash_flow', 'prev_net_profit', 'prev_cash_flow']:
            print(f"  {k}: {data.get(k)}")
except Exception as e:
    print(f"Error fetching API: {e}")
