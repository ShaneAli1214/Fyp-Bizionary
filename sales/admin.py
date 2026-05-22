from django.contrib import admin
from .models import Sale


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'customer_name', 'quantity_sold', 'total_price', 'sale_date']
    list_filter = ['sale_date', 'payment_method']
    search_fields = ['customer_name', 'product__name']
    readonly_fields = ['created_at', 'updated_at', 'total_price']
    date_hierarchy = 'sale_date'
