import os
import django
import sys
from django.db.models import Q

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product, InventoryTransaction
from sales.models import Sale

print("--- Calculating Historical Remaining Stock for Kenwood Blender Sales ---")

product = Product.objects.filter(name__icontains='Kenwood Blender').first()
if not product:
    print("Product not found!")
    sys.exit(1)

print(f"Product: {product.name} (SKU: {product.sku})")
print(f"Current Live Stock Today: {product.stock_quantity}")

# Get sales in chronological order
sales = Sale.objects.filter(product=product).order_by('sale_date', 'id')
print(f"Found {sales.count()} sales.")

for sale in sales:
    # Find the corresponding inventory transaction
    sale_txn = InventoryTransaction.objects.filter(
        product=product,
        reference_type='sale',
        reference_id=sale.id
    ).first()
    
    if not sale_txn:
        print(f"  Sale #{sale.id} on {sale.sale_date}: Qty {sale.quantity_sold} | No inventory txn found!")
        continue
        
    # Sum up all transactions up to this transaction
    prev_txns = InventoryTransaction.objects.filter(
        product=product
    ).filter(
        Q(date__lt=sale_txn.date) | Q(date=sale_txn.date, id__lte=sale_txn.id)
    )
    
    balance = 0
    for t in prev_txns:
        if t.txn_type == 'IN':
            balance += t.quantity
        else:
            balance -= t.quantity
            
    print(f"  Sale #{sale.id} on {sale.sale_date} | Sold Qty: {sale.quantity_sold} | Stock level after this sale: {balance}")
