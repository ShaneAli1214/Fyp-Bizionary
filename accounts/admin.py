"""
Screen 4: Accounts & Finance - Django Admin Configuration
Admin interface for managing financial data
"""

from django.contrib import admin
from .models import Revenue, Expense, Invoice, Account, JournalEntry, JournalItem


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'account_type', 'parent', 'is_active']
    list_filter = ['account_type', 'is_active']
    search_fields = ['code', 'name']
    ordering = ['code']


class JournalItemInline(admin.TabularInline):
    model = JournalItem
    extra = 2


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ['id', 'date', 'description', 'reference', 'voided', 'created_at']
    list_filter = ['voided', 'date']
    search_fields = ['description', 'reference']
    inlines = [JournalItemInline]


@admin.register(Revenue)
class RevenueAdmin(admin.ModelAdmin):
    """Admin interface for Revenue model"""
    
    list_display = [
        'id',
        'customer',
        'invoice_number',
        'payment_status',
        'category',
        'amount',
        'date',
        'voided',
        'created_at'
    ]
    list_filter = ['payment_status', 'category', 'date', 'voided', 'created_at']
    search_fields = ['customer', 'invoice_number', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
    
    fieldsets = (
        ('Revenue Information', {
            'fields': ('customer', 'invoice_number', 'payment_status', 'category', 'amount', 'date', 'description')
        }),
        ('Void Details', {
            'fields': ('voided', 'void_reason', 'journal_entry')
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
        'tax_amount',
        'payment_method',
        'vendor',
        'date',
        'voided',
        'created_at'
    ]
    list_filter = ['category', 'payment_method', 'date', 'voided', 'vendor', 'created_at']
    search_fields = ['category', 'vendor', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
    
    fieldsets = (
        ('Expense Information', {
            'fields': ('category', 'amount', 'tax_amount', 'payment_method', 'vendor', 'date', 'description', 'receipt')
        }),
        ('Void Details', {
            'fields': ('voided', 'void_reason', 'journal_entry')
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
        'balance_due',
        'status',
        'due_date',
        'voided',
        'created_at'
    ]
    list_filter = ['status', 'voided', 'created_at', 'due_date']
    search_fields = ['invoice_number', 'client_name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Invoice Details', {
            'fields': ('invoice_number', 'client_name', 'amount', 'balance_due', 'status')
        }),
        ('Additional Information', {
            'fields': ('due_date', 'description')
        }),
        ('Void Details', {
            'fields': ('voided', 'void_reason', 'journal_entry')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Add color coding for status
    def get_list_display_links(self, request, list_display):
        return ['invoice_number']

