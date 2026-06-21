import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta

# Set up Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.contrib.contenttypes.models import ContentType
from user_management.models import ERPUser
from accounts.models import Expense, SalaryPayment, UtilityBill, RecurringCost, CashTransaction, JournalEntry, JournalItem
from accounts.services import AccountsService


def test_expense_expansion():
    print("=" * 60)
    print("STARTING TEST: EXPENSE SYSTEM EXPANSION VERIFICATION")
    print("=" * 60)
    
    # 1. Fetch or create a test user
    employee = ERPUser.objects.first()
    if not employee:
        # Create a temp test user if none exists
        from user_management.models import Department, Role
        dept, _ = Department.objects.get_or_create(name="IT", code="IT")
        role, _ = Role.objects.get_or_create(name="Staff", level="STAFF")
        employee = ERPUser.objects.create_user(
            username="test_employee",
            email="test_emp@bizionary.com",
            password="testpassword123",
            role=role,
            department=dept
        )
    print(f"Using employee: {employee.username} (ID: {employee.id})")

    # 2. Test SalaryPayment - PENDING -> no Expense
    print("\n--- 2. Creating PENDING SalaryPayment ---")
    salary = SalaryPayment.objects.create(
        employee=employee,
        amount=Decimal("85000.00"),
        pay_period_start=date(2026, 6, 1),
        pay_period_end=date(2026, 6, 30),
        status='PENDING',
        payment_method='BANK_TRANSFER'
    )
    
    # Check that no Expense exists for this SalaryPayment
    ct_salary = ContentType.objects.get_for_model(salary)
    expenses = Expense.objects.filter(content_type=ct_salary, object_id=salary.id)
    assert not expenses.exists(), "Expense should not exist for a PENDING salary payment"
    print("  SUCCESS: No Expense created for PENDING status.")

    # 3. Test SalaryPayment - update to PAID -> creates Expense, Ledger, CashTransaction
    print("\n--- 3. Updating SalaryPayment to PAID ---")
    salary.status = 'PAID'
    salary.payment_date = date(2026, 6, 21)
    salary.save()

    # Check Expense creation
    expenses = Expense.objects.filter(content_type=ct_salary, object_id=salary.id)
    assert expenses.exists(), "Expense should be created automatically when status is PAID"
    expense = expenses.first()
    
    print(f"  Created Expense: {expense.id} | {expense.category} | Amount: Rs.{expense.amount}")
    assert expense.category == 'PAYROLL', "Expense category must be PAYROLL"
    assert expense.amount == salary.amount, "Expense amount must match salary amount"
    assert expense.date == salary.payment_date, "Expense date must match salary payment date"
    assert f"Employee: {employee.get_full_name() or employee.username}" in expense.vendor, "Vendor name should include employee details"
    assert expense.metadata is not None, "Expense should have structured metadata"
    assert expense.metadata['employee_username'] == employee.username, "Metadata username should match"
    
    # Check JournalEntry & double-entry posting
    assert expense.journal_entry is not None, "Expense must have posted a JournalEntry"
    journal_items = expense.journal_entry.items.all()
    assert journal_items.count() == 2, f"Double-entry journal should have 2 line items, found {journal_items.count()}"
    
    payroll_item = journal_items.filter(account__code='5030').first()
    cash_item = journal_items.filter(account__code='1010').first()
    
    assert payroll_item is not None and payroll_item.debit == salary.amount, "Payroll Account (5030) must be debited"
    assert cash_item is not None and cash_item.credit == salary.amount, "Cash Account (1010) must be credited"
    print("  SUCCESS: Double-entry ledger posted correctly (Debit Payroll, Credit Cash).")

    # Check CashTransaction outflow
    cash_txns = CashTransaction.objects.filter(source_type='expense', source_id=expense.id)
    assert cash_txns.exists(), "Cash outflow transaction should be generated"
    cash_txn = cash_txns.first()
    assert cash_txn.txn_type == CashTransaction.TYPE_OUT, "Cash transaction must be OUTFLOW (type: OUT)"
    assert cash_txn.amount == salary.amount, "Cash transaction amount must match"
    print("  SUCCESS: CashTransaction OUT record generated correctly.")

    # 4. Test SalaryPayment - update back to PENDING -> deletes Expense
    print("\n--- 4. Updating SalaryPayment back to PENDING ---")
    salary.status = 'PENDING'
    salary.save()
    
    expenses = Expense.objects.filter(content_type=ct_salary, object_id=salary.id)
    assert not expenses.exists(), "Expense should be deleted when salary payment goes back to PENDING"
    
    # Verify CashTransaction & Journal Entry deletion/cascading
    cash_txns = CashTransaction.objects.filter(source_type='expense', source_id=expense.id)
    assert not cash_txns.exists(), "CashTransaction must be removed when Expense is deleted"
    print("  SUCCESS: Expense and cash outflow removed correctly when status reverted to PENDING.")

    # 5. Test UtilityBill - creates Expense, Ledger, CashTransaction
    print("\n--- 5. Creating PAID UtilityBill ---")
    bill = UtilityBill.objects.create(
        utility_type='ELECTRICITY',
        bill_number='ELEC-2026-06',
        billing_period_start=date(2026, 5, 1),
        billing_period_end=date(2026, 5, 31),
        due_date=date(2026, 6, 15),
        amount=Decimal("18500.00"),
        tax_amount=Decimal("1500.00"),
        payment_date=date(2026, 6, 14),
        payment_method='CASH',
        status='PAID',
        notes='Office electricity bill for May'
    )
    
    ct_bill = ContentType.objects.get_for_model(bill)
    expenses = Expense.objects.filter(content_type=ct_bill, object_id=bill.id)
    assert expenses.exists(), "Expense should be created automatically for PAID UtilityBill"
    expense = expenses.first()
    
    print(f"  Created Expense: {expense.id} | {expense.category} | Amount: Rs.{expense.amount}")
    assert expense.category == 'RENT_UTILITIES', "Expense category must be RENT_UTILITIES"
    assert expense.amount == bill.amount, "Expense amount must match bill amount"
    assert expense.tax_amount == bill.tax_amount, "Expense tax amount must match bill tax_amount"
    assert expense.metadata['utility_type'] == 'ELECTRICITY', "Metadata utility_type should be ELECTRICITY"
    
    # Verify JournalEntry (Debit Rent & Utilities: base_amount, Debit Tax: tax_amount, Credit Cash: total_amount)
    journal_items = expense.journal_entry.items.all()
    assert journal_items.count() == 3, f"Journal entry should have 3 lines, found {journal_items.count()}"
    
    utilities_item = journal_items.filter(account__code='5050').first()
    tax_item = journal_items.filter(account__code='5100').first()
    cash_item = journal_items.filter(account__code='1010').first()
    
    assert utilities_item.debit == bill.amount - bill.tax_amount, "Utilities account debited with base amount"
    assert tax_item.debit == bill.tax_amount, "Tax account debited with tax amount"
    assert cash_item.credit == bill.amount, "Cash account credited with total amount"
    print("  SUCCESS: Double-entry ledger posted correctly with tax split (Debit Utilities, Debit Tax, Credit Cash).")

    # 6. Test RecurringCost - creates Expense
    print("\n--- 6. Creating PAID RecurringCost (Adobe Creative Cloud subscription) ---")
    subscription = RecurringCost.objects.create(
        cost_type='SUBSCRIPTION',
        name='Adobe Creative Cloud Suite',
        amount=Decimal("12500.00"),
        due_date=date(2026, 6, 20),
        payment_date=date(2026, 6, 20),
        payment_method='CREDIT_CARD',
        status='PAID'
    )
    
    ct_sub = ContentType.objects.get_for_model(subscription)
    expenses = Expense.objects.filter(content_type=ct_sub, object_id=subscription.id)
    assert expenses.exists(), "Expense should be created automatically for PAID RecurringCost"
    expense = expenses.first()
    
    print(f"  Created Expense: {expense.id} | {expense.category} | Amount: Rs.{expense.amount}")
    assert expense.category == 'TECHNOLOGY', "Expense category should map to TECHNOLOGY for SUBSCRIPTION cost_type"
    print("  SUCCESS: RecurringCost category mapping is correct.")

    # 7. Verify P&L and get_expenses dynamic aggregation
    print("\n--- 7. Verifying dynamic P&L and Expense Aggregates ---")
    
    # Save salary as paid to verify aggregate figures
    salary.status = 'PAID'
    salary.payment_date = date(2026, 6, 21)
    salary.save()
    
    total_exp = AccountsService.get_expenses(start_date=date(2026, 6, 1), end_date=date(2026, 6, 30))
    p_and_l = AccountsService.get_profit_loss(start_date=date(2026, 6, 1), end_date=date(2026, 6, 30))
    
    print(f"  Total Operating Expenses in June 2026: Rs.{total_exp}")
    print(f"  P&L Report total expense: Rs.{p_and_l['total_expense']}")
    
    # Ensure our added values are reflected in P&L report breakdown
    expense_lines = p_and_l['expense_lines']
    payroll_line = next((line for line in expense_lines if line['code'] == 'PAYROLL'), None)
    utilities_line = next((line for line in expense_lines if line['code'] == 'RENT_UTILITIES'), None)
    tech_line = next((line for line in expense_lines if line['code'] == 'TECHNOLOGY'), None)
    
    assert payroll_line and payroll_line['balance'] == float(salary.amount), "P&L Payroll total should reflect salary"
    assert utilities_line and utilities_line['balance'] == float(bill.amount), "P&L Rent & Utilities total should reflect electricity bill"
    assert tech_line and tech_line['balance'] == float(subscription.amount), "P&L Technology total should reflect subscription cost"
    
    print("  SUCCESS: AccountsService KPI & P&L Engine correctly aggregated all new expense categories.")

    # 8. Clean up
    print("\n--- 8. Cleaning up test records ---")
    salary.delete()
    bill.delete()
    subscription.delete()
    
    # If we created a temp test user, delete it too
    if employee.username == "test_employee":
        employee.delete()
        
    print("  SUCCESS: Cleaned up database records.")
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == '__main__':
    test_expense_expansion()
