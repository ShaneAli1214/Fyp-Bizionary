from django.contrib import admin
from .models import Purchase, OrderedSlip, SupplierCompany


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'company_name', 'quantity_purchased', 'total_cost', 'purchase_date', 'payment_status']
    list_filter = ['purchase_date', 'payment_status']
    search_fields = ['company_name', 'product__name']
    readonly_fields = ['created_at', 'updated_at', 'total_cost']
    date_hierarchy = 'purchase_date'


@admin.register(OrderedSlip)
class OrderedSlipAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'company_name', 'quantity_ordered', 'quantity_received', 'status', 'email_status', 'total_cost', 'created_at']
    list_filter = ['status', 'email_status', 'created_at']
    search_fields = ['company_name', 'company_email', 'product__name', 'product__sku']
    readonly_fields = ['created_at', 'updated_at', 'total_cost', 'email_sent_at', 'received_at']
    date_hierarchy = 'created_at'


@admin.register(SupplierCompany)
class SupplierCompanyAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category', 'contact_number', 'email', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['name', 'contact_number', 'email', 'category']
    readonly_fields = ['created_at', 'updated_at']
