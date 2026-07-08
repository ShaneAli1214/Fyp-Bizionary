from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date
from django.core.files.uploadedfile import SimpleUploadedFile

from products.models import Product, BulkProduct, InventoryTransaction
from purchases.models import SupplierCompany
from user_management.models import Role, Department, ERPUser


class BulkProductUploadTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Create standard roles and departments
        self.admin_role = Role.objects.create(name="Admin", level="ADMIN")
        self.manager_role = Role.objects.create(name="Inventory Manager", level="MANAGER")
        self.staff_role = Role.objects.create(name="Staff", level="STAFF")
        self.department = Department.objects.create(name="Administration")
        
        # 2. Create the user with PK=1 to match the 'mock-jwt-token-for-ali' handler
        self.user = ERPUser.objects.create(
            pk=1,
            username="test_admin",
            email="test_admin@example.com",
            role=self.admin_role,
            department=self.department,
            status="ACTIVE",
            is_active=True,
            requires_password_change=False
        )
        self.auth_headers = {'HTTP_AUTHORIZATION': 'Bearer mock-jwt-token-for-ali'}

    def make_csv_file(self, filename, content):
        return SimpleUploadedFile(filename, content.encode('utf-8'), content_type='text/csv')

    def post_csv(self, file_object, headers=None):
        if headers is None:
            headers = self.auth_headers
        return self.client.post(
            '/api/products/bulk-upload/',
            {'file': file_object},
            format='multipart',
            **headers
        )

    # ═════════════════════════════════════════════════════════════════════════
    # SCENARIO TESTS
    # ═════════════════════════════════════════════════════════════════════════

    def test_scenario_1_valid_products(self):
        """
        valid_products.csv -> 10 valid rows -> all 10 inserted
        """
        csv_data = (
            "product_name,sku,category,purchase_price,selling_price,quantity,supplier_company,supplier_contact,unit,description,reorder_level\n"
            "Prod 1,SKU001,Cat A,10.00,15.00,100,Company A,1234567,pcs,Desc 1,10\n"
            "Prod 2,SKU002,Cat A,12.50,18.00,150,Company A,1234567,pcs,Desc 2,15\n"
            "Prod 3,SKU003,Cat B,20.00,30.00,80,Company B,test@example.com,pcs,Desc 3,5\n"
            "Prod 4,SKU004,Cat B,5.00,7.50,200,Company B,test@example.com,pcs,Desc 4,20\n"
            "Prod 5,SKU005,Cat C,50.00,75.00,50,Company C,+123456789,pcs,Desc 5,2\n"
            "Prod 6,SKU006,Cat C,45.00,60.00,60,Company C,+123456789,pcs,Desc 6,3\n"
            "Prod 7,SKU007,Cat A,15.00,22.00,120,Company A,,pcs,Desc 7,\n"
            "Prod 8,SKU008,Cat B,8.00,12.00,180,Company B,,pcs,Desc 8,0\n"
            "Prod 9,SKU009,Cat C,100.00,150.00,30,Company C,,pcs,Desc 9,1\n"
            "Prod 10,SKU010,Cat D,2.50,4.00,500,Company D,1234567,pcs,Desc 10,50"
        )
        csv_file = self.make_csv_file("valid_products.csv", csv_data)
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total'], 10)
        self.assertEqual(response.data['insertedCount'], 10)
        self.assertEqual(response.data['duplicatesCount'], 0)
        self.assertEqual(response.data['errorsCount'], 0)
        
        # Check database records
        self.assertEqual(Product.objects.count(), 10)
        self.assertEqual(BulkProduct.objects.count(), 10)
        self.assertEqual(InventoryTransaction.objects.filter(reference_type='opening_stock').count(), 10)

    def test_scenario_2_duplicate_skus(self):
        """
        duplicate_skus.csv -> 5 rows, 3 SKUs already in DB -> 2 inserted, 3 skipped
        """
        # Create pre-existing DB products
        Product.objects.create(name="Exist 1", sku="SKU001", cost_price=Decimal("10.00"), unit_price=Decimal("15.00"), stock_quantity=10)
        Product.objects.create(name="Exist 2", sku="SKU002", cost_price=Decimal("12.00"), unit_price=Decimal("18.00"), stock_quantity=20)
        Product.objects.create(name="Exist 3", sku="SKU003", cost_price=Decimal("20.00"), unit_price=Decimal("30.00"), stock_quantity=30)
        
        csv_data = (
            "product_name,sku,category,purchase_price,selling_price,quantity,supplier_company,supplier_contact,unit,description,reorder_level\n"
            "New Prod 1,SKU001,Cat A,10.00,15.00,100,Company A,1234567,pcs,Desc,10\n"
            "New Prod 2,SKU002,Cat A,12.00,18.00,150,Company A,1234567,pcs,Desc,15\n"
            "New Prod 3,SKU003,Cat B,20.00,30.00,80,Company B,1234567,pcs,Desc,5\n"
            "New Prod 4,SKU004,Cat B,5.00,7.50,200,Company B,1234567,pcs,Desc,20\n"
            "New Prod 5,SKU005,Cat C,50.00,75.00,50,Company C,1234567,pcs,Desc,2"
        )
        csv_file = self.make_csv_file("duplicate_skus.csv", csv_data)
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total'], 5)
        self.assertEqual(response.data['insertedCount'], 2)
        self.assertEqual(response.data['duplicatesCount'], 3)
        
        # Verify db counts
        self.assertEqual(Product.objects.count(), 5)
        self.assertEqual(len(response.data['duplicates']), 3)

    def test_scenario_3_missing_fields(self):
        """
        missing_fields.csv -> rows missing product_name and sku -> those rows in errors[]
        """
        csv_data = (
            "product_name,sku,category,purchase_price,selling_price,quantity,supplier_company,supplier_contact,unit,description,reorder_level\n"
            ",SKU001,Cat A,10.00,15.00,100,Company A,1234567,pcs,Desc,10\n" # missing product_name
            "Prod 2,,Cat A,12.00,18.00,150,Company A,1234567,pcs,Desc,15\n" # missing sku
            "Prod 3,SKU003,Cat B,20.00,30.00,80,Company B,1234567,pcs,Desc,5" # valid
        )
        csv_file = self.make_csv_file("missing_fields.csv", csv_data)
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total'], 3)
        self.assertEqual(response.data['insertedCount'], 1)
        self.assertEqual(response.data['errorsCount'], 2)
        self.assertEqual(response.data['errors'][0]['reason'], 'missing product_name')
        self.assertEqual(response.data['errors'][1]['reason'], 'missing sku')

    def test_scenario_4_invalid_prices(self):
        """
        invalid_prices.csv -> selling_price < purchase_price -> flagged as errors
        """
        csv_data = (
            "product_name,sku,category,purchase_price,selling_price,quantity,supplier_company,supplier_contact,unit,description,reorder_level\n"
            "Prod 1,SKU001,Cat A,10.00,8.00,100,Company A,1234567,pcs,Desc,10\n" # selling < purchase
            "Prod 2,SKU002,Cat A,12.00,18.00,150,Company A,1234567,pcs,Desc,15" # valid
        )
        csv_file = self.make_csv_file("invalid_prices.csv", csv_data)
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['insertedCount'], 1)
        self.assertEqual(response.data['errorsCount'], 1)
        self.assertEqual(response.data['errors'][0]['reason'], 'selling_price must be greater than or equal to purchase_price')

    def test_scenario_5_empty_file(self):
        """
        empty_file.csv -> completely empty file -> error "File is empty"
        """
        csv_file = self.make_csv_file("empty_file.csv", "")
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'File is empty')

    def test_scenario_6_large_file(self):
        """
        large_file.csv -> 500 rows mixed valid/invalid -> correct counts returned
        """
        rows = ["product_name,sku,category,purchase_price,selling_price,quantity,supplier_company,supplier_contact,unit,description,reorder_level"]
        for i in range(1, 501):
            if i % 10 == 0:
                # Invalid price
                rows.append(f"Large Prod {i},SKU_LARGE_{i},Cat,10.00,5.00,10,Company,,pcs,Desc,5")
            else:
                # Valid
                rows.append(f"Large Prod {i},SKU_LARGE_{i},Cat,10.00,15.00,10,Company,,pcs,Desc,5")
                
        csv_data = "\n".join(rows)
        csv_file = self.make_csv_file("large_file.csv", csv_data)
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total'], 500)
        self.assertEqual(response.data['insertedCount'], 450)
        self.assertEqual(response.data['errorsCount'], 50)


    # ═════════════════════════════════════════════════════════════════════════
    # UNIT & VALIDATION TESTS
    # ═════════════════════════════════════════════════════════════════════════

    def test_validation_rule_purchase_price_checks(self):
        # Missing purchase_price
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU1,Cat,,15.00,10"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'missing purchase_price')

        # Negative purchase_price
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU2,Cat,-1.00,15.00,10"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'purchase_price must be a positive number')

        # Zero purchase_price
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU3,Cat,0.00,15.00,10"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'purchase_price must be a positive number')

        # Non-numeric purchase_price
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU4,Cat,abc,15.00,10"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'purchase_price must be a positive number')

    def test_validation_rule_selling_price_checks(self):
        # Missing selling_price
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU1,Cat,10.00,,10"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'missing selling_price')

        # Non-numeric selling_price
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU2,Cat,10.00,abc,10"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'invalid selling_price')

    def test_validation_rule_quantity_checks(self):
        # Missing quantity
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU1,Cat,10.00,15.00,"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'missing quantity')

        # Negative quantity
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU2,Cat,10.00,15.00,-5"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'invalid quantity, must be a non-negative whole number')

        # Decimal quantity
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU3,Cat,10.00,15.00,10.5"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'invalid quantity, must be a non-negative whole number')

    def test_validation_rule_reorder_level_checks(self):
        # Negative reorder_level
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity,reorder_level\nProd,SKU1,Cat,10.00,15.00,10,-1"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'invalid reorder_level, must be a non-negative integer')

        # Decimal reorder_level
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity,reorder_level\nProd,SKU2,Cat,10.00,15.00,10,1.5"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'invalid reorder_level, must be a non-negative integer')

    def test_validation_rule_supplier_contact_checks(self):
        # Invalid supplier_contact (neither email nor phone)
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity,supplier_contact\nProd,SKU1,Cat,10.00,15.00,10,invalid-contact"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['errors'][0]['reason'], 'invalid supplier_contact, must be a valid phone number or email address')

        # Valid phone contact format
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity,supplier_contact\nProd,SKU2,Cat,10.00,15.00,10,+923123456789"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['insertedCount'], 1)

        # Valid email contact format
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity,supplier_contact\nProd,SKU3,Cat,10.00,15.00,10,test@company.com"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        self.assertEqual(response.data['insertedCount'], 1)

    def test_validation_rule_unit_defaulting_pcs(self):
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity,unit\nProd,SKU1,Cat,10.00,15.00,10,"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.data['insertedCount'], 1)
        self.assertEqual(response.data['warningsCount'], 1)
        self.assertEqual(response.data['warnings'][0]['reason'], "unit is missing, defaulted to 'pcs'")
        self.assertEqual(Product.objects.first().unit, 'pcs')

    def test_duplicate_sku_in_same_file(self):
        csv_data = (
            "product_name,sku,category,purchase_price,selling_price,quantity\n"
            "Prod A,SKU_DUP,Cat,10.00,15.00,10\n"
            "Prod B,SKU_DUP,Cat,12.00,18.00,20"
        )
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['insertedCount'], 1)
        self.assertEqual(response.data['duplicatesCount'], 1)
        self.assertEqual(response.data['duplicates'][0]['reason'], 'Duplicate SKU within the uploaded file')

    def test_json_response_schema_structure(self):
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU1,Cat,10.00,15.00,10"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        
        expected_keys = [
            "total", "insertedCount", "duplicatesCount", "errorsCount", "warningsCount",
            "inserted", "duplicates", "errors", "warnings",
            "insertedRows", "duplicateRows", "errorRows", "warningRows"
        ]
        for key in expected_keys:
            self.assertIn(key, response.data)

    def test_rbac_security_denies_lower_roles(self):
        """
        Ensure staff role cannot access the bulk upload endpoint
        """
        # Set user role to STAFF
        self.user.role = self.staff_role
        self.user.save()
        
        csv_data = "product_name,sku,category,purchase_price,selling_price,quantity\nProd,SKU1,Cat,10.00,15.00,10"
        csv_file = self.make_csv_file("test.csv", csv_data)
        response = self.post_csv(csv_file)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], 'You do not have permission to perform bulk uploads')
        
        # Reset back to ADMIN
        self.user.role = self.admin_role
        self.user.save()


