import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.models import Invoice

for inv in Invoice.objects.all():
    print(f"Invoice {inv.invoice_number}: Date {inv.date}, Created At {inv.created_at}")
