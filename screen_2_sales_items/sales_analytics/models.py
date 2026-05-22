from django.db import models
from products.models import Product


class SalesTarget(models.Model):
    """Monthly or quarterly sales targets"""
    TARGET_PERIOD = [
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('YEARLY', 'Yearly'),
    ]
    
    period_type = models.CharField(max_length=20, choices=TARGET_PERIOD, default='MONTHLY')
    start_date = models.DateField()
    end_date = models.DateField()
    target_amount = models.DecimalField(max_digits=15, decimal_places=2)
    target_units = models.IntegerField(default=0, help_text="Target number of units to sell")
    category = models.CharField(max_length=100, blank=True, help_text="Leave blank for overall target")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.period_type} Target: Rs {self.target_amount} ({self.start_date} - {self.end_date})"


class PerformanceMetric(models.Model):
    """Cached performance metrics for faster dashboard loading"""
    metric_name = models.CharField(max_length=100, unique=True)
    metric_value = models.TextField(help_text="JSON string of metric data")
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['metric_name']
    
    def __str__(self):
        return f"{self.metric_name} (Updated: {self.last_updated})"
