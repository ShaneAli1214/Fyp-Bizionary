import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'erp_system.settings'
import django
django.setup()
from django.test.client import RequestFactory
from insights.views import get_insights
rf = RequestFactory()
resp = get_insights(rf.get('/api/insights/'))
print('STATUS', getattr(resp, 'status_code', 'no-status'))
try:
    data = resp.data
except Exception:
    data = getattr(resp, 'content', str(resp))
print(data)
