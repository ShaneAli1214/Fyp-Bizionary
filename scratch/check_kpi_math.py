import os
import sys
import django
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.services import AccountsService
from accounts.models import JournalItem, JournalEntry, Revenue, Expense
from django.db.models import Sum

for dr in ['last_30_days', 'this_quarter', 'this_year']:
    print(f"\n=================== {dr.upper()} ===================")
    start, end = AccountsService.get_date_filter(dr)
    print(f"Date range: {start} to {end}")
    
    kpis = AccountsService.get_kpis_with_growth(dr)
    print(f"KPI Total Revenue: {kpis['total_revenue']:,}")
    print(f"KPI Total Expense: {kpis['total_expense']:,}")
    print(f"KPI Net Profit:    {kpis['net_profit']:,}")
    print(f"KPI Cash Flow:     {kpis['cash_flow']:,}")
    
    # Let's manually sum from JournalItem
    je_rev = JournalItem.objects.filter(
        account__account_type='REVENUE',
        journal_entry__voided=False,
        journal_entry__date__range=(start, end)
    )
    rev_cr = je_rev.aggregate(total=Sum('credit'))['total'] or Decimal('0')
    rev_dr = je_rev.aggregate(total=Sum('debit'))['total'] or Decimal('0')
    print(f"Ledger Rev (Cr - Dr): {(rev_cr - rev_dr):,}")
    
    je_exp = JournalItem.objects.filter(
        account__account_type='EXPENSE',
        journal_entry__voided=False,
        journal_entry__date__range=(start, end)
    )
    exp_cr = je_exp.aggregate(total=Sum('credit'))['total'] or Decimal('0')
    exp_dr = je_exp.aggregate(total=Sum('debit'))['total'] or Decimal('0')
    print(f"Ledger Exp (Dr - Cr): {(exp_dr - exp_cr):,}")
    
    # Let's sum from models
    model_rev = Revenue.objects.filter(
        voided=False,
        date__range=(start, end)
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    print(f"Model Rev: {model_rev:,}")
    
    model_exp = Expense.objects.filter(
        voided=False,
        date__range=(start, end)
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    print(f"Model Exp: {model_exp:,}")
