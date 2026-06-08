import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.services import AccountsService

for dr in ['last_30_days', 'this_quarter', 'this_year']:
    print(f"\n=================== {dr.upper()} ===================")
    start, end = AccountsService.get_date_filter(dr)
    pl = AccountsService.get_profit_loss(start, end)
    print(f"Total Revenue: {pl['total_revenue']:,}")
    print(f"Total Expense: {pl['total_expense']:,}")
    print(f"Net Profit:    {pl['net_profit']:,}")
    print(f"Revenue Items: {pl['revenue']}")
    print(f"Expense Items: {pl['expense']}")
