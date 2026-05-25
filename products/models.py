from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Product(models.Model):
    """
    Product model for inventory management
    """
    STATUS_ACTIVE = 'ACTIVE'
    STATUS_INACTIVE = 'INACTIVE'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=150, blank=True, null=True)
    brand = models.CharField(max_length=150, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    unit_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    stock_quantity = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    min_stock = models.IntegerField(
        default=20,
        validators=[MinValueValidator(0)]
    )
    supplier = models.ForeignKey(
        'purchases.SupplierCompany',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='products'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['category']),
            models.Index(fields=['stock_quantity']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def is_low_stock(self):
        """Check if product is below reorder level"""
        return self.stock_quantity < self.min_stock

    @property
    def stock_status(self):
        """Return a human-readable stock status."""
        if self.stock_quantity <= 0:
            return 'Out of Stock'
        if self.stock_quantity <= self.min_stock:
            return 'Low Stock'
        return 'In Stock'

    @property
    def sale_price(self):
        """Backward-compatible alias for the selling price."""
        return self.unit_price

    @property
    def profit_margin(self):
        """Selling price minus purchase price."""
        return self.unit_price - self.cost_price

    @property
    def inventory_value(self):
        """Calculate total inventory value for this product using cost price."""
        return self.stock_quantity * self.cost_price
