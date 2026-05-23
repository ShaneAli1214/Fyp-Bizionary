from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'subcategory', 'cost_price', 'unit_price', 'stock_quantity', 'stock_status', 'is_low_stock']
    list_filter = ['category', 'subcategory', 'created_at']
    search_fields = ['name', 'sku', 'description', 'subcategory']
    readonly_fields = ['created_at', 'updated_at']
