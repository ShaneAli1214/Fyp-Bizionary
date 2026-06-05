import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
import django
django.setup()

import pandas as pd
from decimal import Decimal
from products.models import Product

df = pd.read_excel('output/30day_sales_AlNoor_cleaned.xlsx', sheet_name='Sales Data', header=1)

db_prods = {p.sku: p for p in Product.objects.all()}

date_cols = [c for c in df.columns if '2026-05' in str(c)]
price_col = 'Sale Price (PKR)'
sku_col = 'SKU'

total_revenue_excel_price = Decimal('0.00')
total_revenue_db_price = Decimal('0.00')
total_qty = 0
not_found_skus = set()

def clean_decimal(val):
    if pd.isna(val) or val == '':
        return Decimal('0.00')
    val_str = str(val).replace(',', '').strip()
    try:
        return Decimal(val_str)
    except Exception:
        return Decimal('0.00')

for idx, row in df.iterrows():
    sku = str(row[sku_col]).strip()
    if not sku or sku.lower() == 'nan':
        continue
    
    excel_price = clean_decimal(row[price_col])
    db_price = Decimal('0.00')
    if sku in db_prods:
        db_price = Decimal(str(db_prods[sku].unit_price))
    else:
        not_found_skus.add(sku)
        
    for col in date_cols:
        qty_val = row[col]
        if not pd.isna(qty_val):
            try:
                qty = int(float(qty_val))
            except Exception:
                qty = 0
            if qty > 0:
                total_qty += qty
                total_revenue_excel_price += excel_price * Decimal(qty)
                total_revenue_db_price += db_price * Decimal(qty)

print("=" * 60)
print("COMPARING EXCEL SALES CALCULATIONS:")
print("=" * 60)
print(f"Total Quantity Sold: {total_qty}")
print(f"Total Revenue using Excel Price: {total_revenue_excel_price:,.2f}")
print(f"Total Revenue using Database Product Price: {total_revenue_db_price:,.2f}")
print(f"Not found SKUs count: {len(not_found_skus)}")
if not_found_skus:
    print(f"Sample not found SKUs: {list(not_found_skus)[:5]}")
