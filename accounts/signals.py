"""
ERP Signals for Accounts app.
Fires on Expense saves to:
  - Create / reverse CashTransaction (cash OUT)
  - Create AuditLog entry
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='accounts.Expense')
def expense_post_save(sender, instance, created, **kwargs):
    """On new active Expense: cash OUT. On void: create a reversal."""
    from accounts.models import CashTransaction, AuditLog

    if created and not instance.voided:
        # New active expense → cash OUT
        CashTransaction.objects.create(
            txn_type=CashTransaction.TYPE_OUT,
            amount=instance.amount,
            source_type='expense',
            source_id=instance.id,
            date=instance.date,
            description=f'Expense: {instance.vendor or instance.category} ({instance.get_category_display()})',
        )
        AuditLog.objects.create(
            entity_type='Expense',
            entity_id=instance.id,
            action='CREATE',
            new_value={
                'category': instance.category,
                'amount': str(instance.amount),
                'vendor': instance.vendor,
                'date': str(instance.date),
                'voided': instance.voided,
            }
        )

    elif not created and instance.voided:
        # Voided → remove the cash outflow by creating a reversal IN entry
        already_reversed = CashTransaction.objects.filter(
            source_type='expense_void',
            source_id=instance.id
        ).exists()
        if not already_reversed:
            CashTransaction.objects.create(
                txn_type=CashTransaction.TYPE_IN,
                amount=instance.amount,
                source_type='expense_void',
                source_id=instance.id,
                date=instance.date,
                description=f'VOID of Expense #{instance.id}: {instance.void_reason or ""}',
            )
        AuditLog.objects.create(
            entity_type='Expense',
            entity_id=instance.id,
            action='VOID',
            new_value={'void_reason': instance.void_reason, 'amount': str(instance.amount)}
        )

    elif not created and not instance.voided:
        AuditLog.objects.create(
            entity_type='Expense',
            entity_id=instance.id,
            action='UPDATE',
            new_value={'amount': str(instance.amount), 'category': instance.category}
        )
