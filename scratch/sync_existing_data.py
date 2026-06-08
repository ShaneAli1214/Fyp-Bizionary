import os
import sys
import django

# Setup path and Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db import transaction
from sales.models import Sale
from purchases.models import Purchase, OrderedSlip
from invoices.models import Invoice as GlobalInvoice
from accounts.models import JournalEntry, JournalItem, Account, Revenue, Expense
from accounts.models import Invoice as AccountsInvoice
from accounts.services import AccountsService
from decimal import Decimal

def sync_data():
    print("=== SYNCHRONIZING HISTORICAL OPERATIONS DATA ===")
    
    # 1. Ensure COA structure
    AccountsService.ensure_coa()
    
    # 2. Count existing entries
    sales_count = Sale.objects.count()
    invoices_count = GlobalInvoice.objects.count()
    expenses_count = Expense.objects.count()
    print(f"Found {sales_count} sales, {invoices_count} invoices, and {expenses_count} expenses in database.")
    
    # We will wrap in atomic transaction for 100x speedup
    with transaction.atomic():
        # Clear all historical synced/manually created general ledger entries to rebuild a clean audit trail
        print("\nClearing previous general ledger entries, revenues, accounts invoices, and synced expenses...")
        JournalEntry.objects.all().delete()
        Revenue.objects.all().delete()
        AccountsInvoice.objects.all().delete()
        Expense.objects.filter(description__startswith="Ordered Slip #").delete()
        
        # Sync Sales
        print("\nSyncing Sales to Revenues & General Ledger...")
        cash_acct = Account.objects.get(code='1010')
        ar_acct = Account.objects.get(code='1200')
        sales_acct = Account.objects.get(code='4010')
        
        for idx, sale in enumerate(Sale.objects.all()):
            if sale.payment_status == 'FAILED':
                continue
                
            ref = f"SALE-{sale.id}"
            desc = f"Sales invoice for Sale #{sale.id} - {sale.customer_name}"
            
            # Create JournalEntry
            je = JournalEntry.objects.create(
                reference=ref,
                date=sale.sale_date,
                description=desc
            )
            
            # Create double entry ledger lines
            debit_acct = cash_acct if sale.payment_status == 'PAID' else ar_acct
            JournalItem.objects.create(journal_entry=je, account=debit_acct, debit=sale.total_price, credit=Decimal('0.00'))
            JournalItem.objects.create(journal_entry=je, account=sales_acct, debit=Decimal('0.00'), credit=sale.total_price)
            
            # Create Revenue record
            Revenue.objects.create(
                source=ref,
                customer=sale.customer_name,
                invoice_number=sale.invoice_number or ref,
                payment_status=sale.payment_status,
                category='SALES_REVENUE',
                amount=sale.total_price,
                date=sale.sale_date,
                description=desc,
                journal_entry=je
            )
            
            if (idx + 1) % 500 == 0 or idx == sales_count - 1:
                print(f"  Processed {idx + 1}/{sales_count} sales...")
                
        # Sync Invoices
        print("\nSyncing Global Invoices to Accounts Invoices & Ledger...")
        status_map = {
            'PAID': 'PAID',
            'UNPAID': 'PENDING',
            'PARTIALLY_PAID': 'PENDING',
            'OVERDUE': 'OVERDUE'
        }
        
        for idx, inv in enumerate(GlobalInvoice.objects.all()):
            mapped_status = status_map.get(inv.status, 'PENDING')
            
            # Create AccountsInvoice (triggers signals to post to ledger and create Revenue record)
            acc_invoice = AccountsInvoice.objects.create(
                invoice_number=inv.invoice_number,
                client_name=inv.customer_name,
                amount=inv.total_amount,
                balance_due=inv.balance_due,
                status=mapped_status,
                date=inv.invoice_date,
                due_date=inv.due_date,
                description=inv.notes or ''
            )
            print(f"  Synced Invoice: {inv.invoice_number}")

        # Sync Completed Ordered Slips
        print("\nSyncing Completed Ordered Slips to Expenses & General Ledger...")
        completed_slips = OrderedSlip.objects.filter(status='COMPLETED')
        for slip in completed_slips:
            slip.save()
            print(f"  Synced Completed Ordered Slip #{slip.id} - {slip.product.name} (Amount: {slip.total_cost})")

        # Sync Expenses
        print("\nSyncing Expenses to General Ledger...")
        for exp in Expense.objects.all():
            if not exp.journal_entry:
                AccountsService.post_expense_ledger(exp)
                print(f"  Synced Expense ID: {exp.id}")
            
    print("\nDATA SYNCHRONIZATION COMPLETED SUCCESSFULLY!")
    print(f"Synced {Revenue.objects.count()} revenues, {AccountsInvoice.objects.count()} invoices, and {Expense.objects.filter(journal_entry__isnull=False).count()} expenses to general ledger.")

if __name__ == '__main__':
    sync_data()
