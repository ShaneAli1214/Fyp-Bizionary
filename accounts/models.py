"""
Screen 4: Accounts & Finance Models
Independent models for financial management.
No dependencies on other apps.
"""

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from datetime import date


class Account(models.Model):
    """
    Chart of Accounts (COA) Model.
    Supports a hierarchical structure of financial accounts.
    """
    ACCOUNT_TYPE_CHOICES = [
        ('ASSET', 'Asset'),
        ('LIABILITY', 'Liability'),
        ('EQUITY', 'Equity'),
        ('REVENUE', 'Revenue'),
        ('EXPENSE', 'Expense'),
    ]

    code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique account code (e.g., 1010)"
    )
    name = models.CharField(
        max_length=100,
        help_text="Account name (e.g., Cash, Accounts Receivable)"
    )
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPE_CHOICES,
        help_text="Root category"
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        help_text="Parent account for hierarchy"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Active status"
    )

    class Meta:
        db_table = 'accounts_coa_account'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_account_type_display()})"


class JournalEntry(models.Model):
    """
    JournalEntry representing a single double-entry transaction.
    """
    date = models.DateField(help_text="Transaction date")
    description = models.CharField(max_length=255, help_text="Transaction description")
    reference = models.CharField(max_length=100, blank=True, null=True, help_text="Reference document or ID")
    voided = models.BooleanField(default=False, help_text="Whether this transaction has been voided")
    void_reason = models.TextField(blank=True, null=True, help_text="Reason for voiding")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_journal_entry'
        ordering = ['-date', '-created_at']

    def __str__(self):
        prefix = "[VOIDED] " if self.voided else ""
        return f"{prefix}Entry on {self.date}: {self.description}"


class JournalItem(models.Model):
    """
    Individual debit/credit line items inside a JournalEntry.
    """
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name='items'
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='journal_items'
    )
    debit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    credit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )

    class Meta:
        db_table = 'accounts_journal_item'

    def __str__(self):
        return f"{self.account.name} | Dr: {self.debit} | Cr: {self.credit}"


class Revenue(models.Model):
    """
    Revenue model to track all income sources
    """
    REVENUE_CATEGORY_CHOICES = [
        ('SALES_REVENUE', 'Sales Revenue'),
        ('SERVICE_INCOME', 'Service Income'),
        ('OTHER_INCOME', 'Other Income'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('PAID', 'Paid'),
        ('PENDING', 'Pending'),
        ('OVERDUE', 'Overdue'),
    ]

    source = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Legacy source / name"
    )
    customer = models.CharField(
        max_length=255,
        default='General Customer',
        help_text="Customer name"
    )
    invoice_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Associated Invoice Number"
    )
    payment_status = models.CharField(
        max_length=50,
        choices=PAYMENT_STATUS_CHOICES,
        default='PAID',
        help_text="Payment status"
    )
    category = models.CharField(
        max_length=100,
        choices=REVENUE_CATEGORY_CHOICES,
        default='SALES_REVENUE',
        help_text="Revenue Category"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Revenue amount"
    )
    date = models.DateField(
        help_text="Date when revenue was received"
    )
    description = models.TextField(blank=True, null=True)
    voided = models.BooleanField(default=False)
    void_reason = models.TextField(blank=True, null=True)
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revenues'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'screen4_revenue'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['customer']),
            models.Index(fields=['-date']),
        ]
        verbose_name = 'Revenue'
        verbose_name_plural = 'Revenues'

    def __str__(self):
        return f"{self.customer} - Rs. {self.amount} ({self.date})"


class Expense(models.Model):
    """
    Expense model to track all business expenses
    """
    CATEGORY_CHOICES = [
        ('PAYROLL', 'Payroll'),
        ('MARKETING', 'Marketing'),
        ('RENT_UTILITIES', 'Rent & Utilities'),
        ('SUPPLIES', 'Supplies'),
        ('TECHNOLOGY', 'Technology'),
        ('TRAVEL', 'Travel'),
        ('OTHER', 'Other'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CREDIT_CARD', 'Credit Card'),
    ]

    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        help_text="Expense category"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total expense amount (inclusive of tax)"
    )
    tax_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Tax component"
    )
    payment_method = models.CharField(
        max_length=50,
        choices=PAYMENT_METHOD_CHOICES,
        default='CASH',
        help_text="Payment Method"
    )
    receipt = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL or path to receipt image/file"
    )
    date = models.DateField(
        help_text="Date when expense was incurred"
    )
    description = models.TextField(blank=True, null=True)
    vendor = models.CharField(max_length=255, blank=True, null=True)
    voided = models.BooleanField(default=False)
    void_reason = models.TextField(blank=True, null=True)
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'screen4_expense'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['category']),
            models.Index(fields=['-date']),
        ]
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'

    def __str__(self):
        return f"{self.get_category_display()} - Rs. {self.amount} ({self.date})"


class Invoice(models.Model):
    """
    Invoice model to track invoices issued to clients
    """
    STATUS_CHOICES = [
        ('PAID', 'Paid'),
        ('PENDING', 'Pending'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    ]

    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique invoice identifier"
    )
    client_name = models.CharField(
        max_length=255,
        help_text="Name of the client"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Invoice amount"
    )
    balance_due = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Outstanding balance due"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text="Payment status of invoice"
    )
    due_date = models.DateField(
        help_text="Payment due date",
        null=True,
        blank=True
    )
    date = models.DateField(
        default=date.today,
        help_text="Invoice date"
    )
    description = models.TextField(blank=True, null=True)
    voided = models.BooleanField(default=False)
    void_reason = models.TextField(blank=True, null=True)
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Invoice creation date"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'screen4_invoice'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'

    @property
    def aging(self):
        """
        Calculate aging in days since due date if pending/overdue and in past.
        """
        if self.status != 'PAID' and not self.voided and self.due_date and self.due_date < date.today():
            return (date.today() - self.due_date).days
        return 0

    def __str__(self):
        return f"{self.invoice_number} - {self.client_name} - Rs. {self.amount}"


class CashTransaction(models.Model):
    """
    ERP Cash Flow Ledger — every money movement (in or out) is recorded here.
    Net Cash Flow is always computed from this table, never stored.
    """
    TYPE_IN = 'IN'
    TYPE_OUT = 'OUT'
    TYPE_CHOICES = [
        ('IN', 'Cash Inflow'),
        ('OUT', 'Cash Outflow'),
    ]
    SOURCE_CHOICES = [
        ('sale', 'Sale'),
        ('expense', 'Expense'),
        ('purchase', 'Purchase'),
        ('other', 'Other'),
    ]

    txn_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    source_type = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='other')
    source_id = models.IntegerField(null=True, blank=True)
    date = models.DateField()
    description = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cash_transactions'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['txn_type', 'date']),
            models.Index(fields=['source_type', 'source_id']),
        ]

    def __str__(self):
        return f"{self.txn_type} Rs.{self.amount} [{self.source_type}#{self.source_id}] on {self.date}"


class AuditLog(models.Model):
    """
    Immutable audit trail for all create / update / void / delete actions.
    Never delete records from this table.
    """
    entity_type = models.CharField(max_length=100, help_text="Model name: Sale, Expense, Product, etc.")
    entity_id = models.IntegerField()
    action = models.CharField(max_length=20, help_text="CREATE, UPDATE, DELETE, VOID")
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    changed_by = models.CharField(max_length=255, blank=True, default='system')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"[{self.action}] {self.entity_type}#{self.entity_id} at {self.timestamp}"
