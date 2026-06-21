import os
import django
import sys

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product
from sales.models import Sale
from sales.serializers import SaleSerializer

product = Product.objects.filter(name__icontains='Kenwood Blender').first()
if not product:
    print("Product not found!")
    sys.exit(1)

sales = Sale.objects.filter(product=product).order_by('sale_date', 'id')[:5]

print("--- Serializer Verification ---")
for sale in sales:
    serializer = SaleSerializer(sale)
    data = serializer.data
    print(f"Sale #{sale.id} on {sale.sale_date} | Sold Qty: {data['quantity_sold']} | Serialized remaining_stock: {data['remaining_stock']}")
