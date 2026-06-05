import os
import sys
import django

# Add root folder to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from dashboard.views import sales_by_period, sales_performance

factory = APIRequestFactory()

print("--- TESTING sales_by_period ---")
for period in ['daily', 'weekly', 'last10Days', 'monthly']:
    request = factory.get(f'/api/dashboard/sales-by-period/?period={period}')
    response = sales_by_period(request)
    print(f"Period: {period}")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.data
        print(f"  periodLabel: {data.get('periodLabel')}")
        print(f"  dateContext: {data.get('dateContext')}")
        print(f"  totalSalesAmount: {data.get('totalSalesAmount')}")
        print(f"  totalProfit: {data.get('totalProfit')}")
        print(f"  totalQuantity: {data.get('totalQuantity')}")
        print(f"  chartData length: {len(data.get('chartData', []))}")
        if data.get('chartData'):
            print(f"  first chart point: {data['chartData'][0]}")
    else:
        print(f"  Error: {response.data}")
    print()

print("\n--- TESTING sales_performance with timeframe=30days ---")
request = factory.get('/api/dashboard/sales-performance/?period=daily&timeframe=30days')
response = sales_performance(request)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    data = response.data
    print(f"  Data points count: {len(data)}")
    if data:
        print(f"  First data point: {data[0]}")
        print(f"  Last data point: {data[-1]}")
else:
    print(f"  Error: {response.data}")
