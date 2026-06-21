import os
import sys
import random
from pathlib import Path
from datetime import date
from decimal import Decimal

import django

# Setup Django path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product
from sales.models import Sale

def seed_historical():
    products = list(Product.objects.filter(status='ACTIVE'))
    if not products:
        products = list(Product.objects.all())
    if not products:
        print("No products found to seed sales!")
        return

    customers = ["Ahmed Khan", "Fatima Ahmed", "Muhammad Hassan", "Sara Ali", "Bilal Siddiqui", "Zainab Malik", "Tariq Mahmood", "Aisha Umar"]
    payment_methods = ["CASH", "CARD", "BANK_TRANSFER"]
    
    # Months to seed: Jan, Feb, Mar, Apr of 2026
    months = [1, 2, 3, 4]
    year = 2026
    
    sales_created = 0
    
    for month in months:
        print(f"Seeding month: {month}/2026...")
        # We will generate about 18-25 sales per month
        num_sales = random.randint(18, 25)
        for i in range(num_sales):
            product = random.choice(products)
            customer = random.choice(customers)
            pm = random.choice(payment_methods)
            qty = random.randint(1, 8)
            day = random.randint(1, 28)
            
            sale_date = date(year, month, day)
            unit_price = product.unit_price
            total_price = unit_price * qty
            
            prefix = f"HISTORICAL-SEED-{year}-{month:02d}-"
            invoice_num = f"{prefix}{day:02d}-{product.sku}-{i}"
            
            # Check if invoice already exists
            if Sale.objects.filter(invoice_number=invoice_num).exists():
                continue
                
            Sale.objects.create(
                product=product,
                customer_name=customer,
                quantity_sold=qty,
                line_items=[{
                    'product': product.id,
                    'product_name': product.name,
                    'product_code': product.sku,
                    'quantity_sold': qty,
                    'unit_price': str(unit_price),
                    'total_price': str(total_price),
                }],
                unit_price=unit_price,
                total_price=total_price,
                discount=Decimal('0.00'),
                invoice_number=invoice_num,
                notes=f"Generated historical seed sales transaction for {month}/2026",
                payment_status='PAID',
                payment_method=pm,
                sale_date=sale_date
            )
            sales_created += 1
            
    print(f"Successfully seeded {sales_created} historical sales records for Jan-Apr 2026!")

if __name__ == '__main__':
    seed_historical()
