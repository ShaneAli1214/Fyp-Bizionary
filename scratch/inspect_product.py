import os
import sys
import django

sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product

from sales.models import Sale
from datetime import date

try:
    count = Sale.objects.filter(sale_date__date__gte=date.today()).count()
    print(f"Success: {count}")
except Exception as e:
    print(f"Error: {e}")
