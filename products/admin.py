from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'subcategory', 'unit_price', 'stock_quantity', 'is_low_stock']
    list_filter = ['category', 'subcategory', 'created_at']
    search_fields = ['name', 'sku', 'description', 'subcategory']
    readonly_fields = ['created_at', 'updated_at']
