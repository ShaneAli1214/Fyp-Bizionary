import os
import sys
import django

sys.path.insert(0, "c:/Users/Dell/Desktop/Fyp")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from purchases.models import SupplierCompany, OrderedSlip, Purchase

print("Total SupplierCompany:", SupplierCompany.objects.count())
print("Total OrderedSlip:", OrderedSlip.objects.count())
print("Total Purchase:", Purchase.objects.count())
