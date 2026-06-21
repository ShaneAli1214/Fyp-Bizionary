import os
import django
import sys
from decimal import Decimal
from datetime import date

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product, InventoryTransaction
from sales.models import Sale

print("--- Testing Sale Stock Decrement ---")

# Let's find Kenwood Blender
try:
    product = Product.objects.filter(name__icontains='Kenwood Blender').first()
    if not product:
        product = Product.objects.all().first()
    
    print(f"Product: {product.name} (SKU: {product.sku})")
    print(f"  Current stock before new sale: {product.stock_quantity}")
    
    # Create a test sale
    print("  Creating a test sale of 2 units...")
    sale = Sale.objects.create(
        product=product,
        customer_name="Test Customer",
        quantity_sold=2,
        unit_price=product.unit_price,
        total_price=product.unit_price * 2,
        payment_status='PAID',
        payment_method='CASH',
        sale_date=date.today(),
        notes="Test stock decrement"
    )
    
    # Reload product from DB
    product.refresh_from_db()
    print(f"  Current stock after new sale: {product.stock_quantity}")
    
    # Verify inventory transaction
    txn = InventoryTransaction.objects.filter(reference_type='sale', reference_id=sale.id).first()
    if txn:
        print(f"  Created InventoryTransaction: {txn.txn_type} {txn.quantity} (Note: {txn.note})")
    else:
        print("  WARNING: No InventoryTransaction created for this sale!")
        
    # Clean up test sale
    sale.delete()
    product.refresh_from_db()
    print(f"  Current stock after deleting test sale: {product.stock_quantity}")

except Exception as e:
    print(f"Error: {e}")
