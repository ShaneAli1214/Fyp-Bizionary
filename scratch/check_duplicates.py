import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from sales.models import Sale

print("Sales with invoice_number:")
sales_with_inv = Sale.objects.exclude(invoice_number__isnull=True).exclude(invoice_number='')
print(f"Count: {sales_with_inv.count()}")
for s in sales_with_inv[:10]:
    print(f"  Sale {s.id}: Customer {s.customer_name}, Total {s.total_price}, Inv {s.invoice_number}")

print("\nSales matching invoice amounts:")
for amt in [125600.00, 50700.00, 31980.00]:
    matches = Sale.objects.filter(total_price=amt)
    print(f"Amount {amt}: {matches.count()} matches")
    for s in matches:
        print(f"  Sale {s.id}: Customer {s.customer_name}, Date {s.sale_date}, Inv {s.invoice_number}")
