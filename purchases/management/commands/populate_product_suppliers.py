from django.core.management.base import BaseCommand
from purchases.models import SupplierCompany, Purchase
from products.models import Product

try:
    from product_catalog.master_data import SUPPLIERS_DATA
except Exception:
    SUPPLIERS_DATA = []


class Command(BaseCommand):
    help = 'Populate SupplierCompany table from master data and link products to suppliers using purchase history.'

    def handle(self, *args, **options):
        created_suppliers = 0
        updated_products = 0

        # Import suppliers from master data
        for entry in SUPPLIERS_DATA:
            name = entry.get('name')
            if not name:
                continue
            obj, created = SupplierCompany.objects.get_or_create(
                name=name,
                defaults={
                    'category': entry.get('category') or entry.get('city') or '',
                    'contact_number': entry.get('phone') or entry.get('contact_number') or '',
                    'email': entry.get('email') or '',
                }
            )
            if created:
                created_suppliers += 1

        self.stdout.write(self.style.SUCCESS(f'Imported {created_suppliers} suppliers from master data.'))

        # Link products to suppliers using purchase history
        products = Product.objects.filter(supplier__isnull=True)
        for product in products:
            company_names = Purchase.objects.filter(product=product).values_list('company_name', flat=True).distinct()
            if not company_names:
                continue

            # Prefer the first non-empty company name
            company_name = None
            for name in company_names:
                if name:
                    company_name = name.strip()
                    break

            if not company_name:
                continue

            supplier_obj, _ = SupplierCompany.objects.get_or_create(name=company_name)
            product.supplier = supplier_obj
            product.save(update_fields=['supplier'])
            updated_products += 1

        self.stdout.write(self.style.SUCCESS(f'Linked {updated_products} products to suppliers based on purchase history.'))
