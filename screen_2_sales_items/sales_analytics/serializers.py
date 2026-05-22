from rest_framework import serializers
from .models import SalesTarget, PerformanceMetric


class SalesTargetSerializer(serializers.ModelSerializer):
    """Serializer for Sales Target"""
    class Meta:
        model = SalesTarget
        fields = ['id', 'period_type', 'start_date', 'end_date', 'target_amount', 
                  'target_units', 'category', 'notes', 'created_at']


class PerformanceMetricSerializer(serializers.ModelSerializer):
    """Serializer for Performance Metrics"""
    class Meta:
        model = PerformanceMetric
        fields = ['id', 'metric_name', 'metric_value', 'last_updated']


class SalesKPISerializer(serializers.Serializer):
    """Serializer for top 4 KPI cards on Sales screen"""
    total_sales = serializers.CharField()
    total_revenue = serializers.CharField()
    total_orders = serializers.IntegerField()
    growth_rate = serializers.CharField()
    
    # Comparison metrics
    sales_vs_last_month = serializers.CharField()
    revenue_vs_last_month = serializers.CharField()
    orders_vs_last_month = serializers.CharField()
    growth_vs_target = serializers.CharField()


class MonthlyPerformanceSerializer(serializers.Serializer):
    """Serializer for monthly sales performance chart data"""
    month = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    sales_count = serializers.IntegerField()
    month_name = serializers.CharField()


class CategoryPerformanceSerializer(serializers.Serializer):
    """Serializer for category-wise sales breakdown"""
    category = serializers.CharField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_quantity = serializers.IntegerField()
    order_count = serializers.IntegerField()
    percentage_of_total = serializers.DecimalField(max_digits=5, decimal_places=2)


class TopProductSerializer(serializers.Serializer):
    """Serializer for top-selling products"""
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    product_code = serializers.CharField()
    category = serializers.CharField()
    total_quantity_sold = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    order_count = serializers.IntegerField()
