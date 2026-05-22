"""Initial migration for sales app (generated)
"""
from django.db import migrations, models
import django.db.models.deletion
from decimal import Decimal


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Sale',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer_name', models.CharField(max_length=255)),
                ('quantity_sold', models.IntegerField()),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('total_price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('discount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('invoice_number', models.CharField(blank=True, max_length=50, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('payment_status', models.CharField(choices=[('PAID', 'Paid'), ('PENDING', 'Pending'), ('FAILED', 'Failed')], default='PAID', max_length=20)),
                ('sale_date', models.DateField()),
                ('payment_method', models.CharField(choices=[('CASH', 'Cash'), ('CARD', 'Card'), ('BANK_TRANSFER', 'Bank Transfer'), ('OTHER', 'Other')], default='CASH', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='sales', to='products.product')),
            ],
            options={
                'db_table': 'sales',
                'ordering': ['-sale_date', '-created_at'],
            },
        ),
    ]
