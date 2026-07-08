from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import F
from django.db import transaction


@receiver(post_save, sender='products.InventoryTransaction')
def update_product_stock_on_save(sender, instance, created, **kwargs):
    """
    Every inventory transaction creation atomically updates Product.stock_quantity.
    Truth lives in the InventoryTransaction ledger; stock_quantity is a cached field.
    """
    if created:
        delta = instance.quantity if instance.txn_type == 'IN' else -instance.quantity
        from products.models import Product
        with transaction.atomic():
            product = Product.objects.select_for_update().get(pk=instance.product_id)
            product.stock_quantity += delta
            product.save(update_fields=['stock_quantity', 'shop_stock', 'warehouse_stock'])


@receiver(post_delete, sender='products.InventoryTransaction')
def update_product_stock_on_delete(sender, instance, **kwargs):
    """
    On deleting an inventory transaction, reverse its stock impact atomically.
    """
    delta = -instance.quantity if instance.txn_type == 'IN' else instance.quantity
    from products.models import Product
    with transaction.atomic():
        product = Product.objects.select_for_update().get(pk=instance.product_id)
        product.stock_quantity += delta
        product.save(update_fields=['stock_quantity', 'shop_stock', 'warehouse_stock'])


@receiver(post_save, sender='sales.Sale')
def sale_post_save(sender, instance, created, **kwargs):
    """On new Sale: record inventory OUT + cash IN (if PAID) + audit log."""
    from products.models import InventoryTransaction
    from accounts.models import CashTransaction, AuditLog

    if created:
        # 1. Inventory ledger: stock goes OUT (triggers update_product_stock_on_save)
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
        # 1. Update Inventory Ledger: delete old entries and create new ones to reflect current sale state.
        # This handles updating quantity or product.
        # When deleted, post_delete signals restore stock; when created, post_save signals deduct stock.
        InventoryTransaction.objects.filter(reference_type='sale', reference_id=instance.id).delete()
        InventoryTransaction.objects.create(
            product=instance.product,
            txn_type=InventoryTransaction.TYPE_OUT,
            quantity=instance.quantity_sold,
            reference_type='sale',
            reference_id=instance.id,
            note=f'Sale #{instance.id} to {instance.customer_name} (Updated)',
            date=instance.sale_date,
        )

        # 2. Update Cash Ledger: if payment_status is PAID, ensure we have a cash inflow.
        # If it is PENDING/FAILED, ensure we delete any existing cash inflow.
        if instance.payment_status == 'PAID':
            CashTransaction.objects.update_or_create(
                source_type='sale',
                source_id=instance.id,
                txn_type=CashTransaction.TYPE_IN,
                defaults={
                    'amount': instance.total_price,
                    'date': instance.sale_date,
                    'description': f'Sale #{instance.id} - {instance.customer_name} (Updated)',
                }
            )
        else:
            CashTransaction.objects.filter(
                source_type='sale',
                source_id=instance.id,
                txn_type=CashTransaction.TYPE_IN
            ).delete()

        # 3. Log update
        AuditLog.objects.create(
            entity_type='Sale',
            entity_id=instance.id,
            action='UPDATE',
            new_value={
                'product_id': instance.product_id,
                'quantity_sold': instance.quantity_sold,
                'unit_price': str(instance.unit_price),
                'total_price': str(instance.total_price),
                'payment_status': instance.payment_status,
                'sale_date': str(instance.sale_date),
            }
        )


@receiver(post_delete, sender='sales.Sale')
def sale_post_delete(sender, instance, **kwargs):
    """On Sale deletion: reverse ledger transactions (inventory & cash) + log audit."""
    from products.models import InventoryTransaction
    from accounts.models import CashTransaction, AuditLog

    # Deleting the inventory transaction automatically reverses the stock impact via signals
    InventoryTransaction.objects.filter(reference_type='sale', reference_id=instance.id).delete()
    CashTransaction.objects.filter(source_type='sale', source_id=instance.id).delete()

    AuditLog.objects.create(
        entity_type='Sale',
        entity_id=instance.id,
        action='DELETE',
        old_value={
            'product_id': instance.product_id,
            'quantity_sold': instance.quantity_sold,
            'total_price': str(instance.total_price),
            'sale_date': str(instance.sale_date),
        }
    )


@receiver(post_save, sender='sales.SaleReturn')
def sale_return_post_save(sender, instance, created, **kwargs):
    """On new SaleReturn: record inventory IN + cash OUT + audit log."""
    from products.models import InventoryTransaction
    from accounts.models import CashTransaction, AuditLog

    if created:
        # 1. Inventory ledger: stock goes IN (reverses sale OUT)
        InventoryTransaction.objects.create(
            product=instance.product,
            txn_type=InventoryTransaction.TYPE_IN,
            quantity=instance.quantity_returned,
            reference_type='sale_return',
            reference_id=instance.id,
            note=f'Return #{instance.id} for Sale #{instance.sale.id} - Reason: {instance.reason}',
            date=instance.return_date,
        )

        # 2. Cash ledger: money goes OUT (refund)
        CashTransaction.objects.create(
            txn_type=CashTransaction.TYPE_OUT,
            amount=instance.refund_amount,
            source_type='other',
            source_id=instance.id,
            date=instance.return_date,
            description=f'Refund for Return #{instance.id} (Sale #{instance.sale.id})',
        )

        # 3. Audit log
        AuditLog.objects.create(
            entity_type='SaleReturn',
            entity_id=instance.id,
            action='CREATE',
            new_value={
                'sale_id': instance.sale_id,
                'product_id': instance.product_id,
                'quantity_returned': instance.quantity_returned,
                'refund_amount': str(instance.refund_amount),
                'return_date': str(instance.return_date),
            }
        )


@receiver(post_delete, sender='sales.SaleReturn')
def sale_return_post_delete(sender, instance, **kwargs):
    """On SaleReturn deletion: reverse ledger entries."""
    from products.models import InventoryTransaction
    from accounts.models import CashTransaction, AuditLog

    InventoryTransaction.objects.filter(reference_type='sale_return', reference_id=instance.id).delete()
    CashTransaction.objects.filter(
        source_type='other',
        source_id=instance.id,
        txn_type=CashTransaction.TYPE_OUT
    ).delete()

    AuditLog.objects.create(
        entity_type='SaleReturn',
        entity_id=instance.id,
        action='DELETE',
        old_value={
            'sale_id': instance.sale_id,
            'product_id': instance.product_id,
            'quantity_returned': instance.quantity_returned,
            'refund_amount': str(instance.refund_amount),
        }
    )

