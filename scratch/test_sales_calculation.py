import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from sales.models import Sale
from django.db.models import Sum
from dashboard.views import dashboard_kpis
from rest_framework.test import APIRequestFactory

print("=" * 60)
print("DATABASE SALES INTEGRITY TEST:")
print("=" * 60)

# Total sales in Sale model
sales_qs = Sale.objects.all()
total_sales_count = sales_qs.count()
total_sales_revenue = sales_qs.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')

print(f"Total sales count: {total_sales_count}")
print(f"Total sales revenue sum: {total_sales_revenue:,.2f}")

# Sales in May 2026
may_sales = sales_qs.filter(sale_date__gte='2026-05-01', sale_date__lte='2026-05-30')
may_sales_count = may_sales.count()
may_sales_revenue = may_sales.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')

print(f"May 2026 sales count: {may_sales_count}")
print(f"May 2026 sales revenue sum: {may_sales_revenue:,.2f}")

# Check invoice table if any
from invoices.models import Invoice as BillingInvoice
total_invoices_count = BillingInvoice.objects.count()
total_invoices_revenue = BillingInvoice.objects.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
total_invoices_paid = BillingInvoice.objects.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
print(f"Total Billing Invoices count: {total_invoices_count}")
print(f"Total Billing Invoices revenue: {total_invoices_revenue:,.2f}")
print(f"Total Billing Invoices paid: {total_invoices_paid:,.2f}")

# Let's call dashboard_kpis view
factory = APIRequestFactory()
request = factory.get('/api/dashboard/kpis/')
response = dashboard_kpis(request)
print("\nDashboard KPIs Response Data:")
import json
print(json.dumps(response.data, indent=2))
