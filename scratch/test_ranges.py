import os
import sys
import django
from datetime import date, timedelta, datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db.models import Sum
from accounts.models import Revenue, Expense, JournalItem
from accounts.services import AccountsService
from sales.models import Sale

today = date.today()
print(f"Today's date is: {today}")

# Let's print out date filters from AccountsService
for dr in ['last_30_days', 'this_quarter', 'this_year']:
    start, end = AccountsService.get_date_filter(dr)
    print(f"Date filter '{dr}': {start} to {end}")

print("\n--- REVENUES ---")
# 1. Total revenue all time
print(f"Total Revenue all time (model): {Revenue.objects.aggregate(total=Sum('amount'))['total']}")

# 2. Total revenue filtered by date
for dr in ['last_30_days', 'this_quarter', 'this_year']:
    start, end = AccountsService.get_date_filter(dr)
    amt = Revenue.objects.filter(date__range=(start, end)).aggregate(total=Sum('amount'))['total']
    print(f"Revenue in model ({dr}): {amt}")

# 3. Total revenue from KPIs (JournalItems)
for dr in ['last_30_days', 'this_quarter', 'this_year']:
    kpis = AccountsService.get_kpis_with_growth(dr)
    print(f"Revenue in KPIs ({dr}): {kpis['total_revenue']}")

print("\n--- SALES ---")
# Let's print total sales
print(f"Total Sales all time: {Sale.objects.aggregate(total=Sum('total_price'))['total']}")
for dr in ['last_30_days', 'this_quarter', 'this_year']:
    start, end = AccountsService.get_date_filter(dr)
    amt = Sale.objects.filter(sale_date__range=(start, end)).aggregate(total=Sum('total_price'))['total']
    print(f"Sales in model ({dr}): {amt}")

print("\nLet's check if there are sales in last 30 days that aren't in this quarter/year, or vice versa.")
# Let's see the min/max dates of Sales and Revenues
print(f"Sale min date: {Sale.objects.order_by('sale_date').first().sale_date}")
print(f"Sale max date: {Sale.objects.order_by('-sale_date').first().sale_date}")
print(f"Revenue min date: {Revenue.objects.order_by('date').first().date}")
print(f"Revenue max date: {Revenue.objects.order_by('-date').first().date}")
