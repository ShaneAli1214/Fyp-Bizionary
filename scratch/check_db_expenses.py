import os
import sys
import django

# Add the current directory to path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.models import Expense
from django.db.models import Sum, Count

total_expenses = Expense.objects.count()
print(f"Total expense count: {total_expenses}")

if total_expenses > 0:
    categories = Expense.objects.values('category').annotate(count=Count('id'), total=Sum('amount'))
    print("\nExpenses by Category:")
    for cat in categories:
        print(f"  Category: {cat['category']}, Count: {cat['count']}, Total: {cat['total']}")
        
    print("\nRecent 5 expenses:")
    for exp in Expense.objects.all()[:5]:
        print(f"  ID: {exp.id}, Date: {exp.date}, Category: {exp.category}, Amount: {exp.amount}, Vendor: {exp.vendor}, Description: {exp.description}")
