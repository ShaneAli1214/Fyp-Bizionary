from django.contrib import admin
from .models import Category, ProductImage, StockHistory


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent_category', 'created_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'is_primary', 'uploaded_at']
    list_filter = ['is_primary', 'uploaded_at']
    search_fields = ['product__name']


@admin.register(StockHistory)
class StockHistoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'transaction_type', 'quantity_change', 'quantity_after', 'created_at', 'created_by']
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['product__name', 'reference_id', 'notes']
    readonly_fields = ['created_at']