class ProductStockSplitTestCase(TestCase):
    def test_stock_splits(self):
        # > 150 -> 70 shop, remainder warehouse
        p1 = Product.objects.create(name="P1", sku="SKU901", cost_price=Decimal("10.00"), unit_price=Decimal("15.00"), stock_quantity=200)
        self.assertEqual(p1.shop_stock, 70)
        self.assertEqual(p1.warehouse_stock, 130)

        # 100 - 150 -> 50 shop, remainder warehouse
        p2 = Product.objects.create(name="P2", sku="SKU902", cost_price=Decimal("10.00"), unit_price=Decimal("15.00"), stock_quantity=120)
        self.assertEqual(p2.shop_stock, 50)
        self.assertEqual(p2.warehouse_stock, 70)

        # 50 - 99 -> 40 shop, remainder warehouse
        p3 = Product.objects.create(name="P3", sku="SKU903", cost_price=Decimal("10.00"), unit_price=Decimal("15.00"), stock_quantity=80)
        self.assertEqual(p3.shop_stock, 40)
        self.assertEqual(p3.warehouse_stock, 40)

        # < 50, but >= 20 -> 20 shop, remainder warehouse
        p4 = Product.objects.create(name="P4", sku="SKU904", cost_price=Decimal("10.00"), unit_price=Decimal("15.00"), stock_quantity=30)
        self.assertEqual(p4.shop_stock, 20)
        self.assertEqual(p4.warehouse_stock, 10)

        # < 20 -> full stock in shop, 0 in warehouse
        p5 = Product.objects.create(name="P5", sku="SKU905", cost_price=Decimal("10.00"), unit_price=Decimal("15.00"), stock_quantity=15)
        self.assertEqual(p5.shop_stock, 15)
        self.assertEqual(p5.warehouse_stock, 0)

        # <= 0 -> 0 shop, 0 warehouse
        p6 = Product.objects.create(name="P6", sku="SKU906", cost_price=Decimal("10.00"), unit_price=Decimal("15.00"), stock_quantity=0)
        self.assertEqual(p6.shop_stock, 0)
        self.assertEqual(p6.warehouse_stock, 0)

    def test_signals_recalculate_split(self):
        p = Product.objects.create(name="Signal Test", sku="SKUSIG", cost_price=Decimal("10.00"), unit_price=Decimal("15.00"), stock_quantity=0)
        self.assertEqual(p.shop_stock, 0)
        self.assertEqual(p.warehouse_stock, 0)

        # Record IN transaction
        txn = InventoryTransaction.objects.create(
            product=p,
            txn_type=InventoryTransaction.TYPE_IN,
            quantity=100,
            reference_type="adjustment",
            date=date.today()
        )
        p.refresh_from_db()
        self.assertEqual(p.stock_quantity, 100)
        self.assertEqual(p.shop_stock, 50)
        self.assertEqual(p.warehouse_stock, 50)

