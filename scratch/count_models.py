import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.models import UtilityBill, SalaryPayment, RecurringCost

print("UtilityBill count:", UtilityBill.objects.count())
print("SalaryPayment count:", SalaryPayment.objects.count())
print("RecurringCost count:", RecurringCost.objects.count())
