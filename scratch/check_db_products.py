import os
import sys
import django

sys.path.insert(0, "c:/Users/Dell/Desktop/Fyp")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product
from django.db.models import Count

print("=== Categories in Product DB ===")
cats = Product.objects.values('category').annotate(count=Count('id'))
for c in cats:
    print(f"Category: {c['category']}, Count: {c['count']}")
