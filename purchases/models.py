from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.core.validators import MinValueValidator
from decimal import Decimal
from products.models import Product


class Purchase(models.Model):
    """
    Purchase order model for procurement management
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='purchases'
    )
    company_name = models.CharField(max_length=255)
    quantity_purchased = models.IntegerField(
        validators=[MinValueValidator(1)]
    )
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    purchase_date = models.DateField()
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('PAID', 'Paid'),
            ('UNPAID', 'Unpaid'),
            ('PARTIAL', 'Partially Paid'),
        ],
        default='UNPAID'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchases'
        ordering = ['-purchase_date', '-created_at']
        indexes = [
            models.Index(fields=['purchase_date']),
            models.Index(fields=['product']),
            models.Index(fields=['company_name']),
        ]

    def __str__(self):
        return f"Purchase #{self.id} - {self.product.name} - Rs.{self.total_cost}"

    def save(self, *args, **kwargs):
        """Calculate total_cost before saving"""
        if not self.total_cost:
            self.total_cost = self.quantity_purchased * self.unit_cost
        super().save(*args, **kwargs)


class OrderedSlip(models.Model):
    """Purchase request slip that is sent to a supplier before stock is received."""

    STATUS_PENDING = 'PENDING'
    STATUS_PARTIAL = 'PARTIAL_RECEIVED'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PARTIAL, 'Partial Received'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    EMAIL_PENDING = 'PENDING'
    EMAIL_SENT = 'SENT'
    EMAIL_FAILED = 'FAILED'
    EMAIL_STATUS_CHOICES = [
        (EMAIL_PENDING, 'Pending'),
        (EMAIL_SENT, 'Sent'),
        (EMAIL_FAILED, 'Failed'),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='ordered_slips'
    )
    company_name = models.CharField(max_length=255)
    company_email = models.EmailField(blank=True, null=True)
    quantity_ordered = models.IntegerField(validators=[MinValueValidator(1)])
    quantity_received = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING)
    email_status = models.CharField(max_length=20, choices=EMAIL_STATUS_CHOICES, default=EMAIL_PENDING)
    email_error_message = models.TextField(blank=True, null=True)
    email_sent_at = models.DateTimeField(blank=True, null=True)
    received_at = models.DateTimeField(blank=True, null=True)
    due_date = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ordered_slips'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['email_status']),
            models.Index(fields=['company_name']),
            models.Index(fields=['product']),
        ]

    def __str__(self):
        return f"Ordered Slip #{self.id} - {self.product.name} - Rs.{self.total_cost}"

    def save(self, *args, **kwargs):
        if not self.total_cost:
            self.total_cost = self.quantity_ordered * self.unit_cost
        # Ensure a default delivery due date of 2 days from creation time
        if not self.due_date:
            self.due_date = timezone.now() + timedelta(days=2)
        super().save(*args, **kwargs)

    @property
    def quantity_pending(self):
        return max(self.quantity_ordered - self.quantity_received, 0)

    @property
    def is_complete(self):
        return self.status == self.STATUS_COMPLETED
