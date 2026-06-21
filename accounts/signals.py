"""
ERP Signals for Accounts app.
Fires on Expense saves to:
  - Create / reverse CashTransaction (cash OUT)
  - Create AuditLog entry
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from decimal import Decimal


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


@receiver(post_delete, sender='accounts.Expense')
def expense_post_delete(sender, instance, **kwargs):
    """On Expense deletion: clean up journal entries and cash transactions."""
    from accounts.models import CashTransaction
    if instance.journal_entry:
        instance.journal_entry.delete()
    CashTransaction.objects.filter(source_type__in=['expense', 'expense_void'], source_id=instance.id).delete()


@receiver(post_save, sender='accounts.SalaryPayment')
def salary_payment_post_save(sender, instance, created, **kwargs):
    """
    On SalaryPayment save:
    If PAID, create/update corresponding Expense (category: PAYROLL).
    If PENDING, delete/void corresponding Expense.
    """
    from accounts.models import Expense
    from django.contrib.contenttypes.models import ContentType
    from accounts.services import AccountsService

    ct = ContentType.objects.get_for_model(instance)
    
    if instance.status == 'PAID':
        desc = f"Salary Payment for {instance.pay_period_start} to {instance.pay_period_end}"
        employee_name = instance.employee.get_full_name() or instance.employee.username
        
        expense, exp_created = Expense.objects.update_or_create(
            content_type=ct,
            object_id=instance.id,
            defaults={
                'category': 'PAYROLL',
                'amount': instance.amount,
                'tax_amount': Decimal('0.00'),
                'payment_method': instance.payment_method,
                'date': instance.payment_date or instance.pay_period_end,
                'description': desc,
                'vendor': f"Employee: {employee_name}",
                'voided': False,
                'metadata': {
                    'employee_id': instance.employee.id,
                    'employee_username': instance.employee.username,
                    'pay_period_start': str(instance.pay_period_start),
                    'pay_period_end': str(instance.pay_period_end),
                    'notes': instance.notes
                }
            }
        )
        AccountsService.post_expense_ledger(expense)
    else:
        Expense.objects.filter(content_type=ct, object_id=instance.id).delete()


@receiver(post_delete, sender='accounts.SalaryPayment')
def salary_payment_post_delete(sender, instance, **kwargs):
    """Clean up associated Expense when SalaryPayment is deleted."""
    from accounts.models import Expense
    from django.contrib.contenttypes.models import ContentType
    ct = ContentType.objects.get_for_model(instance)
    Expense.objects.filter(content_type=ct, object_id=instance.id).delete()


@receiver(post_save, sender='accounts.UtilityBill')
def utility_bill_post_save(sender, instance, created, **kwargs):
    """
    On UtilityBill save:
    If PAID, create/update corresponding Expense (category: RENT_UTILITIES).
    If UNPAID/OVERDUE, delete/void corresponding Expense.
    """
    from accounts.models import Expense
    from django.contrib.contenttypes.models import ContentType
    from accounts.services import AccountsService

    ct = ContentType.objects.get_for_model(instance)
    
    if instance.status == 'PAID':
        desc = f"{instance.get_utility_type_display()} Bill - {instance.bill_number or 'No Bill #'}"
        
        expense, exp_created = Expense.objects.update_or_create(
            content_type=ct,
            object_id=instance.id,
            defaults={
                'category': 'RENT_UTILITIES',
                'amount': instance.amount,
                'tax_amount': instance.tax_amount,
                'payment_method': instance.payment_method,
                'date': instance.payment_date or instance.due_date,
                'description': desc,
                'vendor': f"{instance.get_utility_type_display()} Utility Provider",
                'voided': False,
                'receipt': instance.receipt,
                'metadata': {
                    'utility_type': instance.utility_type,
                    'bill_number': instance.bill_number,
                    'billing_period_start': str(instance.billing_period_start) if instance.billing_period_start else None,
                    'billing_period_end': str(instance.billing_period_end) if instance.billing_period_end else None,
                    'due_date': str(instance.due_date),
                    'notes': instance.notes
                }
            }
        )
        AccountsService.post_expense_ledger(expense)
    else:
        Expense.objects.filter(content_type=ct, object_id=instance.id).delete()


@receiver(post_delete, sender='accounts.UtilityBill')
def utility_bill_post_delete(sender, instance, **kwargs):
    """Clean up associated Expense when UtilityBill is deleted."""
    from accounts.models import Expense
    from django.contrib.contenttypes.models import ContentType
    ct = ContentType.objects.get_for_model(instance)
    Expense.objects.filter(content_type=ct, object_id=instance.id).delete()


@receiver(post_save, sender='accounts.RecurringCost')
def recurring_cost_post_save(sender, instance, created, **kwargs):
    """
    On RecurringCost save:
    If PAID, create/update corresponding Expense.
    If UNPAID, delete/void corresponding Expense.
    """
    from accounts.models import Expense
    from django.contrib.contenttypes.models import ContentType
    from accounts.services import AccountsService

    ct = ContentType.objects.get_for_model(instance)
    
    if instance.status == 'PAID':
        cost_type_to_cat = {
            'RENT': 'RENT_UTILITIES',
            'SUBSCRIPTION': 'TECHNOLOGY',
            'MARKETING_CAMPAIGN': 'MARKETING',
            'MAINTENANCE': 'OTHER',
            'INSURANCE': 'OTHER',
            'OTHER': 'OTHER',
        }
        category = cost_type_to_cat.get(instance.cost_type, 'OTHER')
        desc = f"Recurring Cost: {instance.name} ({instance.get_cost_type_display()})"
        
        expense, exp_created = Expense.objects.update_or_create(
            content_type=ct,
            object_id=instance.id,
            defaults={
                'category': category,
                'amount': instance.amount,
                'tax_amount': Decimal('0.00'),
                'payment_method': instance.payment_method,
                'date': instance.payment_date or instance.due_date,
                'description': desc,
                'vendor': f"{instance.get_cost_type_display()} Vendor",
                'voided': False,
                'metadata': {
                    'cost_type': instance.cost_type,
                    'cost_name': instance.name,
                    'due_date': str(instance.due_date),
                    'notes': instance.notes
                }
            }
        )
        AccountsService.post_expense_ledger(expense)
    else:
        Expense.objects.filter(content_type=ct, object_id=instance.id).delete()


@receiver(post_delete, sender='accounts.RecurringCost')
def recurring_cost_post_delete(sender, instance, **kwargs):
    """Clean up associated Expense when RecurringCost is deleted."""
    from accounts.models import Expense
    from django.contrib.contenttypes.models import ContentType
    ct = ContentType.objects.get_for_model(instance)
    Expense.objects.filter(content_type=ct, object_id=instance.id).delete()
