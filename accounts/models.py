"""
Screen 4: Accounts & Finance Models
Independent models for financial management.
No dependencies on other apps.
"""

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from datetime import date
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


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
        ('WAREHOUSE', 'Warehouse Expenses'),
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
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    source_object = GenericForeignKey('content_type', 'object_id')
    metadata = models.JSONField(null=True, blank=True, help_text="Metadata JSON for specific expense details")
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


class ExpenseBudget(models.Model):
    """
    Budget vs Actual tracking per expense category.
    'actual_spend' is always computed dynamically from the Expense table —
    never stored — to maintain the ERP principle of not duplicating data.
    """
    PERIOD_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('ANNUAL', 'Annual'),
    ]

    CATEGORY_CHOICES = [
        ('PAYROLL', 'Payroll'),
        ('MARKETING', 'Marketing'),
        ('RENT_UTILITIES', 'Rent & Utilities'),
        ('SUPPLIES', 'Supplies'),
        ('TECHNOLOGY', 'Technology'),
        ('TRAVEL', 'Travel'),
        ('WAREHOUSE', 'Warehouse Expenses'),
        ('OTHER', 'Other'),
        ('ALL', 'All Categories (Total)'),
    ]

    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        help_text="Expense category this budget applies to"
    )
    period_type = models.CharField(
        max_length=20,
        choices=PERIOD_CHOICES,
        default='MONTHLY',
        help_text="Budget period type"
    )
    year = models.IntegerField(help_text="Budget year (e.g. 2026)")
    month = models.IntegerField(
        null=True, blank=True,
        help_text="Budget month (1-12). Null for quarterly/annual budgets."
    )
    quarter = models.IntegerField(
        null=True, blank=True,
        help_text="Budget quarter (1-4). Null for monthly/annual budgets."
    )
    budgeted_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Planned budget for this period"
    )
    department = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional: restrict budget to a specific department"
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expense_budgets'
        ordering = ['-year', '-month', 'category']
        unique_together = ['category', 'period_type', 'year', 'month', 'quarter', 'department']
        indexes = [
            models.Index(fields=['year', 'month', 'category']),
            models.Index(fields=['year', 'quarter', 'category']),
        ]
        verbose_name = 'Expense Budget'
        verbose_name_plural = 'Expense Budgets'

    def get_actual_spend(self):
        """
        Actual spend = SUM(Expense.amount) for this category+period,
        computed dynamically. Never stored.
        """
        from datetime import date
        qs = Expense.objects.filter(voided=False)
        if self.category != 'ALL':
            qs = qs.filter(category=self.category)
        if self.period_type == 'MONTHLY' and self.month:
            qs = qs.filter(date__year=self.year, date__month=self.month)
        elif self.period_type == 'QUARTERLY' and self.quarter:
            start_month = (self.quarter - 1) * 3 + 1
            end_month = start_month + 2
            qs = qs.filter(date__year=self.year, date__month__gte=start_month, date__month__lte=end_month)
        elif self.period_type == 'ANNUAL':
            qs = qs.filter(date__year=self.year)
        return qs.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')

    @property
    def variance(self):
        """Variance = Budgeted - Actual. Positive = under budget."""
        return self.budgeted_amount - self.get_actual_spend()

    @property
    def utilization_pct(self):
        """Percentage of budget consumed."""
        if not self.budgeted_amount:
            return 0.0
        return float(round(self.get_actual_spend() / self.budgeted_amount * 100, 1))

    def __str__(self):
        period = f"{self.year}"
        if self.month:
            period += f"-{self.month:02d}"
        elif self.quarter:
            period += f"-Q{self.quarter}"
        return f"Budget: {self.category} {period} = Rs.{self.budgeted_amount}"


class InvoicePayment(models.Model):
    """
    Individual payment instalments against an Invoice.
    Enables proper AR tracking and partial payment support.
    Invoice.balance_due should be computed from this table,
    not stored as a mutable field.
    """
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CARD', 'Card'),
        ('CHEQUE', 'Cheque'),
        ('OTHER', 'Other'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments',
        help_text="Invoice this payment is against"
    )
    amount_paid = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Amount paid in this instalment"
    )
    payment_date = models.DateField(help_text="Date payment was received")
    payment_method = models.CharField(
        max_length=50,
        choices=PAYMENT_METHOD_CHOICES,
        default='CASH'
    )
    reference = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Bank reference, cheque number, etc."
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoice_payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['invoice', '-payment_date']),
        ]
        verbose_name = 'Invoice Payment'
        verbose_name_plural = 'Invoice Payments'

    def __str__(self):
        return f"Payment of Rs.{self.amount_paid} for {self.invoice.invoice_number} on {self.payment_date}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Automatically update invoice status and balance_due after payment
        invoice = self.invoice
        total_paid = invoice.payments.aggregate(
            total=models.Sum('amount_paid')
        )['total'] or Decimal('0.00')
        invoice.balance_due = max(Decimal('0.00'), invoice.amount - total_paid)
        if invoice.balance_due == Decimal('0.00'):
            invoice.status = 'PAID'
        elif total_paid > Decimal('0.00'):
            invoice.status = 'PENDING'
        invoice.save(update_fields=['balance_due', 'status', 'updated_at'])


