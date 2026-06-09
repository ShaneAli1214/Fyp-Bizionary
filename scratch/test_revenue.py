import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, Count
from sales.models import Sale

today = timezone.localdate()

def calc(label, start, end):
    agg = Sale.objects.filter(sale_date__gte=start, sale_date__lte=end).aggregate(
        revenue=Sum('total_price'), cnt=Count('id')
    )
    rev = (agg['revenue'] or Decimal('0')).quantize(Decimal('0.01'))
    tx = agg['cnt'] or 0
    print(f"{label}: Rs {rev}  ({tx} transactions)  | {start} -> {end}")

calc('Daily  ', today, today)
calc('Weekly ', today - timedelta(days=today.weekday()), today)
calc('Monthly', today.replace(day=1), today)
print("\nTotal (all time):", Sale.objects.aggregate(t=Sum('total_price'))['t'])
