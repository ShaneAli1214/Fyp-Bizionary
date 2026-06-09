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
    line_items = models.JSONField(default=list, blank=True)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        default=Decimal('0.00')
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
            ('EASYPAY_JAZZCASH', 'Easypaisa/Jazz Cash'),
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
        if self.line_items:
            item_count = len(self.line_items)
            item_label = self.line_items[0].get('product_name') if item_count == 1 else f'{item_count} items'
        else:
            item_label = self.product.name
        return f"Sale #{self.id} - {item_label} - Rs.{self.total_price}"

    def save(self, *args, **kwargs):
        """Calculate total_price and snapshot cost before saving"""
        if not self.total_price:
            self.total_price = self.quantity_sold * self.unit_price
        
        if not self.pk:
            self.unit_cost_price = self.product.cost_price
            
        super().save(*args, **kwargs)
