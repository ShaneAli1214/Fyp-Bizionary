"""
ERP Signals for Purchases app.

Fires on Purchase and OrderedSlip saves to:
  - Create InventoryTransaction (stock IN)
  - Create CashTransaction (cash OUT if PAID)
  - Create AuditLog entry

This completes the full ERP accounting chain:
  Purchase PAID → stock increases → cash decreases → audit trail created
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver(post_save, sender='purchases.Purchase')
def purchase_post_save(sender, instance, created, **kwargs):
    """
    On new Purchase: record inventory IN + cash OUT (if PAID) + audit log.
    A Purchase record represents a completed goods receipt from a supplier.
    """
    from products.models import InventoryTransaction
    from accounts.models import CashTransaction, AuditLog

    # Skip inventory ledger creation if this is a multiline purchase order.
    # The PurchaseLineItem signals will create individual line inventory transactions.
    is_multiline = getattr(instance, '_is_multiline', False)

    if created:
        # 1. Inventory ledger: stock goes IN (only for legacy/single product purchases)
        if not is_multiline:
            InventoryTransaction.objects.create(
                product=instance.product,
                txn_type=InventoryTransaction.TYPE_IN,
                quantity=instance.quantity_purchased,
                reference_type='purchase',
                reference_id=instance.id,
                note=f'Purchase #{instance.id} from {instance.company_name}',
                date=instance.purchase_date,
            )

        # 2. Cash ledger: money goes OUT (only if PAID)
        if instance.payment_status == 'PAID':
            CashTransaction.objects.create(
                txn_type=CashTransaction.TYPE_OUT,
                amount=instance.total_cost,
                source_type='purchase',
                source_id=instance.id,
                date=instance.purchase_date,
                description=f'Purchase #{instance.id} from {instance.company_name}',
            )

        # 3. Audit log
        AuditLog.objects.create(
            entity_type='Purchase',
            entity_id=instance.id,
            action='CREATE',
            new_value={
                'product_id': instance.product_id,
                'quantity_purchased': instance.quantity_purchased,
                'unit_cost': str(instance.unit_cost),
                'total_cost': str(instance.total_cost),
                'purchase_date': str(instance.purchase_date),
                'payment_status': instance.payment_status,
                'company_name': instance.company_name,
            }
        )

    else:
        # Update: if payment_status is PAID, ensure we have a cash outflow.
        # If it is UNPAID/PARTIAL, ensure we delete any existing cash outflow.
        if instance.payment_status == 'PAID':
            CashTransaction.objects.update_or_create(
                source_type='purchase',
                source_id=instance.id,
                txn_type=CashTransaction.TYPE_OUT,
                defaults={
                    'amount': instance.total_cost,
                    'date': instance.purchase_date,
                    'description': f'Payment for Purchase #{instance.id} (Updated)',
                }
            )
        else:
            CashTransaction.objects.filter(
                source_type='purchase',
                source_id=instance.id,
                txn_type=CashTransaction.TYPE_OUT
            ).delete()

        AuditLog.objects.create(
            entity_type='Purchase',
            entity_id=instance.id,
            action='UPDATE',
            new_value={
                'payment_status': instance.payment_status,
                'total_cost': str(instance.total_cost),
            }
        )


@receiver(post_save, sender='purchases.PurchaseLineItem')
def purchase_line_item_post_save(sender, instance, created, **kwargs):
    """On PurchaseLineItem save: create/update InventoryTransaction(IN)."""
    from products.models import InventoryTransaction

    # If the transaction already exists, update it. Otherwise create it.
    InventoryTransaction.objects.update_or_create(
        reference_type='purchase_line_item',
        reference_id=instance.id,
        defaults={
            'product': instance.product,
            'txn_type': InventoryTransaction.TYPE_IN,
            'quantity': instance.quantity,
            'note': f'Purchase #{instance.purchase.id} Line Item from {instance.purchase.company_name}',
            'date': instance.purchase.purchase_date,
        }
    )


@receiver(post_delete, sender='purchases.PurchaseLineItem')
def purchase_line_item_post_delete(sender, instance, **kwargs):
    """On PurchaseLineItem deletion: delete associated InventoryTransaction."""
    from products.models import InventoryTransaction
    InventoryTransaction.objects.filter(reference_type='purchase_line_item', reference_id=instance.id).delete()


@receiver(post_delete, sender='purchases.Purchase')
def purchase_post_delete(sender, instance, **kwargs):
    """On Purchase deletion: reverse cash transactions & legacy inventory transactions."""
    from products.models import InventoryTransaction
    from accounts.models import CashTransaction, AuditLog

    # Legacy inventory transactions
    InventoryTransaction.objects.filter(reference_type='purchase', reference_id=instance.id).delete()
    # Cash transaction
    CashTransaction.objects.filter(source_type='purchase', source_id=instance.id).delete()

    AuditLog.objects.create(
        entity_type='Purchase',
        entity_id=instance.id,
        action='DELETE',
        old_value={
            'product_id': instance.product_id,
            'quantity_purchased': instance.quantity_purchased,
            'total_cost': str(instance.total_cost),
            'company_name': instance.company_name,
        }
    )


@receiver(post_save, sender='purchases.OrderedSlip')
def ordered_slip_post_save(sender, instance, created, **kwargs):
    """
    On OrderedSlip save: log audit record.
    The actual stock update and ledger transactions are created in the view via
    _apply_receipt_to_inventory() when stock is received.
    """
    from accounts.models import AuditLog

    AuditLog.objects.create(
        entity_type='OrderedSlip',
        entity_id=instance.id,
        action='UPDATE' if not created else 'CREATE',
        new_value={
            'status': instance.status,
            'quantity_received': instance.quantity_received,
            'quantity_ordered': instance.quantity_ordered,
        }
    )
