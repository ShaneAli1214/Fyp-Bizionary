from django.test import TestCase
from rest_framework.test import APIClient
from decimal import Decimal
from datetime import date
from products.models import Product
from sales.models import Sale
from purchases.models import SupplierCompany, Purchase
from accounts.models import CashTransaction

class DataFlowTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.supplier = SupplierCompany.objects.create(
            name="Test Supplier",
            category="Test Category"
        )
        self.product = Product.objects.create(
            name="Test Electronics",
            sku="TEST-ELEC-1",
            category="Electronics & Appliances",
            unit_price=Decimal("1000.00"),
            cost_price=Decimal("700.00"),
            stock_quantity=10,
            min_stock=2,
            supplier=self.supplier
        )

    def test_category_mapping_in_sales_by_period(self):
        # Create a sale for the electronics product
        sale = Sale.objects.create(
            product=self.product,
            customer_name="Test Customer",
            quantity_sold=2,
            unit_price=Decimal("1000.00"),
            total_price=Decimal("2000.00"),
            sale_date=date.today(),
            payment_status="PAID"
        )
        
        response = self.client.get('/api/dashboard/sales-by-period/', {'period': 'last10Days'})
        self.assertEqual(response.status_code, 200)
        
        # Verify category mapping returned correctly
        categories = response.data.get('categories', [])
        electronics_cat = next((c for c in categories if c['name'] == 'Electronics & Appliances'), None)
        self.assertIsNotNone(electronics_cat)
        self.assertEqual(electronics_cat['key'], 'electronics_appliances')
        
        # Verify chartData has electronics_appliances populated
        chart_data = response.data.get('chartData', [])
        self.assertTrue(len(chart_data) > 0)
        # Find the point corresponding to today
        today_label = date.today().strftime('%b %d')
        today_point = next((p for p in chart_data if p['period'] == today_label), None)
        self.assertIsNotNone(today_point)
        self.assertEqual(today_point['electronics_appliances'], 2)
        self.assertEqual(today_point['electronics_appliances_revenue'], 2000.0)

    def test_purchase_signals_cash_outflow(self):
        # 1. Create unpaid purchase
        purchase = Purchase.objects.create(
            product=self.product,
            company_name=self.supplier.name,
            quantity_purchased=5,
            unit_cost=Decimal("700.00"),
            total_cost=Decimal("3500.00"),
            purchase_date=date.today(),
            payment_status="UNPAID"
        )
        
        # No cash transaction should exist
        self.assertFalse(CashTransaction.objects.filter(source_type='purchase', source_id=purchase.id).exists())
        
        # 2. Update status to PAID
        purchase.payment_status = "PAID"
        purchase.save()
        
        # Cash transaction should be created
        ct_qs = CashTransaction.objects.filter(source_type='purchase', source_id=purchase.id)
        self.assertTrue(ct_qs.exists())
        self.assertEqual(ct_qs.first().amount, Decimal("3500.00"))
        self.assertEqual(ct_qs.first().txn_type, CashTransaction.TYPE_OUT)
        
        # 3. Update status back to UNPAID
        purchase.payment_status = "UNPAID"
        purchase.save()
        
        # Cash transaction should be deleted
        self.assertFalse(CashTransaction.objects.filter(source_type='purchase', source_id=purchase.id).exists())
