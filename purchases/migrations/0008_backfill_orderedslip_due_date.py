from datetime import timedelta

from django.db import migrations
from django.utils import timezone


def backfill_due_dates(apps, schema_editor):
    OrderedSlip = apps.get_model('purchases', 'OrderedSlip')
    for slip in OrderedSlip.objects.filter(due_date__isnull=True):
        base_time = slip.created_at or timezone.now()
        slip.due_date = base_time + timedelta(days=2)
        slip.save(update_fields=['due_date'])


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0007_orderedslip_due_date'),
    ]

    operations = [
        migrations.RunPython(backfill_due_dates, migrations.RunPython.noop),
    ]
