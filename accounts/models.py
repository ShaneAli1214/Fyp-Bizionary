"""
Screen 4: Accounts & Finance Models
Independent models for financial management.
No dependencies on other apps.
"""

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Revenue(models.Model):
    """
    Revenue model to track all income sources
    """
    source = models.CharField(
        max_length=255,
        help_text="Source of revenue (e.g., Product Sales, Service Income)"
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'screen4_revenue'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['source']),
            models.Index(fields=['-date']),
        ]
        verbose_name = 'Revenue'
        verbose_name_plural = 'Revenues'

    def __str__(self):
        return f"{self.source} - Rs. {self.amount} ({self.date})"


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

    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        help_text="Expense category"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Expense amount"
    )
    date = models.DateField(
        help_text="Date when expense was incurred"
    )
    description = models.TextField(blank=True, null=True)
    vendor = models.CharField(max_length=255, blank=True, null=True)
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
    description = models.TextField(blank=True, null=True)
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

    def __str__(self):
        return f"{self.invoice_number} - {self.client_name} - Rs. {self.amount}"
