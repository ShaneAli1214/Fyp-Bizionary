from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer_name', 'invoice_date', 'total_amount', 'status', 'is_overdue']
    list_filter = ['status', 'invoice_date', 'due_date']
    search_fields = ['invoice_number', 'customer_name', 'customer_email']
    readonly_fields = ['created_at', 'updated_at', 'balance_due']
    date_hierarchy = 'invoice_date'
