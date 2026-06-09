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


class InventoryTransaction(models.Model):
    """
    ERP Inventory Ledger — every stock movement is recorded here.
    product.stock_quantity is a cached denormalized field updated by signals.
    """
    TYPE_IN = 'IN'
    TYPE_OUT = 'OUT'
    TYPE_ADJUSTMENT = 'ADJUSTMENT'
    TYPE_CHOICES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('ADJUSTMENT', 'Adjustment'),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='inventory_transactions'
    )
    txn_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        help_text="Direction of stock movement"
    )
    quantity = models.IntegerField(
        help_text="Always positive; txn_type determines direction"
    )
    reference_type = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text="Source: sale, purchase, opening_stock, adjustment"
    )
    reference_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="FK to source record (Sale.id, Purchase.id, etc.)"
    )
    note = models.TextField(blank=True, default='')
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventory_transactions'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['product', 'date']),
            models.Index(fields=['txn_type']),
            models.Index(fields=['reference_type', 'reference_id']),
        ]

    def __str__(self):
        return f"{self.txn_type} {self.quantity} × {self.product.name} on {self.date}"
