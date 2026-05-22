from rest_framework import serializers


class MonthlyRevenueSerializer(serializers.Serializer):
    """Serializer for monthly revenue data"""
    month = serializers.CharField()
    year = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class TopProductSerializer(serializers.Serializer):
    """Serializer for top selling products"""
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    product_code = serializers.CharField()
    quantity_sold = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class LowStockProductSerializer(serializers.Serializer):
    """Serializer for low stock products"""
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    product_code = serializers.CharField()
    stock_quantity = serializers.IntegerField()
    reorder_level = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    inventory_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    isReorder = serializers.BooleanField(required=False, default=False)


class RecentSaleSerializer(serializers.Serializer):
    """Serializer for recent sales"""
    sale_id = serializers.IntegerField()
    product_name = serializers.CharField()
    customer_name = serializers.CharField()
    quantity_sold = serializers.IntegerField()
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    sale_date = serializers.DateField()
    created_at = serializers.DateTimeField()


class DashboardKPISerializer(serializers.Serializer):
    """Main dashboard KPI serializer"""
    total_products = serializers.IntegerField()
    total_inventory_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_purchases_value = serializers.DecimalField(max_digits=15, decimal_places=2)

    # New explicit names (preferred)
    total_purchase_orders = serializers.IntegerField(required=False)
    pending_company_payables = serializers.IntegerField(required=False)

    # Legacy names kept for backward compatibility
    total_invoices = serializers.IntegerField()
    unpaid_invoices = serializers.IntegerField()

    low_stock_count = serializers.IntegerField()
