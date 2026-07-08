from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from sales.models import Sale
from purchases.models import Purchase, OrderedSlip
from invoices.models import Invoice as GlobalInvoice
from accounts.models import JournalEntry, JournalItem, Account, Revenue, Expense
from accounts.models import Invoice as AccountsInvoice
from accounts.services import AccountsService
from decimal import Decimal
from django.utils import timezone
from datetime import date


@receiver(post_save, sender=Sale)
def auto_post_sale_ledger(sender, instance, created, **kwargs):
    """
    Automatically post double-entry items for a Sale.
    Debit Cash (1010) or Accounts Receivable (1200) depending on payment_status.
    Credit Sales Revenue (4010).
    Also syncs the Sale record to the accounts.models.Revenue table.
    """
    AccountsService.ensure_coa()
    
    ref = f"SALE-{instance.id}"
    desc = f"Sales invoice for Sale #{instance.id} - {instance.customer_name}"
    
    if instance.payment_status == 'FAILED':
        JournalEntry.objects.filter(reference=ref).delete()
        Revenue.objects.filter(source=ref).delete()
        return
        
    je, je_created = JournalEntry.objects.get_or_create(
        reference=ref,
        defaults={
            'date': instance.sale_date,
            'description': desc
        }
    )
    if not je_created:
        je.date = instance.sale_date
        je.description = desc
        je.save()
        je.items.all().delete()
        
    cash_acct = Account.objects.get(code='1010')
    ar_acct = Account.objects.get(code='1200')
    debit_acct = cash_acct if instance.payment_status == 'PAID' else ar_acct
    sales_acct = Account.objects.get(code='4010')
    
    JournalItem.objects.create(journal_entry=je, account=debit_acct, debit=instance.total_price, credit=Decimal('0.00'))
    JournalItem.objects.create(journal_entry=je, account=sales_acct, debit=Decimal('0.00'), credit=instance.total_price)

    # Sync to Revenue
    revenue, rev_created = Revenue.objects.get_or_create(
        source=ref,
        defaults={
            'customer': instance.customer_name,
            'invoice_number': instance.invoice_number or ref,
            'payment_status': instance.payment_status,
            'category': 'SALES_REVENUE',
            'amount': instance.total_price,
            'date': instance.sale_date,
            'description': desc,
            'journal_entry': je
        }
    )
    if not rev_created:
        revenue.customer = instance.customer_name
        revenue.invoice_number = instance.invoice_number or ref
        revenue.payment_status = instance.payment_status
        revenue.amount = instance.total_price
        revenue.date = instance.sale_date
        revenue.description = desc
        revenue.journal_entry = je
        revenue.save()


@receiver(post_delete, sender=Sale)
def auto_delete_sale_ledger(sender, instance, **kwargs):
    """
    Delete associated JournalEntry and Revenue when a Sale is deleted.
    """
    ref = f"SALE-{instance.id}"
    JournalEntry.objects.filter(reference=ref).delete()
    Revenue.objects.filter(source=ref).delete()


@receiver(post_save, sender=Purchase)
def auto_post_purchase_ledger(sender, instance, created, **kwargs):
    """
    Automatically post double-entry items for a Purchase procurement.
    Debit COGS (5010).
    Credit Cash (1010) if PAID, Accounts Payable (2010) if UNPAID, and split if PARTIAL.
    """
    AccountsService.ensure_coa()
    
    ref = f"PURCHASE-{instance.id}"
    desc = f"Procurement purchase #{instance.id} from {instance.company_name}"
    
    je, je_created = JournalEntry.objects.get_or_create(
        reference=ref,
        defaults={
            'date': instance.purchase_date,
            'description': desc
        }
    )
    if not je_created:
        je.date = instance.purchase_date
        je.description = desc
        je.save()
        je.items.all().delete()
        
    cogs_acct = Account.objects.get(code='5010')
    cash_acct = Account.objects.get(code='1010')
    ap_acct = Account.objects.get(code='2010')
    
    JournalItem.objects.create(journal_entry=je, account=cogs_acct, debit=instance.total_cost, credit=Decimal('0.00'))
    
    if instance.payment_status == 'PAID':
        JournalItem.objects.create(journal_entry=je, account=cash_acct, debit=Decimal('0.00'), credit=instance.total_cost)
    elif instance.payment_status == 'UNPAID':
        JournalItem.objects.create(journal_entry=je, account=ap_acct, debit=Decimal('0.00'), credit=instance.total_cost)
    else:  # PARTIAL
        half = instance.total_cost / 2
        JournalItem.objects.create(journal_entry=je, account=cash_acct, debit=Decimal('0.00'), credit=half)
        JournalItem.objects.create(journal_entry=je, account=ap_acct, debit=Decimal('0.00'), credit=instance.total_cost - half)


@receiver(post_save, sender=GlobalInvoice)
def auto_sync_invoice_ledger(sender, instance, created, **kwargs):
    """
    Sync GlobalInvoice to Accounts Invoice and post ledger entries.
    """
    status_map = {
        'PAID': 'PAID',
        'UNPAID': 'PENDING',
        'PARTIALLY_PAID': 'PENDING',
        'OVERDUE': 'OVERDUE'
    }
    mapped_status = status_map.get(instance.status, 'PENDING')
    
    acc_invoice, acc_created = AccountsInvoice.objects.get_or_create(
        invoice_number=instance.invoice_number,
        defaults={
            'client_name': instance.customer_name,
            'amount': instance.total_amount,
            'balance_due': instance.balance_due,
            'status': mapped_status,
            'date': instance.invoice_date,
            'due_date': instance.due_date,
            'description': instance.notes or ''
        }
    )
    if not acc_created:
        acc_invoice.client_name = instance.customer_name
        acc_invoice.amount = instance.total_amount
        acc_invoice.balance_due = instance.balance_due
        acc_invoice.status = mapped_status
        acc_invoice.date = instance.invoice_date
        acc_invoice.due_date = instance.due_date
        acc_invoice.description = instance.notes or ''
        acc_invoice.save()


