import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from sales.models import Sale
from django.utils import timezone
from datetime import timedelta

print("=" * 60)
print("CHECKING SALES DATA:")
print("=" * 60)

# Get all sales
all_sales = Sale.objects.all()
print(f"Total sales in database: {all_sales.count()}")

if all_sales.exists():
    # Get min and max dates
    first_sale = all_sales.order_by('sale_date').first()
    last_sale = all_sales.order_by('-sale_date').first()
    
    print(f"Earliest sale date: {first_sale.sale_date}")
    print(f"Latest sale date: {last_sale.sale_date}")
    
    # Check sales in last 30 days
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_sales = Sale.objects.filter(sale_date__gte=thirty_days_ago)
    print(f"Sales in last 30 days: {recent_sales.count()}")
    
    # Check all-time sales
    print(f"All-time sales: {all_sales.count()}")
    
    # Get sample
    print("\nSample sales:")
    for sale in all_sales[:3]:
        print(f"- Date: {sale.sale_date}, Product: {sale.product.name}, "
              f"Qty: {sale.quantity_sold}, Price: {sale.total_price}")
