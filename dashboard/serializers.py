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


class ProductSalesProfitabilitySerializer(serializers.Serializer):
    """Serializer for product sales and profitability table"""
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    quantity_sold = serializers.IntegerField()
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    profit_generated = serializers.DecimalField(max_digits=15, decimal_places=2)


class LowStockProductSerializer(serializers.Serializer):
    """Serializer for low stock products"""
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    product_code = serializers.CharField()
    stock_quantity = serializers.IntegerField()
    reorder_level = serializers.IntegerField()
    cost_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock_status = serializers.CharField()
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
    pending_invoices = serializers.IntegerField(required=False)

    # Legacy names kept for backward compatibility
    total_invoices = serializers.IntegerField()
    unpaid_invoices = serializers.IntegerField()

    low_stock_count = serializers.IntegerField()

    # New dashboard KPIs
    total_customers = serializers.IntegerField(required=False)
    total_orders = serializers.IntegerField(required=False)
    total_payments_count = serializers.IntegerField(required=False)
    total_stock_batches = serializers.IntegerField(required=False)
    total_payments_value = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)

    # Accurate ordered slips count (OrderedSlip table)
    total_ordered_slips = serializers.IntegerField(required=False, default=0)
    total_accounts = serializers.IntegerField(required=False, default=0)

    # ── ERP Profitability KPIs (computed by AccountsService) ──
    total_cogs = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=0)
    gross_profit = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=0)
    gross_profit_margin = serializers.FloatField(required=False, default=0)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=0)
    net_profit = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=0)
    net_profit_margin = serializers.FloatField(required=False, default=0)
    cash_inflow = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=0)
    cash_outflow = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=0)
    net_cash_flow = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=0)
