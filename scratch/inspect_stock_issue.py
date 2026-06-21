import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product, InventoryTransaction
from sales.models import Sale
from purchases.models import Purchase, OrderedSlip
from django.db.models import Count, Sum

print("--- Database Record Counts ---")
print(f"Total Products: {Product.objects.count()}")
print(f"Total Sales: {Sale.objects.count()}")
print(f"Total Purchases: {Purchase.objects.count()}")
print(f"Total OrderedSlips: {OrderedSlip.objects.count()}")

print("\n--- InventoryTransactions by Reference Type ---")
txns_by_ref = InventoryTransaction.objects.values('reference_type', 'txn_type').annotate(
    count=Count('id'),
    total_qty=Sum('quantity')
)
for group in txns_by_ref:
    print(f"Ref Type: {group['reference_type']} | Txn Type: {group['txn_type']} | Count: {group['count']} | Total Qty: {group['total_qty']}")

print("\n--- Top 10 Products by Purchase Count ---")
p_counts = Product.objects.annotate(
    purchase_count=Count('purchases'),
    ordered_slip_count=Count('ordered_slips')
).order_by('-purchase_count')
for p in p_counts[:10]:
    print(f"  - {p.name} ({p.sku}): stock={p.stock_quantity}, Purchases={p.purchase_count}, OrderedSlips={p.ordered_slip_count}")
