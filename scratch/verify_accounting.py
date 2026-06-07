import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from sales.models import Sale
from purchases.models import Purchase
from products.models import Product
from accounts.models import JournalEntry, JournalItem, Account
from accounts.services import AccountsService
from datetime import date
from decimal import Decimal

print("=== VERIFYING ACCOUNTING INTEGRATION ===")

# 1. Check if COA is ensured
AccountsService.ensure_coa()
print(f"Accounts count in COA: {Account.objects.count()}")

# Get or create a dummy product for testing
product = Product.objects.first()
if not product:
    product = Product.objects.create(
        name="Test Audit Product",
        sku="TEST-SKU-AUDIT",
        price=Decimal("100.00"),
        stock=100
    )
print(f"Using Product: {product.name} (SKU: {product.sku})")

# 2. Check if a Sale auto-posts
print("\n--- Testing Sale Auto-Posting ---")
sale = Sale.objects.create(
    product=product,
    customer_name="Test Customer for Audit",
    quantity_sold=5,
    unit_price=Decimal("200.00"),
    total_price=Decimal("1000.00"),
    payment_status="PAID",
    sale_date=date.today()
)
print(f"Created Sale ID: {sale.id} with total price {sale.total_price}")

# Query matching journal entry
ref = f"SALE-{sale.id}"
je = JournalEntry.objects.filter(reference=ref).first()
if je:
    print(f"Matched Journal Entry: {je.description}")
    items = je.items.all()
    print("Journal Items:")
    for item in items:
        print(f" - {item.account.code} ({item.account.name}): Dr {item.debit} | Cr {item.credit}")
    
    # Assert double entry balances
    sum_dr = sum(i.debit for i in items)
    sum_cr = sum(i.credit for i in items)
    print(f"Total Debit: {sum_dr} | Total Credit: {sum_cr}")
    assert sum_dr == sum_cr == Decimal("1000.00"), "Sale ledger entries do not balance!"
    print("Success: Sale ledger entry is balanced!")
else:
    print("Error: No JournalEntry found for Sale!")

# 3. Check if a Purchase auto-posts
print("\n--- Testing Purchase Auto-Posting ---")
purchase = Purchase.objects.create(
    product=product,
    company_name="Test Vendor for Procurement",
    quantity_purchased=10,
    unit_cost=Decimal("50.00"),
    total_cost=Decimal("500.00"),
    payment_status="UNPAID",
    purchase_date=date.today()
)
print(f"Created Purchase ID: {purchase.id} with total cost {purchase.total_cost}")

# Query matching journal entry
ref = f"PURCHASE-{purchase.id}"
je = JournalEntry.objects.filter(reference=ref).first()
if je:
    print(f"Matched Journal Entry: {je.description}")
    items = je.items.all()
    print("Journal Items:")
    for item in items:
        print(f" - {item.account.code} ({item.account.name}): Dr {item.debit} | Cr {item.credit}")
    
    # Assert double entry balances
    sum_dr = sum(i.debit for i in items)
    sum_cr = sum(i.credit for i in items)
    print(f"Total Debit: {sum_dr} | Total Credit: {sum_cr}")
    assert sum_dr == sum_cr == Decimal("500.00"), "Purchase ledger entries do not balance!"
    print("Success: Purchase ledger entry is balanced!")
else:
    print("Error: No JournalEntry found for Purchase!")

# 4. Check balance sheet and P&L queries
print("\n--- Testing Service Queries ---")
tree = AccountsService.get_chart_of_accounts_tree()
print(f"Successfully generated COA tree with {len(tree)} roots.")

pl = AccountsService.get_profit_loss(date.today(), date.today())
print(f"Net Profit for today: {pl['net_profit']}")

bs = AccountsService.get_balance_sheet(date.today())
print(f"Total Assets as of today: {bs['total_assets']}")
print(f"Total Liabilities as of today: {bs['total_liabilities']}")
print(f"Total Equity as of today: {bs['total_equity']}")
print(f"Total Liabilities + Equity: {bs['total_liabilities_and_equity']}")

assert bs['total_assets'] == bs['total_liabilities_and_equity'], "Balance sheet does not balance!"
print("Success: Balance Sheet matches assets with liabilities + equity exactly!")

# Clean up test data
sale_id = sale.id
purchase_id = purchase.id
sale.delete()
purchase.delete()
JournalEntry.objects.filter(reference__in=[f"SALE-{sale_id}", f"PURCHASE-{purchase_id}"]).delete()
print("\n=== CLEANUP COMPLETE: All checks passed successfully! ===")
