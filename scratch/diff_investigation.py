import os
import sys
import django
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db.models import Sum
from accounts.models import Revenue, JournalItem, JournalEntry

# Let's inspect JournalItems of type REVENUE vs Revenue model entries
rev_sum = Revenue.objects.filter(voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0')
print(f"Total Active Revenues: {rev_sum}")

ji_sum = JournalItem.objects.filter(
    account__account_type='REVENUE',
    journal_entry__voided=False
).aggregate(total=Sum('credit'))['total'] or Decimal('0')
print(f"Total REVENUE JournalItem Credit: {ji_sum}")

print(f"Difference: {ji_sum - rev_sum}")

# Let's print out what is in JournalItem but NOT in Revenue model, or vice versa.
# First, let's look at the accounts associated with type REVENUE
from accounts.models import Account
for acct in Account.objects.filter(account_type='REVENUE'):
    print(f"Account: {acct.code} - {acct.name}")
    ji_sum_acct = JournalItem.objects.filter(account=acct, journal_entry__voided=False).aggregate(total=Sum('credit'))['total'] or Decimal('0')
    rev_sum_cat = Decimal('0')
    if acct.code == '4010':
        rev_sum_cat = Revenue.objects.filter(category='SALES_REVENUE', voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    elif acct.code == '4020':
        rev_sum_cat = Revenue.objects.filter(category='SERVICE_INCOME', voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    elif acct.code == '4030':
        rev_sum_cat = Revenue.objects.filter(category='OTHER_INCOME', voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    print(f"  JournalItem credit: {ji_sum_acct}")
    print(f"  Revenue category amount: {rev_sum_cat}")
    print(f"  Diff: {ji_sum_acct - rev_sum_cat}")

# Let's find any JournalItems where the JournalEntry is not associated with any Revenue
print("\nJournal entries not linked to Revenue:")
non_rev_jes = JournalEntry.objects.exclude(revenues__isnull=False).filter(items__account__account_type='REVENUE')
print(f"Count of non-revenue JEs with REVENUE items: {non_rev_jes.count()}")
for je in non_rev_jes[:10]:
    items = je.items.filter(account__account_type='REVENUE')
    print(f"  JE {je.id}: Date {je.date}, Ref {je.reference}, Desc {je.description}, Amount: {[ (item.debit, item.credit) for item in items ]}")

# Let's check other non-revenue JEs
print("\nInvoices in accounts:")
from accounts.models import Invoice
for inv in Invoice.objects.filter(voided=False):
    print(f"  Invoice {inv.invoice_number}, Client {inv.client_name}, Amount {inv.amount}, Status {inv.status}, JE {inv.journal_entry_id}")
    if inv.journal_entry:
        items = inv.journal_entry.items.filter(account__account_type='REVENUE')
        print(f"    JE items: {[ (item.account.code, item.debit, item.credit) for item in items ]}")
