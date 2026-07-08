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
import time

print("Starting optimized finance data backfill in chunks...")

def run_chunk_with_retry(func, chunk, sender, extra_kwargs=None):
    if extra_kwargs is None:
        extra_kwargs = {}
    max_retries = 20
    for attempt in range(max_retries):
        try:
            with transaction.atomic():
                for item in chunk:
                    func(sender=sender, instance=item, **extra_kwargs)
            return True
        except Exception as e:
            if "locked" in str(e).lower() and attempt < max_retries - 1:
                time.sleep(0.3)
                continue
            raise e

# 1. Clear existing generated ledger/accounts records
with transaction.atomic():
    print("Clearing generated finance records...")
    Revenue.objects.all().delete()
    Expense.objects.all().delete()
    AccountsInvoice.objects.all().delete()
    JournalEntry.objects.all().delete()
    JournalItem.objects.all().delete()
    print("Cleared generated finance records.")

# 2. Backfill Sales -> Revenues & Ledgers in chunks
sales_qs = Sale.objects.all().order_by('id')
sales_count = sales_qs.count()
print(f"Syncing {sales_count} Sales to Revenues and Ledgers...")
processed = 0
chunk_size = 500
for i in range(0, sales_count, chunk_size):
    chunk = sales_qs[i:i+chunk_size]
    run_chunk_with_retry(auto_post_sale_ledger, chunk, Sale, {'created': True})
    processed += len(chunk)
    print(f"  Processed {processed}/{sales_count} sales...")

# 3. Backfill Purchases -> Ledgers in chunks
purchases_qs = Purchase.objects.all().order_by('id')
purchases_count = purchases_qs.count()
print(f"Syncing {purchases_count} Purchases to Ledgers...")
processed = 0
for i in range(0, purchases_count, chunk_size):
    chunk = purchases_qs[i:i+chunk_size]
    run_chunk_with_retry(auto_post_purchase_ledger, chunk, Purchase, {'created': True})
    processed += len(chunk)
    print(f"  Processed {processed}/{purchases_count} purchases...")

# 4. Backfill GlobalInvoices -> AccountsInvoices -> Revenues & Ledgers in chunks
invoices_qs = GlobalInvoice.objects.all().order_by('id')
invoices_count = invoices_qs.count()
print(f"Syncing {invoices_count} Global Invoices to Accounts...")
processed = 0
for i in range(0, invoices_count, chunk_size):
    chunk = invoices_qs[i:i+chunk_size]
    run_chunk_with_retry(auto_sync_invoice_ledger, chunk, GlobalInvoice, {'created': True})
    processed += len(chunk)
    print(f"  Processed {processed}/{invoices_count} invoices...")

# 5. Backfill OrderedSlips -> Expenses & Ledgers in chunks
slips_qs = OrderedSlip.objects.all().order_by('id')
slips_count = slips_qs.count()
print(f"Syncing {slips_count} Ordered Slips to Expenses...")
processed = 0
for i in range(0, slips_count, chunk_size):
    chunk = slips_qs[i:i+chunk_size]
    run_chunk_with_retry(auto_sync_ordered_slip_expense, chunk, OrderedSlip, {'created': True})
    processed += len(chunk)
    print(f"  Processed {processed}/{slips_count} slips...")

print("\nBackfill Completed Successfully!")
print(f"Revenues generated: {Revenue.objects.count()}")
print(f"Expenses generated: {Expense.objects.count()}")
print(f"Invoices generated: {AccountsInvoice.objects.count()}")
print(f"Journal Entries generated: {JournalEntry.objects.count()}")
