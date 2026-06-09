"""
ERP Signals for Products app.
Fires on Sale saves to:
  - Create InventoryTransaction (stock OUT)
  - Create CashTransaction (cash IN)
  - Create AuditLog entry
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from datetime import date as date_today


@receiver(post_save, sender='sales.Sale')
def sale_post_save(sender, instance, created, **kwargs):
    """On new Sale: record inventory OUT + cash IN + audit log."""
    from products.models import InventoryTransaction
    from accounts.models import CashTransaction, AuditLog

    if created:
        # 1. Inventory ledger: stock goes OUT
        InventoryTransaction.objects.create(
            product=instance.product,
            txn_type=InventoryTransaction.TYPE_OUT,
            quantity=instance.quantity_sold,
            reference_type='sale',
            reference_id=instance.id,
            note=f'Sale #{instance.id} to {instance.customer_name}',
            date=instance.sale_date,
        )

        # 2. Cash ledger: money comes IN (only if PAID)
        if instance.payment_status == 'PAID':
            CashTransaction.objects.create(
                txn_type=CashTransaction.TYPE_IN,
                amount=instance.total_price,
                source_type='sale',
                source_id=instance.id,
                date=instance.sale_date,
                description=f'Sale #{instance.id} - {instance.customer_name}',
            )

        # 3. Audit log
        AuditLog.objects.create(
            entity_type='Sale',
            entity_id=instance.id,
            action='CREATE',
            new_value={
                'product_id': instance.product_id,
                'quantity_sold': instance.quantity_sold,
                'unit_price': str(instance.unit_price),
                'unit_cost_price': str(instance.unit_cost_price),
                'total_price': str(instance.total_price),
                'sale_date': str(instance.sale_date),
                'payment_status': instance.payment_status,
            }
        )
    else:
        # Update: log the change
        AuditLog.objects.create(
            entity_type='Sale',
            entity_id=instance.id,
            action='UPDATE',
            new_value={
                'payment_status': instance.payment_status,
                'total_price': str(instance.total_price),
            }
        )
