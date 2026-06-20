import os
import sys
import django

sys.path.insert(0, "c:/Users/Dell/Desktop/Fyp")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.models import CashTransaction

print("Total CashTransaction records:", CashTransaction.objects.count())
txns = CashTransaction.objects.values('source_type').annotate(count=django.db.models.Count('id'))
for t in txns:
    print(f"Source Type: {t['source_type']}, Count: {t['count']}")
