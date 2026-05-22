"""
Screen 4: Accounts & Finance - Django Admin Configuration
Admin interface for managing financial data
"""

from django.contrib import admin
from .models import Revenue, Expense, Invoice


@admin.register(Revenue)
class RevenueAdmin(admin.ModelAdmin):
    """Admin interface for Revenue model"""
    
    list_display = [
        'id',
        'source',
        'amount',
        'date',
        'created_at'
    ]
    list_filter = ['source', 'date', 'created_at']
    search_fields = ['source', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
    
    fieldsets = (
        ('Revenue Information', {
            'fields': ('source', 'amount', 'date', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    """Admin interface for Expense model"""
    
    list_display = [
        'id',
        'category',
        'amount',
        'vendor',
        'date',
        'created_at'
    ]
    list_filter = ['category', 'date', 'vendor', 'created_at']
    search_fields = ['category', 'vendor', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
    
    fieldsets = (
        ('Expense Information', {
            'fields': ('category', 'amount', 'date', 'vendor', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Admin interface for Invoice model"""
    
    list_display = [
        'invoice_number',
        'client_name',
        'amount',
        'status',
        'due_date',
        'created_at'
    ]
    list_filter = ['status', 'created_at', 'due_date']
    search_fields = ['invoice_number', 'client_name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Invoice Details', {
            'fields': ('invoice_number', 'client_name', 'amount', 'status')
        }),
        ('Additional Information', {
            'fields': ('due_date', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Add color coding for status
    def get_list_display_links(self, request, list_display):
        return ['invoice_number']
