import os
import django
import sys
import pandas as pd
from decimal import Decimal
from datetime import date

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product, InventoryTransaction
from sales.models import Sale
from purchases.models import Purchase
from django.db import transaction, connection
from django.db.models import Sum

def detect_header_row(xls, sheet_name):
    raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)
    keywords = ['product id', 'category', 'sub-category', 'product name', 'sku', 'cost price', 'sale price', 'qty in hand', 'stock status']
    for idx, row in raw.iterrows():
        row_text = ' '.join(str(value).strip().lower() for value in row.fillna(''))
        if any(keyword in row_text for keyword in keywords):
            return idx
    return 0

def main():
    print("=" * 60)
    print("FIXING OPENING STOCK AND STOCK QUANTITIES")
    print("=" * 60)
    
    # 1. Read Excel target stocks
    xls = pd.ExcelFile('AlNoor_ERP_Dataset.xlsx')
    header_row = detect_header_row(xls, 'Inventory')
    df = pd.read_excel(xls, sheet_name='Inventory', header=header_row)
    df.columns = [str(c).strip() for c in df.columns]

    sku_col = [c for c in df.columns if c.strip().lower() == 'sku'][0]
    qty_col = [c for c in df.columns if 'Qty in Hand' in c or 'Quantity' in c or 'Stock' in c or 'hand' in c.lower()][0]

    target_stocks = {}
    for _, row in df.iterrows():
        sku = str(row.get(sku_col, '')).strip()
        qty = row.get(qty_col, 0)
        if sku and sku.lower() != 'nan':
            try:
                target_stocks[sku] = int(float(qty))
            except:
                target_stocks[sku] = 0
                
    xls.close()
    print(f"Loaded target stocks for {len(target_stocks)} products from Excel.")
    
    # 2. Database transaction to apply the fix
    with transaction.atomic():
        # Clear existing opening stock transactions
        deleted_count, _ = InventoryTransaction.objects.filter(reference_type='opening_stock').delete()
        print(f"Cleared {deleted_count} existing opening_stock transactions.")
        
        # Reset cached stock quantities to 0
        Product.objects.all().update(stock_quantity=0)
        print("Reset cached stock quantities to 0.")
        
        created_txns = []
        jan_1_2026 = date(2026, 1, 1)
        
        for product in Product.objects.all():
            target_stock = target_stocks.get(product.sku, 0)
            
            # Get total sales
            total_sales = Sale.objects.filter(product=product).aggregate(total=Sum('quantity_sold'))['total'] or 0
            
            # Get total purchases (excluding opening stock)
            total_purchases = Purchase.objects.filter(product=product).aggregate(total=Sum('quantity_purchased'))['total'] or 0
            
            # Calculate required opening stock
            opening_qty = target_stock + total_sales - total_purchases
            if opening_qty < 0:
                opening_qty = 0
                
            # Create opening stock transaction
            created_txns.append(InventoryTransaction(
                product=product,
                txn_type=InventoryTransaction.TYPE_IN,
                quantity=opening_qty,
                reference_type='opening_stock',
                reference_id=product.id,
                note=f'Back-calculated opening stock for {product.name}',
                date=jan_1_2026
            ))
            
            # Set the product's final stock quantity field to the calculated current stock
            # (which will be target_stock, or at least 0 if target_stock is invalid)
            final_stock = opening_qty + total_purchases - total_sales
            Product.objects.filter(pk=product.pk).update(stock_quantity=final_stock)
            
        # Bulk create the new opening stock transactions
        InventoryTransaction.objects.bulk_create(created_txns)
        print(f"Successfully created {len(created_txns)} new opening stock transactions as of 2026-01-01.")
        
    print("\nDatabase stock fix applied successfully!")
    
    # Verification print
    print("\n--- Verification of Top 5 Products ---")
    for p in Product.objects.all().order_by('-stock_quantity')[:5]:
         print(f"  Product: {p.name:30} | Current Stock: {p.stock_quantity}")
         
    total_val = sum(p.stock_quantity * p.cost_price for p in Product.objects.all())
    print(f"\nFinal Total Stock Value in DB: Rs {total_val:,.2f}")

if __name__ == '__main__':
    main()
