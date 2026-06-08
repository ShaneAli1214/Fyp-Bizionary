import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')

from django.conf import settings
# Override ALLOWED_HOSTS before django.setup()
settings.ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']

django.setup()

from django.test import Client
import json

c = Client()

for dr in ['last_30_days', 'this_quarter', 'this_year']:
    print(f"\nAPI GET /api/accounts/kpis/?date_range={dr}")
    response = c.get(f'/api/accounts/kpis/', {'date_range': dr})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.content.decode('utf-8')}")

for dr in ['last_30_days', 'this_quarter', 'this_year']:
    print(f"\nAPI GET /api/accounts/reports/profit-loss/?date_range={dr}")
    response = c.get(f'/api/accounts/reports/profit-loss/', {'date_range': dr})
    print(f"Status: {response.status_code}")
    # Show first 200 chars
    print(f"Response: {response.content.decode('utf-8')[:300]}...")

print("\nAPI GET /api/dashboard/sales-performance/?period=daily&timeframe=30days")
response = c.get('/api/dashboard/sales-performance/', {'period': 'daily', 'timeframe': '30days'})
print(f"Status: {response.status_code}")
data = json.loads(response.content.decode('utf-8'))
print(f"Number of days returned: {len(data)}")
print(f"First day: {data[0] if len(data) > 0 else 'N/A'}")
print(f"Last day: {data[-1] if len(data) > 0 else 'N/A'}")
print(f"Total sales in performance endpoint: {sum(float(day['revenue']) for day in data)}")

