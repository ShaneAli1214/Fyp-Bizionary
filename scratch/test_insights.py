import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.test import RequestFactory
from insights.views import get_insights

factory = RequestFactory()
request = factory.get('/api/insights/')
response = get_insights(request)
print("Status Code:", response.status_code)
response.render()
print("Content:", response.content.decode())
