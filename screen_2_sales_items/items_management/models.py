from django.db import models
from products.models import Product


class Category(models.Model):
    """Product categories for organization and filtering"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    parent_category = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """Multiple images for products"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    is_primary = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-is_primary', '-uploaded_at']
    
    def __str__(self):
        return f"Image for {self.product.name}"


class StockHistory(models.Model):
    """Track all stock changes for audit trail"""
    TRANSACTION_TYPES = [
        ('PURCHASE', 'Purchase'),
        ('SALE', 'Sale'),
        ('ADJUSTMENT', 'Adjustment'),
        ('RETURN', 'Return'),
        ('DAMAGE', 'Damage/Loss'),
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_history')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity_change = models.IntegerField(help_text="Positive for additions, negative for reductions")
    quantity_after = models.IntegerField(help_text="Stock quantity after this transaction")
    reference_id = models.CharField(max_length=100, blank=True, help_text="Sale ID, Purchase ID, etc.")
    notes = models.TextField(blank=True)
    created_by = models.CharField(max_length=100, default='system')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Stock Histories"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.product.name} - {self.transaction_type} - {self.quantity_change}"
