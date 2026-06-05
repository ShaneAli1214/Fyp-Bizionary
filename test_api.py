import requests
import json

api_base = 'http://127.0.0.1:8000/api/'

print('=== TESTING DASHBOARD API ENDPOINTS ===\n')

try:
    # Test KPIs
    print('Testing /api/dashboard/kpis/')
    resp = requests.get(f'{api_base}dashboard/kpis/', timeout=5)
    print(f'Status: {resp.status_code}')
    print(f'Response: {json.dumps(resp.json(), indent=2)}')
    
    print('\n' + '='*60 + '\n')
    
    # Test Recent Sales
    print('Testing /api/dashboard/recent-sales/')
    resp = requests.get(f'{api_base}dashboard/recent-sales/', timeout=5)
    print(f'Status: {resp.status_code}')
    data = resp.json()
    print(f'Raw response keys: {list(data.keys())}')
    if 'data' in data:
        print(f'Data count: {len(data["data"])}')
        if data['data']:
            print(f'First item: {json.dumps(data["data"][0], indent=2, default=str)}')
    else:
        print(f'Response: {json.dumps(data[:2], indent=2, default=str)}')
    
    print('\n' + '='*60 + '\n')
    
    # Test Sales Performance
    print('Testing /api/dashboard/sales-performance/?period=monthly')
    resp = requests.get(f'{api_base}dashboard/sales-performance/?period=monthly', timeout=5)
    print(f'Status: {resp.status_code}')
    data = resp.json()
    print(f'Raw response keys: {list(data.keys()) if isinstance(data, dict) else "list"}')
    print(f'Response: {json.dumps(data if isinstance(data, dict) else data[:2], indent=2, default=str)}')
    
    print('\n' + '='*60 + '\n')
    
    # Test Products
    print('Testing /api/products/')
    resp = requests.get(f'{api_base}products/', timeout=5)
    print(f'Status: {resp.status_code}')
    data = resp.json()
    print(f'Raw response keys: {list(data.keys()) if isinstance(data, dict) else "list"}')
    count = len(data.get('data', data)) if isinstance(data, dict) else len(data)
    print(f'Total products: {count}')
    
except Exception as e:
    import traceback
    print(f'Error: {e}')
    traceback.print_exc()

