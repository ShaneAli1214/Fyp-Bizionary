import os
import sys
import django

# Setup django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.core.management import call_command
from products.models import InventoryTransaction, Product
from sales.models import Sale, SaleReturn
from invoices.models import Invoice
from purchases.models import Purchase, SupplierCompany, OrderedSlip
from accounts.models import Expense, CashTransaction, UtilityBill, SalaryPayment, RecurringCost

print("=" * 60)
print("PRODUCTION DATABASE RESTORE SCRIPT")
print("=" * 60)

try:
    print("Step 1: Wiping database tables...")
    SaleReturn.objects.all().delete()
    InventoryTransaction.objects.all().delete()
    Invoice.objects.all().delete()
    Sale.objects.all().delete()
    Purchase.objects.all().delete()
    OrderedSlip.objects.all().delete()
    Product.objects.all().delete()
    SupplierCompany.objects.all().delete()
    UtilityBill.objects.all().delete()
    SalaryPayment.objects.all().delete()
    RecurringCost.objects.all().delete()
    Expense.objects.all().delete()
    CashTransaction.objects.all().delete()
    print("Database wiped successfully!")
except Exception as e:
    print(f"Error wiping database: {e}")
    sys.exit(1)

try:
    print("Step 2: Loading db_dump.json.gz...")
    call_command('loaddata', 'db_dump.json.gz')
    print("Database restored successfully from compressed backup!")
except Exception as e:
    print(f"Error restoring database: {e}")
    sys.exit(1)
