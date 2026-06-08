import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.models import Invoice as AccountsInvoice
from invoices.models import Invoice as GlobalInvoice
from accounts.models import JournalItem

print("--- AccountsInvoices ---")
for inv in AccountsInvoice.objects.all():
    print(f"AccountsInvoice {inv.invoice_number}: Client {inv.client_name}, Amount {inv.amount}, Balance Due {inv.balance_due}, Status {inv.status}")
    if inv.journal_entry:
        for item in inv.journal_entry.items.all():
            print(f"  Item: {item.account.code} ({item.account.name}), Dr {item.debit}, Cr {item.credit}")

print("\n--- GlobalInvoices ---")
for inv in GlobalInvoice.objects.all():
    print(f"GlobalInvoice {inv.invoice_number}: Customer {inv.customer_name}, Total {inv.total_amount}, Paid {inv.amount_paid}, Balance Due {inv.balance_due}, Status {inv.status}")
