import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from sales.models import Sale
from products.models import Product
from django.utils import timezone
from datetime import timedelta

print("=" * 60)
print("PRICING SUGGESTIONS DEBUG:")
print("=" * 60)

thirty_days_ago = timezone.now() - timedelta(days=30)
products = Product.objects.all()

pricing_suggestions = []
for product in products:
    recent_sales = Sale.objects.filter(
        product=product,
        sale_date__gte=thirty_days_ago
    ).values('unit_price', 'quantity_sold', 'total_price')
    
    if recent_sales.exists():
        sales_list = list(recent_sales)
        sales_count = len(sales_list)
        avg_price = sum(float(s['unit_price']) for s in sales_list) / len(sales_list)
        
        if sales_count >= 10:
            current_unit_price = float(product.unit_price or avg_price)
            suggested_price = current_unit_price * 1.1
            potential_increase = suggested_price * sales_count - sum(float(s['total_price']) for s in sales_list)
            
            pricing_suggestions.append({
                'product_id': product.id,
                'product_name': product.name,
                'sales': sales_count,
                'increase': round(potential_increase, 2),
            })

print(f"Products with 10+ sales in 30 days: {len(pricing_suggestions)}")
for p in pricing_suggestions[:5]:
    print(f"- {p['product_name']}: {p['sales']} sales, Potential increase: ₨{p['increase']}")

print("\n" + "=" * 60)
print("DEMAND ALERTS DEBUG:")
print("=" * 60)

seven_days_ago = timezone.now() - timedelta(days=7)

demand_count = 0
for product in products:
    sales_30d = Sale.objects.filter(
        product=product,
        sale_date__gte=thirty_days_ago
    ).count()
    sales_7d = Sale.objects.filter(
        product=product,
        sale_date__gte=seven_days_ago
    ).count()
    
    if sales_30d >= 15 or (sales_7d > sales_30d * 0.5 and sales_30d >= 10):
        demand_count += 1
        if demand_count <= 5:
            print(f"- {product.name}: 30d={sales_30d}, 7d={sales_7d}")

print(f"Total products with high demand: {demand_count}")

print("\n" + "=" * 60)
print("STOCK WARNINGS DEBUG:")
print("=" * 60)

warnings_count = 0
for product in products:
    stock_level = getattr(product, 'stock_quantity', 0)
    reorder_level = getattr(product, 'reorder_level', 10)
    
    if stock_level <= reorder_level:
        warnings_count += 1
        if warnings_count <= 5:
            print(f"- {product.name}: {stock_level}/{reorder_level}")

print(f"Total products needing restock: {warnings_count}")
