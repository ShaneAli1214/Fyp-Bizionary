from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0008_backfill_orderedslip_due_date'),
    ]

    operations = [
        migrations.CreateModel(
            name='SupplierCompany',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, unique=True)),
                ('category', models.CharField(blank=True, max_length=100, null=True)),
                ('contact_number', models.CharField(blank=True, max_length=50, null=True)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'supplier_companies',
                'ordering': ['name'],
            },
        ),
        migrations.AddIndex(
            model_name='suppliercompany',
            index=models.Index(fields=['name'], name='purchases_su_name_7a4f7b_idx'),
        ),
        migrations.AddIndex(
            model_name='suppliercompany',
            index=models.Index(fields=['category'], name='purchases_su_catego_2b2a0f_idx'),
        ),
    ]