import os
import django
import sys
import pandas as pd
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product
from sales.models import Sale
from purchases.models import Purchase
from django.db.models import Sum

def detect_header_row(xls, sheet_name):
    raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)
    keywords = ['product id', 'category', 'sub-category', 'product name', 'sku', 'cost price', 'sale price', 'qty in hand', 'stock status']
    for idx, row in raw.iterrows():
        row_text = ' '.join(str(value).strip().lower() for value in row.fillna(''))
        if any(keyword in row_text for keyword in keywords):
            return idx
    return 0

xls = pd.ExcelFile('AlNoor_ERP_Dataset.xlsx')
header_row = detect_header_row(xls, 'Inventory')
df = pd.read_excel(xls, sheet_name='Inventory', header=header_row)
df.columns = [str(c).strip() for c in df.columns]

# Print all columns to verify
print("Excel columns:", list(df.columns))

# Match by SKU
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

print(f"Loaded target stocks for {len(target_stocks)} products from Excel.")

simulation_results = []
total_simulated_stock_value = Decimal('0.00')

for product in Product.objects.all():
    target_stock = target_stocks.get(product.sku, 0)
    
    # Get total sales for this product
    total_sales = Sale.objects.filter(product=product).aggregate(total=Sum('quantity_sold'))['total'] or 0
    
    # Get total purchases for this product (excluding opening_stock transactions)
    total_purchases = Purchase.objects.filter(product=product).aggregate(total=Sum('quantity_purchased'))['total'] or 0
    
    # Back-calculate opening stock:
    # Target = Opening + Purchases - Sales  =>  Opening = Target + Sales - Purchases
    simulated_opening_stock = target_stock + total_sales - total_purchases
    if simulated_opening_stock < 0:
        simulated_opening_stock = 0 # Cannot be negative
        
    final_calculated_stock = simulated_opening_stock + total_purchases - total_sales
    stock_value = Decimal(str(final_calculated_stock)) * product.cost_price
    total_simulated_stock_value += stock_value
    
    simulation_results.append({
        'name': product.name,
        'sku': product.sku,
        'target_stock_in_excel': target_stock,
        'total_sales_in_db': total_sales,
        'total_purchases_in_db': total_purchases,
        'simulated_opening_stock': simulated_opening_stock,
        'final_calculated_stock': final_calculated_stock,
        'cost_price': product.cost_price,
        'stock_value': stock_value
    })

# Print top 10 products by sales
simulation_results.sort(key=lambda x: x['total_sales_in_db'], reverse=True)
print("\n--- Simulation Results (Top 10 highest-selling products) ---")
for r in simulation_results[:10]:
    print(f"Product: {r['name']} ({r['sku']})")
    print(f"  Sales: {r['total_sales_in_db']} | Purchases: {r['total_purchases_in_db']} | Target in Excel: {r['target_stock_in_excel']}")
    print(f"  Calculated Opening Stock needed on Jan 1: {r['simulated_opening_stock']}")
    print(f"  resulting Current Stock: {r['final_calculated_stock']} (Value: Rs {r['stock_value']:,.2f})")

print(f"\nTotal Simulated Current Stock Value: Rs {total_simulated_stock_value:,.2f}")
xls.close()
