import os
import sys
import django
import time
from django.db.utils import OperationalError
from django.db.models.signals import post_delete

# Setup Django context
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db import transaction
from products.models import Product, InventoryTransaction, BulkProduct
from sales.models import Sale
from purchases.models import Purchase, OrderedSlip
from accounts.models import JournalEntry, JournalItem, Revenue, Expense

# Import the signal receiver functions to disconnect them
from accounts.signals import auto_delete_sale_ledger, auto_delete_ordered_slip_expense
from purchases.signals import purchase_post_delete, ordered_slip_post_delete

print("Disconnecting post_delete signals to prevent slow sequential cascades...")
post_delete.disconnect(auto_delete_sale_ledger, sender=Sale)
post_delete.disconnect(auto_delete_ordered_slip_expense, sender=OrderedSlip)
post_delete.disconnect(purchase_post_delete, sender=Purchase)
post_delete.disconnect(ordered_slip_post_delete, sender=OrderedSlip)

print("Starting ultra-fast optimized deletion of category 'Electronics & Appliances' data...")

target_category = 'Electronics & Appliances'
products = Product.objects.filter(category=target_category)
product_ids = list(products.values_list('id', flat=True))
print(f"Found {len(product_ids)} products in '{target_category}' category.")

if len(product_ids) == 0:
    print("No products found for this category.")
    sys.exit(0)

max_retries = 30
for attempt in range(max_retries):
    try:
        with transaction.atomic():
            # 2. Delete inventory transactions for these products
            it_count = InventoryTransaction.objects.filter(product_id__in=product_ids).delete()
            print(f"Deleted {it_count[0]} inventory transactions.")

            # 3. Identify and delete Sales and their JournalEntries / Revenues
            sales = Sale.objects.filter(product_id__in=product_ids)
            sale_ids = list(sales.values_list('id', flat=True))
            print(f"Found {len(sale_ids)} sales referencing these products.")
            
            # Batch delete journal entries and revenues for sales
            sale_refs = [f"SALE-{s_id}" for s_id in sale_ids]
            je_sale_deleted = JournalEntry.objects.filter(reference__in=sale_refs).delete()
            rev_sale_deleted = Revenue.objects.filter(source__in=sale_refs).delete()
            print(f"Deleted {je_sale_deleted[0]} sales journal entries and {rev_sale_deleted[0]} revenue entries.")
            
            sales_deleted = sales.delete()
            print(f"Deleted {sales_deleted[0]} sales records.")

            # 4. Identify and delete Purchases and their JournalEntries
            purchases = Purchase.objects.filter(product_id__in=product_ids)
            purchase_ids = list(purchases.values_list('id', flat=True))
            print(f"Found {len(purchase_ids)} purchases referencing these products.")
            
            # Batch delete journal entries for purchases
            purchase_refs = [f"PURCHASE-{p_id}" for p_id in purchase_ids]
            je_purch_deleted = JournalEntry.objects.filter(reference__in=purchase_refs).delete()
            print(f"Deleted {je_purch_deleted[0]} purchase journal entries.")
            
            purchases_deleted = purchases.delete()
            print(f"Deleted {purchases_deleted[0]} purchases records.")

            # 5. Identify and delete OrderedSlips and their Expenses
            slips = OrderedSlip.objects.filter(product_id__in=product_ids)
            slip_ids = list(slips.values_list('id', flat=True))
            print(f"Found {len(slip_ids)} ordered slips referencing these products.")
            
            for s_id in slip_ids:
                Expense.objects.filter(description__startswith=f"Ordered Slip #{s_id}").delete()
                
            slips_deleted = slips.delete()
            print(f"Deleted {slips_deleted[0]} ordered slips.")

            # 6. Delete BulkProducts staging records
            bp_deleted = BulkProduct.objects.filter(category=target_category).delete()
            print(f"Deleted {bp_deleted[0]} bulk product staging records.")

            # 7. Delete Products
            p_deleted = products.delete()
            print(f"Deleted {p_deleted[0]} product records.")
        break
    except OperationalError as e:
        if "locked" in str(e).lower() and attempt < max_retries - 1:
            print(f"Database is locked, retrying in 0.5s... (attempt {attempt + 1}/{max_retries})")
            time.sleep(0.5)
            continue
        raise e

print("Category 'Electronics & Appliances' data deletion completed successfully!")
