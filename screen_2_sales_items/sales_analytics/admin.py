from django.contrib import admin
from .models import SalesTarget, PerformanceMetric


@admin.register(SalesTarget)
class SalesTargetAdmin(admin.ModelAdmin):
    list_display = ['period_type', 'start_date', 'end_date', 'target_amount', 'target_units', 'category']
    list_filter = ['period_type', 'start_date']
    search_fields = ['category', 'notes']
    date_hierarchy = 'start_date'


@admin.register(PerformanceMetric)
class PerformanceMetricAdmin(admin.ModelAdmin):
    list_display = ['metric_name', 'last_updated']
    search_fields = ['metric_name']
    readonly_fields = ['last_updated']
