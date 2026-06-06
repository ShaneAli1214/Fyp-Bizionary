import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.test import RequestFactory
from insights.views import (
    get_insights,
    get_live_insights,
    get_pricing_optimization,
    get_high_demand_items,
    get_inventory_warnings,
    get_live_nlp_report
)

factory = RequestFactory()

endpoints = {
    'insights/': get_insights,
    'insights/live/': get_live_insights,
    'insights/pricing/': get_pricing_optimization,
    'insights/demand-alerts/': get_high_demand_items,
    'insights/stock-warnings/': get_inventory_warnings,
    'insights/nlp-report/live/': get_live_nlp_report
}

for path, view in endpoints.items():
    print(f"\n--- Testing Endpoint: {path} ---")
    try:
        request = factory.get(f'/api/{path}')
        response = view(request)
        print("Status Code:", response.status_code)
        if response.status_code != 200:
            response.render()
            print("Content:", response.content.decode()[:500])
        else:
            print("Status is OK (200)")
    except Exception as e:
        print("Exception raised:", str(e))
