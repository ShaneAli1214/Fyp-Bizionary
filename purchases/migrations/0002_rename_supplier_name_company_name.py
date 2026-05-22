from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='purchase',
            old_name='supplier_name',
            new_name='company_name',
        ),
        migrations.RemoveIndex(
            model_name='purchase',
            name='purchases_supplie_93f140_idx',
        ),
        migrations.AddIndex(
            model_name='purchase',
            index=models.Index(fields=['company_name'], name='purchases_company_77b6b4_idx'),
        ),
    ]
