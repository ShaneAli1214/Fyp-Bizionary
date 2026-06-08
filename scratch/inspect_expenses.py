import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.models import Expense, JournalEntry, JournalItem

print("--- ALL EXPENSES ---")
for exp in Expense.objects.all():
    print(f"ID {exp.id}: Category {exp.category}, Amount {exp.amount}, Date {exp.date}, Voided {exp.voided}, JE {exp.journal_entry_id}")
    if exp.journal_entry:
        items = exp.journal_entry.items.all()
        print(f"  JE: Date {exp.journal_entry.date}, Voided {exp.journal_entry.voided}")
        for item in items:
            print(f"    Item: {item.account.code} ({item.account.name}), Dr {item.debit}, Cr {item.credit}")
