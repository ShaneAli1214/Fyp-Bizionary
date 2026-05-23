from decimal import Decimal

from django.db import migrations, models


def copy_unit_price_to_cost_price(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    for product in Product.objects.all().only('id', 'unit_price', 'cost_price'):
        if product.cost_price == Decimal('0.00'):
            product.cost_price = product.unit_price or Decimal('0.00')
            product.save(update_fields=['cost_price'])


def reverse_copy_unit_price_to_cost_price(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_product_subcategory'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='cost_price',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10),
        ),
        migrations.RunPython(copy_unit_price_to_cost_price, reverse_copy_unit_price_to_cost_price),
    ]