@receiver(post_delete, sender=GlobalInvoice)
def auto_delete_invoice_ledger(sender, instance, **kwargs):
    """
    Delete matching accounts Invoice and its JournalEntry when GlobalInvoice is deleted.
    """
    acc_invoice = AccountsInvoice.objects.filter(invoice_number=instance.invoice_number).first()
    if acc_invoice:
        acc_invoice.delete()


# ==================== ACCOUNTS APP INTERNAL SIGNALS ====================

@receiver(post_save, sender=Revenue)
def auto_post_revenue_ledger_signal(sender, instance, created, **kwargs):
    if kwargs.get('update_fields') and 'journal_entry' in kwargs.get('update_fields'):
        return
    # Skip if it is a synced Sale or Invoice to prevent overwriting
    if instance.source and (instance.source.startswith("SALE-") or instance.source.startswith("INV-")):
        return
    AccountsService.post_revenue_ledger(instance)


@receiver(post_delete, sender=Revenue)
def auto_delete_revenue_ledger_signal(sender, instance, **kwargs):
    if instance.journal_entry:
        instance.journal_entry.delete()


@receiver(post_save, sender=Expense)
def auto_post_expense_ledger_signal(sender, instance, created, **kwargs):
    if kwargs.get('update_fields') and 'journal_entry' in kwargs.get('update_fields'):
        return
    AccountsService.post_expense_ledger(instance)


@receiver(post_delete, sender=Expense)
def auto_delete_expense_ledger_signal(sender, instance, **kwargs):
    if instance.journal_entry:
        instance.journal_entry.delete()


@receiver(post_save, sender=AccountsInvoice)
def auto_post_invoice_ledger_signal(sender, instance, created, **kwargs):
    if kwargs.get('update_fields') and 'journal_entry' in kwargs.get('update_fields'):
        return
    AccountsService.post_invoice_ledger(instance)
    
    # Sync invoice to Revenue table to ensure consistency across Revenues tab, trend charts, and ledger KPIs
    inv = AccountsInvoice.objects.get(pk=instance.pk)
    pay_status = 'PAID' if inv.status == 'PAID' else 'PENDING'
    source_ref = inv.invoice_number if inv.invoice_number.startswith("INV-") else f"INV-{inv.invoice_number}"
    
    Revenue.objects.update_or_create(
        source=source_ref,
        defaults={
            'customer': inv.client_name,
            'invoice_number': inv.invoice_number,
            'payment_status': pay_status,
            'category': 'SALES_REVENUE',
            'amount': inv.amount,
            'date': inv.date or date.today(),
            'description': inv.description or f"Invoice {inv.invoice_number}",
            'voided': inv.voided,
            'void_reason': inv.void_reason,
            'journal_entry': inv.journal_entry
        }
    )


@receiver(post_delete, sender=AccountsInvoice)
def auto_delete_invoice_ledger_signal(sender, instance, **kwargs):
    if instance.journal_entry:
        instance.journal_entry.delete()
    # Delete synced Revenue record
    source_ref = instance.invoice_number if instance.invoice_number.startswith("INV-") else f"INV-{instance.invoice_number}"
    Revenue.objects.filter(source=source_ref).delete()


@receiver(post_save, sender=OrderedSlip)
def auto_sync_ordered_slip_expense(sender, instance, created, **kwargs):
    """
    Automatically sync Completed OrderedSlips to accounts Expenses and general ledger.
    If the slip is not completed, remove any previously synced expense.
    """
    expense_key = f'Ordered Slip #{instance.id}'
    
    if instance.status == OrderedSlip.STATUS_COMPLETED:
        description = f'{expense_key} - {instance.product.name}'
        amount = instance.total_cost
        
        # Determine date
        if instance.received_at:
            expense_date = instance.received_at.date()
        elif instance.created_at:
            expense_date = instance.created_at.date()
        else:
            expense_date = timezone.now().date()
            
        defaults = {
            'category': 'SUPPLIES',
            'amount': amount,
            'date': expense_date,
            'description': description,
            'vendor': instance.company_name,
        }
        
        expense = Expense.objects.filter(description__startswith=expense_key).first()
        if expense:
            update_fields = []
            for field_name, value in defaults.items():
                if getattr(expense, field_name) != value:
                    setattr(expense, field_name, value)
                    update_fields.append(field_name)
            if update_fields:
                expense.save(update_fields=update_fields + ['updated_at'])
        else:
            Expense.objects.create(**defaults)
    else:
        # If status is not completed, delete the corresponding expense (which cascades to delete journal entry)
        Expense.objects.filter(description__startswith=expense_key).delete()


@receiver(post_delete, sender=OrderedSlip)
def auto_delete_ordered_slip_expense(sender, instance, **kwargs):
    """
    Delete associated Expense when an OrderedSlip is deleted.
    """
    expense_key = f'Ordered Slip #{instance.id}'
    Expense.objects.filter(description__startswith=expense_key).delete()
