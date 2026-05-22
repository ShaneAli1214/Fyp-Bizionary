from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from products.models import Product


class Sale(models.Model):
    """
    Sales transaction model
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='sales'
    )
    customer_name = models.CharField(max_length=255)
    quantity_sold = models.IntegerField(
        validators=[MinValueValidator(1)]
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    invoice_number = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('PAID', 'Paid'),
            ('PENDING', 'Pending'),
            ('FAILED', 'Failed'),
        ],
        default='PAID'
    )
    sale_date = models.DateField()
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('CASH', 'Cash'),
            ('CARD', 'Card'),
            ('BANK_TRANSFER', 'Bank Transfer'),
            ('OTHER', 'Other'),
        ],
        default='CASH'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales'
        ordering = ['-sale_date', '-created_at']
        indexes = [
            models.Index(fields=['sale_date']),
            models.Index(fields=['product']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"Sale #{self.id} - {self.product.name} - Rs.{self.total_price}"

    def save(self, *args, **kwargs):
        """Calculate total_price before saving"""
        if not self.total_price:
            self.total_price = self.quantity_sold * self.unit_price
        super().save(*args, **kwargs)
