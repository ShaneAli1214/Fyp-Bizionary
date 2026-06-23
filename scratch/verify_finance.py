import os
import sys
import django
from decimal import Decimal

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from sales.models import Sale
from accounts.models import Expense, CashTransaction

# 1. Revenue
paid_sales = Sale.objects.filter(payment_status='PAID')
revenue = paid_sales.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')

# 2. COGS
cogs = paid_sales.aggregate(
    total=Sum(
        ExpressionWrapper(
            F('quantity_sold') * F('unit_cost_price'),
            output_field=DecimalField(max_digits=15, decimal_places=2)
        )
    )
)['total'] or Decimal('0.00')

# 3. Expenses
expenses = Expense.objects.filter(voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

# 4. Net Profit
gross_profit = revenue - cogs
net_profit = gross_profit - expenses

# 5. Cash Transactions
cash_in = CashTransaction.objects.filter(txn_type='IN').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
cash_out = CashTransaction.objects.filter(txn_type='OUT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

print(f"Revenue:       {revenue:,.2f}")
print(f"COGS:          {cogs:,.2f}")
print(f"Gross Profit:  {gross_profit:,.2f}")
print(f"Expenses:      {expenses:,.2f}")
print(f"Net Profit:    {net_profit:,.2f}")
print("---------------------------------")
print(f"Cash Inflow:   {cash_in:,.2f}")
print(f"Cash Outflow:  {cash_out:,.2f}")
print(f"Net Cash Flow (from CashTransaction Table): {cash_in - cash_out:,.2f}")
