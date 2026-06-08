import os
import sys
import django
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db.models import Sum
from sales.models import Sale
from accounts.models import Revenue, JournalItem, Expense
from datetime import date, timedelta

# Let's count by day
start_date = date(2026, 5, 1)
end_date = date(2026, 6, 8)

print(f"{'Date':12} | {'Sales Total':15} | {'Revenue Total':15} | {'Ledger Revenue':15} | {'Expense Total':15} | {'Ledger Expense':15}")
print("-" * 90)

curr = start_date
while curr <= end_date:
    sales_sum = Sale.objects.filter(sale_date=curr).aggregate(total=Sum('total_price'))['total'] or Decimal('0')
    rev_sum = Revenue.objects.filter(date=curr, voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    led_rev_sum = JournalItem.objects.filter(
        account__account_type='REVENUE',
        journal_entry__date=curr,
        journal_entry__voided=False
    ).aggregate(total=Sum('credit'))['total'] or Decimal('0')
    
    exp_sum = Expense.objects.filter(date=curr, voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    led_exp_sum = JournalItem.objects.filter(
        account__account_type='EXPENSE',
        journal_entry__date=curr,
        journal_entry__voided=False
    ).aggregate(total=Sum('debit'))['total'] or Decimal('0')
    
    if sales_sum > 0 or rev_sum > 0 or led_rev_sum > 0 or exp_sum > 0 or led_exp_sum > 0:
        print(f"{curr.isoformat():12} | {sales_sum:15,.2f} | {rev_sum:15,.2f} | {led_rev_sum:15,.2f} | {exp_sum:15,.2f} | {led_exp_sum:15,.2f}")
    curr += timedelta(days=1)
