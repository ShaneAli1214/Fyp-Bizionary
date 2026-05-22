import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from sales.models import Sale
from django.utils import timezone
from datetime import timedelta

print("=" * 70)
print("CHECKING MOST RECENT SALES:")
print("=" * 70)

# Get the most recent sales
recent_sales = Sale.objects.order_by('-created_at')[:10]

print(f"Total sales in database: {Sale.objects.count()}")
print(f"\nMost recent 10 sales:")

for i, sale in enumerate(recent_sales, 1):
    print(f"\n{i}. {sale.product.name}")
    print(f"   Quantity: {sale.quantity_sold}")
    print(f"   Total Price: ₨{sale.total_price}")
    print(f"   Sale Date: {sale.sale_date}")
    print(f"   Created: {sale.created_at}")
    print(f"   Payment Status: {sale.payment_status}")

# Check today's sales
print("\n" + "=" * 70)
print("TODAY'S SALES:")
print("=" * 70)

today = timezone.now().date()
today_sales = Sale.objects.filter(sale_date=today)
print(f"Sales today: {today_sales.count()}")

if today_sales.exists():
    total_today = sum(s.total_price for s in today_sales)
    print(f"Total revenue today: ₨{total_today:,.2f}")
    print("\nToday's sales:")
    for sale in today_sales[:5]:
        print(f"- {sale.product.name}: {sale.quantity_sold} units @ ₨{sale.total_price}")
