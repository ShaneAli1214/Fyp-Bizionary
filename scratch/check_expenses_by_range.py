import os
import sys
import django

sys.path.insert(0, "c:/Users/Dell/Desktop/Fyp")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.services import AccountsService

for dr in ['last_30_days', 'this_quarter', 'this_year', 'all_time']:
    kpi = AccountsService.get_kpis_with_growth(dr)
    print(f"Date Range: {dr}, Start: {kpi.get('start_date')}, End: {kpi.get('end_date')}")
    print(f"  Total Expense: {kpi.get('total_expense')}")
