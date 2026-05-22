import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from sales.models import Sale
from products.models import Product
from django.utils import timezone
from datetime import timedelta

print("=" * 60)
print("DEBUG INSIGHTS FUNCTIONS:")
print("=" * 60)

# Test get_sales_data
thirty_days_ago = timezone.now() - timedelta(days=30)
sales = Sale.objects.filter(sale_date__gte=thirty_days_ago).values(
    'product', 'quantity_sold', 'total_price', 'unit_price', 'sale_date'
)
print(f"\nSales data query result: {sales.count()} records")

# Test product performance
products = Product.objects.all()
print(f"Total products: {products.count()}")

product_with_sales = 0
for product in products[:5]:
    sales_count = Sale.objects.filter(product=product).count()
    print(f"- {product.name}: {sales_count} sales")
    if sales_count > 0:
        product_with_sales += 1

print(f"\nProducts with sales: {product_with_sales}")

# Calculate totals
sales_list = list(sales)
total_revenue = sum(float(s.get('total_price', 0) or 0) for s in sales_list)
print(f"\nTotal revenue (30d): ₨{total_revenue:,.2f}")
print(f"Total sales (30d): {len(sales_list)}")

if sales_list:
    avg = total_revenue / len(sales_list)
    print(f"Average per sale: ₨{avg:,.2f}")

# Get hot products
print("\n" + "=" * 60)
print("HOT PRODUCTS (sales >= 10):")
print("=" * 60)

for product in products:
    sales_count = Sale.objects.filter(product=product).count()
    if sales_count >= 10:
        total_revenue_product = sum(
            float(s.total_price or 0)
            for s in Sale.objects.filter(product=product)
        )
        print(f"- {product.name}: {sales_count} sales, ₨{total_revenue_product:,.2f}")
