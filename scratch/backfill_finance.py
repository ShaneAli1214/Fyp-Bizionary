import os
import sys
import django

# Add project root directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db import transaction
from sales.models import Sale
from purchases.models import Purchase, OrderedSlip
from invoices.models import Invoice as GlobalInvoice
from accounts.models import Revenue, Expense, JournalEntry, JournalItem
from accounts.models import Invoice as AccountsInvoice
from accounts.signals import (
    auto_post_sale_ledger,
    auto_post_purchase_ledger,
    auto_sync_invoice_ledger,
    auto_sync_ordered_slip_expense
)

print("Starting optimized finance data backfill...")

with transaction.atomic():
    # 1. Clear existing generated ledger/accounts records to avoid duplicate keys or items
    print("Clearing generated finance records...")
    Revenue.objects.all().delete()
    Expense.objects.all().delete()
    AccountsInvoice.objects.all().delete()
    JournalEntry.objects.all().delete()
    JournalItem.objects.all().delete()
    print("Cleared generated finance records.")

    # 2. Backfill Sales -> Revenues & Ledgers
    sales_count = Sale.objects.count()
    print(f"Syncing {sales_count} Sales to Revenues and Ledgers...")
    processed = 0
    for sale in Sale.objects.all():
        try:
            auto_post_sale_ledger(sender=Sale, instance=sale, created=True)
            processed += 1
        except Exception as e:
            print(f"  Error processing sale #{sale.id}: {e}")
    print(f"Successfully processed {processed} sales.")

    # 3. Backfill Purchases -> Ledgers
    purchases_count = Purchase.objects.count()
    print(f"Syncing {purchases_count} Purchases to Ledgers...")
    processed = 0
    for purchase in Purchase.objects.all():
        try:
            auto_post_purchase_ledger(sender=Purchase, instance=purchase, created=True)
            processed += 1
        except Exception as e:
            print(f"  Error processing purchase #{purchase.id}: {e}")
    print(f"Successfully processed {processed} purchases.")

    # 4. Backfill GlobalInvoices -> AccountsInvoices -> Revenues & Ledgers
    invoices_count = GlobalInvoice.objects.count()
    print(f"Syncing {invoices_count} Global Invoices to Accounts...")
    processed = 0
    for invoice in GlobalInvoice.objects.all():
        try:
            auto_sync_invoice_ledger(sender=GlobalInvoice, instance=invoice, created=True)
            processed += 1
        except Exception as e:
            print(f"  Error processing invoice #{invoice.id}: {e}")
    print(f"Successfully processed {processed} invoices.")

    # 5. Backfill OrderedSlips -> Expenses & Ledgers
    slips_count = OrderedSlip.objects.count()
    print(f"Syncing {slips_count} Ordered Slips to Expenses...")
    processed = 0
    for slip in OrderedSlip.objects.all():
        try:
            auto_sync_ordered_slip_expense(sender=OrderedSlip, instance=slip, created=True)
            processed += 1
        except Exception as e:
            print(f"  Error processing slip #{slip.id}: {e}")
    print(f"Successfully processed {processed} slips.")

print("\nBackfill Completed Successfully!")
print(f"Revenues generated: {Revenue.objects.count()}")
print(f"Expenses generated: {Expense.objects.count()}")
print(f"Invoices generated: {AccountsInvoice.objects.count()}")
print(f"Journal Entries generated: {JournalEntry.objects.count()}")