class SalaryPayment(models.Model):
    """
    Model to track employee salary payments.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CREDIT_CARD', 'Credit Card'),
    ]
    
    employee = models.ForeignKey(
        'user_management.ERPUser',
        on_delete=models.PROTECT,
        related_name='salary_payments',
        help_text="Employee receiving the salary"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Base/Net salary amount paid"
    )
    pay_period_start = models.DateField(help_text="Start date of pay period")
    pay_period_end = models.DateField(help_text="End date of pay period")
    payment_date = models.DateField(help_text="Date when salary was paid", null=True, blank=True)
    payment_method = models.CharField(
        max_length=50,
        choices=PAYMENT_METHOD_CHOICES,
        default='BANK_TRANSFER'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'salary_payments'
        ordering = ['-pay_period_end', '-created_at']

    def __str__(self):
        return f"Salary: {self.employee.get_full_name() or self.employee.username} - Rs.{self.amount} ({self.pay_period_end})"


class UtilityBill(models.Model):
    """
    Model to track utility bills (electricity, water, internet, etc.).
    """
    UTILITY_TYPE_CHOICES = [
        ('ELECTRICITY', 'Electricity'),
        ('WATER', 'Water'),
        ('GAS', 'Gas'),
        ('INTERNET', 'Internet/Phone'),
        ('OTHER', 'Other Utilities'),
    ]
    STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CREDIT_CARD', 'Credit Card'),
    ]

    utility_type = models.CharField(
        max_length=50,
        choices=UTILITY_TYPE_CHOICES,
        default='ELECTRICITY'
    )
    bill_number = models.CharField(max_length=100, blank=True, null=True, help_text="Bill reference/invoice number")
    billing_period_start = models.DateField(help_text="Billing period start date", null=True, blank=True)
    billing_period_end = models.DateField(help_text="Billing period end date", null=True, blank=True)
    due_date = models.DateField(help_text="Due date for payment")
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Bill amount (inclusive of taxes)"
    )
    tax_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Tax component in the bill"
    )
    payment_date = models.DateField(help_text="Date when bill was paid", null=True, blank=True)
    payment_method = models.CharField(
        max_length=50,
        choices=PAYMENT_METHOD_CHOICES,
        default='CASH'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='UNPAID'
    )
    notes = models.TextField(blank=True, null=True)
    receipt = models.CharField(max_length=500, blank=True, null=True, help_text="Link or path to bill receipt/document")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utility_bills'
        ordering = ['-due_date', '-created_at']

    def __str__(self):
        return f"{self.get_utility_type_display()} Bill - Rs.{self.amount} (Due: {self.due_date})"


class RecurringCost(models.Model):
    """
    Model to track other recurring operational costs (rent, subscriptions, etc.).
    """
    COST_TYPE_CHOICES = [
        ('RENT', 'Rent'),
        ('SUBSCRIPTION', 'Software Subscription'),
        ('MARKETING_CAMPAIGN', 'Marketing/Ads Campaign'),
        ('MAINTENANCE', 'Office Maintenance'),
        ('INSURANCE', 'Insurance'),
        ('OTHER', 'Other Operating Cost'),
    ]
    STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PAID', 'Paid'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CREDIT_CARD', 'Credit Card'),
    ]

    cost_type = models.CharField(
        max_length=50,
        choices=COST_TYPE_CHOICES,
        default='RENT'
    )
    name = models.CharField(max_length=255, help_text="Name of the cost (e.g., Office Rent, Adobe Creative Suite)")
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Cost amount"
    )
    due_date = models.DateField(help_text="Due date for payment")
    payment_date = models.DateField(help_text="Date when cost was paid", null=True, blank=True)
    payment_method = models.CharField(
        max_length=50,
        choices=PAYMENT_METHOD_CHOICES,
        default='BANK_TRANSFER'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='UNPAID'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'recurring_operational_costs'
        ordering = ['-due_date', '-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_cost_type_display()}) - Rs.{self.amount} (Due: {self.due_date})"
