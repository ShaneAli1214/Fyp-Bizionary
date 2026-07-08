import os
import sys
import django
from decimal import Decimal

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.models import UtilityBill, SalaryPayment, RecurringCost, Expense, CashTransaction, JournalEntry
from accounts.services import AccountsService

print("==================== DATABASE COUNTS ====================")
print("Utility Bills Count:    ", UtilityBill.objects.count())
print("Salary Payments Count:  ", SalaryPayment.objects.count())
print("Recurring Costs Count:  ", RecurringCost.objects.count())
print("Total Expenses Count:   ", Expense.objects.count())
print("Cash Transactions Count:", CashTransaction.objects.count())
print("Journal Entries Count:  ", JournalEntry.objects.count())

print("\n==================== DATA VALIDATION ====================")
# Test date filters
start_date = "2026-01-01"
end_date = "2026-12-31"
parsed_start, parsed_end = AccountsService.get_date_filter("custom", start_date, end_date)

print(f"Aggregating expenses for period: {parsed_start} to {parsed_end}")
breakdown = AccountsService.get_operating_expense_breakdown(parsed_start, parsed_end)
total_opex = AccountsService.get_expenses(parsed_start, parsed_end)

print("\nOperating Expenses Breakdown:")
sum_check = Decimal('0.00')
for item in breakdown:
    print(f"  Code: {item['code']} | Name: {item['name']} | Balance: {item['balance']}")
    sum_check += item['balance']

print(f"\nTotal OpEx Sum from breakdown: PKR {sum_check}")
print(f"Total OpEx Sum from get_expenses: PKR {total_opex}")

# Let's double check manually computed sum from the Excel sheets
# Grand total of the Excel sheet was 8,092,500
# But wait, does it equal our sum + existing supplies?
# Existing supplies sum was 14,680
# So expected sum is 8,092,500 + 14,680 = 8,107,180
print(f"Expected Sum (Excel Grand Total + Supplies): PKR 8107180.00")
print(f"Matches Expected: {sum_check == Decimal('8107180.00')}")
