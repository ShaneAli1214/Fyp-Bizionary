import os
import sys
import django
import gzip
import json

# Setup django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db import transaction
from django.apps import apps
from django.core.serializers import deserialize

logs = []
def log_print(*args):
    msg = " ".join(str(a) for a in args)
    print(msg)
    logs.append(msg)

log_print("=" * 60)
log_print("PRODUCTION DATABASE RESTORE SCRIPT (JSON DE-SERIALIZER)")
log_print("=" * 60)

# Define exact dependency insertion order
MODEL_ORDER = [
    # 1. Base user management / metadata (No external dependencies)
    'user_management.department',
    'user_management.role',
    'user_management.module',
    'user_management.securitysetting',
    
    # 2. ERP User (references department and role)
    'user_management.erpuser',
    
    # 3. User related tables
    'user_management.permission',
    'user_management.activitylog',
    'user_management.userinvite',
    'user_management.usersession',
    
    # 4. Core items / inventory dependencies
    'items_management.category',
    'purchases.suppliercompany',
    
    # 5. Products (references category, department)
    'products.product',
    'products.bulkproduct',
    'items_management.productimage',
    'items_management.stockhistory',
    
    # 6. Purchases & orders
    'purchases.orderedslip',
    'purchases.purchase',
    'purchases.purchaselineitem',
    
    # 7. Sales (references product)
    'sales.sale',
    'sales.salereturn',
    
    # 8. Invoices (references sale)
    'invoices.invoice',
    
    # 9. Accounts base
    'accounts.account',
    
    # 10. Financial / transactions (references supplier, sale, product, erpuser)
    'accounts.expense',
    'accounts.cashtransaction',
    'accounts.utilitybill',
    'accounts.salarypayment',
    'accounts.recurringcost',
    'accounts.journalentry',
    'accounts.journalitem',
    'accounts.revenue',
    'accounts.invoice',
    'accounts.auditlog',
    'accounts.expensebudget',
    'accounts.invoicepayment',
    
    # 11. Insights & Analytics
    'insights.insightcache',
    'insights.insightrecommendation',
    'insights.customerreview',
    'sales_analytics.salestarget',
    'sales_analytics.performancemetric',
]

# Load and parse dump file
dump_path = 'db_dump.json.gz'
if not os.path.exists(dump_path):
    log_print(f"Error: Dump file {dump_path} not found.")
    try:
        with open('/tmp/restore_db_logs.txt', 'w', encoding='utf-8') as f_log:
            f_log.write('\n'.join(logs))
    except:
        pass
    sys.exit(1)

log_print(f"Parsing dump file {dump_path}...")
with gzip.open(dump_path, 'rt', encoding='utf-8') as f:
    objects = json.load(f)

# Group objects by model
grouped = {}
for obj in objects:
    model_name = obj['model']
    grouped.setdefault(model_name, []).append(obj)

# Append any missing models in dump dynamically at the end
for model_name in grouped.keys():
    if model_name not in MODEL_ORDER:
        MODEL_ORDER.append(model_name)

# Wipe tables in reverse order
log_print("\nStep 1: Wiping existing data tables...")
for model_name in reversed(MODEL_ORDER):
    try:
        model_class = apps.get_model(model_name)
        count = model_class.objects.count()
        if count > 0:
            log_print(f"  Wiping {count} records from {model_name}...")
            model_class.objects.all().delete()
    except Exception as wipe_err:
        pass

log_print("Wiping complete!")

# Load tables in forward order inside a single transaction
log_print("\nStep 2: Restoring records in dependency order...")
try:
    with transaction.atomic():
        for model_name in MODEL_ORDER:
            if model_name not in grouped:
                continue
            items = grouped[model_name]
            log_print(f"  Loading {len(items)} records for {model_name}...")
            for item in items:
                deserialized = list(deserialize('json', json.dumps([item])))[0]
                deserialized.save()
    log_print("\n✅ Database restored successfully!")
except Exception as load_err:
    log_print(f"\n❌ Error restoring database: {load_err}")
    try:
        with open('/tmp/restore_db_logs.txt', 'w', encoding='utf-8') as f_log:
            f_log.write('\n'.join(logs))
    except:
        pass
    sys.exit(1)

try:
    with open('/tmp/restore_db_logs.txt', 'w', encoding='utf-8') as f_log:
        f_log.write('\n'.join(logs))
except:
    pass
