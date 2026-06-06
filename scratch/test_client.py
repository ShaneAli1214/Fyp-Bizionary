import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.test import Client

client = Client()

endpoints = [
    'insights/',
    'insights/live/',
    'insights/pricing/',
    'insights/demand-alerts/',
    'insights/stock-warnings/',
    'insights/nlp-report/live/'
]

for path in endpoints:
    url = f'/api/{path}'
    print(f"\n--- GET {url} ---")
    try:
        # Pass HTTP_HOST='127.0.0.1' to pass ALLOWED_HOSTS validation
        response = client.get(url, HTTP_HOST='127.0.0.1')
        print("Status Code:", response.status_code)
        print("Content-Type:", response.get('Content-Type', ''))
        content = response.content.decode()
        print("Content (first 200 chars):", content[:200])
    except Exception as e:
        print("Exception raised:", str(e))
