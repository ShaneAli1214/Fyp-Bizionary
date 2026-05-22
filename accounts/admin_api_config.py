"""
Admin interface for API Configuration
"""
from django.contrib import admin
from .models_api_config import APIConfiguration


@admin.register(APIConfiguration)
class APIConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for managing API configurations"""
    
    list_display = ('provider', 'is_active', 'api_key_display', 'updated_at')
    list_filter = ('provider', 'is_active', 'created_at')
    list_editable = ('is_active',)
    search_fields = ('provider',)
    readonly_fields = ('created_at', 'updated_at', 'get_api_key_masked')
    
    fieldsets = (
        ('API Provider', {
            'fields': ('provider',)
        }),
        ('API Credentials', {
            'fields': ('api_key', 'get_api_key_masked'),
            'description': 'Enter your OpenAI API key. Keep this secure!'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def api_key_display(self, obj):
        """Display masked API key in list view"""
        if obj.api_key and len(obj.api_key) > 4:
            return f"{'*' * (len(obj.api_key) - 4)}{obj.api_key[-4:]}"
        return "****"
    
    api_key_display.short_description = 'API Key'
    
    def get_api_key_masked(self, obj):
        """Display masked API key in detail view"""
        if obj.api_key and len(obj.api_key) > 4:
            masked = f"{'*' * (len(obj.api_key) - 4)}{obj.api_key[-4:]}"
        else:
            masked = "****"
        return masked
    
    get_api_key_masked.short_description = 'Current API Key (Masked)'
