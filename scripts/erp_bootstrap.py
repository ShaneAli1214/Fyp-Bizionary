"""
One-time ERP bootstrap script.
Run: python manage.py shell < scripts/erp_bootstrap.py
Performs:
  1. Backfill unit_cost_price on all existing Sales
  2. Create opening-stock InventoryTransaction for each product
  3. Backfill CashTransaction from historical Sales + Expenses
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')

# ---- Bootstrap Django ----
import django
django.setup()

from decimal import Decimal
from datetime import date
from django.db.models import Sum

from sales.models import Sale
from products.models import Product, InventoryTransaction
from accounts.models import Expense, CashTransaction, AuditLog

print("=" * 60)
print("ERP DATA BOOTSTRAP")
print("=" * 60)

# ─────────────────────────────────────────────────────────────
# STEP 1: Backfill unit_cost_price on all existing Sales
# ─────────────────────────────────────────────────────────────
print("\n[1/3] Backfilling unit_cost_price on Sales...")
sales_to_fix = Sale.objects.filter(unit_cost_price=Decimal('0.00')).select_related('product')
count = 0
for sale in sales_to_fix:
    cp = sale.product.cost_price or Decimal('0.00')
    Sale.objects.filter(pk=sale.pk).update(unit_cost_price=cp)
    count += 1

print(f"  ✅ Backfilled {count} sales with unit_cost_price from product.cost_price")

# ─────────────────────────────────────────────────────────────
# STEP 2: Bootstrap opening-stock InventoryTransaction
# ─────────────────────────────────────────────────────────────
print("\n[2/3] Creating opening-stock InventoryTransactions...")
# Clear any existing opening_stock entries to avoid duplicates
InventoryTransaction.objects.filter(reference_type='opening_stock').delete()

today = date.today()
inv_txns = []
for product in Product.objects.filter(stock_quantity__gt=0):
    inv_txns.append(InventoryTransaction(
        product=product,
        txn_type=InventoryTransaction.TYPE_IN,
        quantity=product.stock_quantity,
        reference_type='opening_stock',
        reference_id=product.id,
        note=f'Opening stock balance for {product.name}',
        date=today,
    ))

InventoryTransaction.objects.bulk_create(inv_txns)
print(f"  ✅ Created {len(inv_txns)} opening-stock inventory transactions")

# ─────────────────────────────────────────────────────────────
# STEP 3: Backfill CashTransaction from historical data
# ─────────────────────────────────────────────────────────────
print("\n[3/3] Backfilling CashTransactions from historical Sales + Expenses...")

# Clear existing backfilled records to avoid duplicates
CashTransaction.objects.filter(source_type__in=['sale', 'expense']).delete()

# From paid sales (cash IN)
cash_in = []
for sale in Sale.objects.filter(payment_status='PAID').select_related('product'):
    cash_in.append(CashTransaction(
        txn_type=CashTransaction.TYPE_IN,
        amount=sale.total_price,
        source_type='sale',
        source_id=sale.id,
        date=sale.sale_date,
        description=f'Sale #{sale.id} - {sale.customer_name}',
    ))

CashTransaction.objects.bulk_create(cash_in, batch_size=500)
print(f"  ✅ Created {len(cash_in)} CashTransaction IN records from Sales")

# From active expenses (cash OUT)
cash_out = []
for exp in Expense.objects.filter(voided=False):
    cash_out.append(CashTransaction(
        txn_type=CashTransaction.TYPE_OUT,
        amount=exp.amount,
        source_type='expense',
        source_id=exp.id,
        date=exp.date,
        description=f'Expense: {exp.vendor or exp.category}',
    ))

CashTransaction.objects.bulk_create(cash_out)
print(f"  ✅ Created {len(cash_out)} CashTransaction OUT records from Expenses")

# ─────────────────────────────────────────────────────────────
# VERIFICATION SUMMARY
# ─────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("VERIFICATION SUMMARY")
print("=" * 60)

total_rev = Sale.objects.aggregate(r=Sum('total_price'))['r'] or Decimal('0')
total_cogs = Sale.objects.aggregate(
    c=Sum(
        __import__('django.db.models', fromlist=['ExpressionWrapper']).ExpressionWrapper(
            __import__('django.db.models', fromlist=['F']).F('quantity_sold') *
            __import__('django.db.models', fromlist=['F']).F('unit_cost_price'),
            output_field=__import__('django.db.models', fromlist=['DecimalField']).DecimalField()
        )
    )
)['c'] or Decimal('0')
total_exp = Expense.objects.filter(voided=False, category='SUPPLIES').aggregate(e=Sum('amount'))['e'] or Decimal('0')
gross_profit = total_rev - total_cogs
net_profit = gross_profit - total_exp

print(f"  Sales records:          {Sale.objects.count()}")
print(f"  InventoryTransactions:  {InventoryTransaction.objects.count()}")
print(f"  CashTransactions:       {CashTransaction.objects.count()}")
print(f"  Revenue:                Rs. {total_rev:,.2f}")
print(f"  COGS (snapshot):        Rs. {total_cogs:,.2f}")
print(f"  Gross Profit:           Rs. {gross_profit:,.2f}")
print(f"  Expenses (SUPPLIES):    Rs. {total_exp:,.2f}")
print(f"  Net Profit:             Rs. {net_profit:,.2f}")
print("\n✅ Bootstrap complete!")
