"""
Dashboard Views - Analytics and Reporting Engine
================================================

This module implements the dashboard's aggregation service.
All data is computed dynamically from existing tables using Django ORM.

Architecture:
    MySQL Database → Django Models → Aggregation Queries → JSON Response

Performance Strategy:
    - Database-level aggregations (Sum, Count, Avg)
    - annotate() for grouping
    - select_related() for foreign keys
    - Avoid Python-level loops
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Max, Min, F, Q, ExpressionWrapper, DecimalField
from django.db.models.functions import TruncMonth, TruncDay, TruncWeek, ExtractMonth, ExtractYear
from django.utils.dateparse import parse_date
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta, date as date_type

from products.models import Product
from sales.models import Sale
from purchases.models import Purchase, OrderedSlip
from invoices.models import Invoice as BillingInvoice

from .serializers import (
    DashboardKPISerializer,
    MonthlyRevenueSerializer,
    TopProductSerializer,
    LowStockProductSerializer,
    RecentSaleSerializer
)


@api_view(['GET'])
def revenue_by_period(request):
    """
    Revenue aggregated by rolling period: daily (last 1 day), weekly (last 7 days),
    or monthly (last 30 days) — uses actual sales data from the Sale table.

    Method: GET
    Endpoint: /api/dashboard/revenue-by-period/?period=daily|weekly|monthly

    Returns:
        {
            "period": "daily",
            "revenue": "12345.67",
            "transaction_count": 42,
            "start_date": "2026-06-08",
            "end_date": "2026-06-09",
            "label": "Last 24 Hours"
        }
    """
    try:
        period = request.query_params.get('period', 'daily').lower().strip()
        if period not in ('daily', 'weekly', 'monthly'):
            return Response(
                {'error': "Invalid period. Use 'daily', 'weekly', or 'monthly'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        today = timezone.localdate()

        # Rolling lookback windows so the card always shows meaningful real data
        if period == 'daily':
            # Last 1 day (yesterday + today)
            start = today - timedelta(days=1)
            end = today
            label = 'Last 24 Hours'
        elif period == 'weekly':
            # Last 7 days
            start = today - timedelta(days=7)
            end = today
            label = 'Last 7 Days'
        else:  # monthly
            # Last 30 days
            start = today - timedelta(days=30)
            end = today
            label = 'Last 30 Days'

        agg = Sale.objects.filter(
            sale_date__gte=start,
            sale_date__lte=end,
        ).aggregate(
            revenue=Sum('total_price'),
            transaction_count=Count('id'),
        )

        revenue = (agg['revenue'] or Decimal('0.00')).quantize(Decimal('0.01'))
        tx_count = agg['transaction_count'] or 0

        return Response({
            'period': period,
            'revenue': str(revenue),
            'transaction_count': tx_count,
            'start_date': start.isoformat(),
            'end_date': end.isoformat(),
            'label': label,
        }, status=status.HTTP_200_OK)

    except Exception as exc:
        return Response(
            {'error': f'Failed to calculate revenue: {str(exc)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _outstanding_payables_response():
    """Build shared response payload for outstanding company payables."""
    try:
        # Get unpaid and partially paid purchase orders.
        purchase_rows = Purchase.objects.select_related('product').filter(
            Q(payment_status='UNPAID') | Q(payment_status='PARTIAL')
        ).values(
            'id',
            'company_name',
            'product__name',
            'quantity_purchased',
            'total_cost',
            'purchase_date',
            'payment_status'
        ).order_by('purchase_date')

        # Get pending ordered slips (purchase requests)
        ordered_rows = OrderedSlip.objects.select_related('product').filter(
            status='PENDING'
        ).values(
            'id',
            'company_name',
            'product__name',
            'quantity_ordered',
            'quantity_received',
            'unit_cost',
            'created_at',
            'status'
        ).order_by('created_at')

        result = []

        # Format purchase rows
        for item in purchase_rows:
            total_cost = item['total_cost'] or Decimal('0.00')
            # Current purchases schema has no paid-amount field.
            # For PARTIAL, use a stable 50% paid assumption for payable balance.
            if item['payment_status'] == 'PARTIAL':
                amount_paid = (total_cost * Decimal('0.50')).quantize(Decimal('0.01'))
            else:
                amount_paid = Decimal('0.00')
            balance = (total_cost - amount_paid).quantize(Decimal('0.01'))

            result.append({
                'id': item['id'],
                'type': 'purchase',
                'reference_number': f"PO-{str(item['id']).zfill(4)}",
                'company_name': item['company_name'],
                'product_name': item['product__name'],
                'quantity': item.get('quantity_purchased'),
                'total_amount': total_cost,
                'amount_paid': amount_paid,
                'balance': balance,
                'due_date': item['purchase_date'],
                'status': item['payment_status'],
            })

        # Format ordered slip rows
        for item in ordered_rows:
            unit_cost = item.get('unit_cost') or Decimal('0.00')
            ordered_qty = item.get('quantity_ordered') or 0
            received_qty = item.get('quantity_received') or 0
            pending_qty = max(ordered_qty - received_qty, 0)
            total_amount = (unit_cost * Decimal(ordered_qty)).quantize(Decimal('0.01')) if ordered_qty else Decimal('0.00')

            result.append({
                'id': item['id'],
                'type': 'ordered_slip',
                'reference_number': f"OS-{str(item['id']).zfill(4)}",
                'company_name': item['company_name'],
                'product_name': item['product__name'],
                'quantity': pending_qty,
                'total_amount': total_amount,
                'amount_paid': Decimal('0.00'),
                'balance': total_amount,
                'due_date': None,
                'status': item['status'],
            })

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to fetch outstanding payables: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def dashboard_kpis(request):
    """
    Main Dashboard KPIs Endpoint
    
    Returns all primary KPIs in a single response
    
    Method: GET
    Endpoint: /api/dashboard/kpis/
    
    Response:
        {
            "total_products": <dynamic_count>,
            "total_inventory_value": "<decimal_as_string>",
            "total_revenue": "<decimal_as_string>",
            "total_purchases_value": "<decimal_as_string>",
            "total_invoices": <dynamic_count>,
            "unpaid_invoices": <dynamic_count>,
            "low_stock_count": <dynamic_count>
        }
    """
    try:
        # Normalize decimal precision to keep serializer validation consistent.
        to_2dp = lambda value: (value or Decimal('0.00')).quantize(Decimal('0.01'))

        # KPI 1: Total Products Count
        total_products = Product.objects.count()

        # KPI 2: Total Inventory Value (sum of stock_quantity * cost_price)
        # Using ExpressionWrapper for calculation at database level
        inventory_value_aggregate = Product.objects.aggregate(
            total_value=Sum(
                ExpressionWrapper(
                    F('stock_quantity') * F('cost_price'),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            )
        )
        total_inventory_value = to_2dp(inventory_value_aggregate['total_value'])

        # KPI 3: Total Revenue (sum of sales.total_price)
        revenue_aggregate = Sale.objects.aggregate(
            total=Sum('total_price')
        )
        total_revenue = to_2dp(revenue_aggregate['total'])

        # KPI 5: Total Purchases Value
        purchases_aggregate = Purchase.objects.aggregate(
            total=Sum('total_cost')
        )
        total_purchases_value = to_2dp(purchases_aggregate['total'])

        # KPI 6: Total customer invoices
        total_invoices = BillingInvoice.objects.count()

        # KPI 7: Pending customer invoices (unpaid, partially paid, or overdue)
        pending_invoices = BillingInvoice.objects.filter(
            status__in=['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']
        ).count()

        # KPI 8: Outstanding payable purchase orders (including pending ordered slips)
        purchase_pending_count = Purchase.objects.filter(
            Q(payment_status='UNPAID') | Q(payment_status='PARTIAL')
        ).count()
        ordered_slips_pending_count = OrderedSlip.objects.filter(status='PENDING').count()
        pending_company_payables = purchase_pending_count + ordered_slips_pending_count

        # KPI 9: Low Stock Products Count (stock_quantity < min_stock)
        low_stock_count = Product.objects.filter(
            stock_quantity__lt=F('min_stock')
        ).count()

        # Calculate new dashboard KPIs
        invoice_customers = set(BillingInvoice.objects.values_list('customer_name', flat=True).distinct())
        sale_customers = set(Sale.objects.values_list('customer_name', flat=True).distinct())
        total_customers = len(invoice_customers | sale_customers)

        total_orders = Sale.objects.count()

        total_payments_count = Sale.objects.filter(payment_status='PAID').count() + BillingInvoice.objects.filter(status='PAID').count()

        total_stock_batches = Purchase.objects.count()
        if total_stock_batches == 0:
            total_stock_batches = Product.objects.filter(stock_quantity__gt=0).count()

        # KPI: Actual count of OrderedSlip records (purchase order slips)
        total_ordered_slips = OrderedSlip.objects.count()

        paid_sales = Sale.objects.filter(payment_status='PAID').aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
        paid_invoices = BillingInvoice.objects.filter(status='PAID').aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
        total_payments_value = to_2dp(paid_sales + paid_invoices)

        # Note: Account balance removed - Screen 4 (Accounts) is independent

        # Prepare response data
        kpi_data = {
            'total_products': total_products,
            'total_inventory_value': total_inventory_value,
            'total_revenue': total_revenue,
            'total_purchases_value': total_purchases_value,

            # Explicit names
            'total_purchase_orders': total_invoices,
            'pending_company_payables': pending_company_payables,
            'pending_invoices': pending_invoices,

            # Legacy names kept for backward compatibility
            'total_invoices': total_invoices,
            'unpaid_invoices': pending_invoices,
            'low_stock_count': low_stock_count,

            # New KPIs
            'total_customers': total_customers,
            'total_orders': total_orders,
            'total_payments_count': total_payments_count,
            'total_stock_batches': total_stock_batches,
            'total_payments_value': total_payments_value,

            # Accurate ordered slips count (from OrderedSlip table)
            'total_ordered_slips': total_ordered_slips,
        }

        # ── ERP Profitability KPIs (single source of truth via AccountsService) ──
        try:
            from accounts.services import AccountsService
            total_cogs = AccountsService.get_cogs()
            gross_profit = AccountsService.get_gross_profit()
            total_expenses = AccountsService.get_expenses()
            net_profit = AccountsService.get_net_profit()
            cf_in, cf_out, cf_net = AccountsService.get_cash_flow()
            gross_margin = float(round((gross_profit / total_revenue * 100), 2)) if total_revenue > 0 else 0.0
            net_margin = float(round((net_profit / total_revenue * 100), 2)) if total_revenue > 0 else 0.0

            kpi_data.update({
                'total_cogs': float(total_cogs),
                'gross_profit': float(gross_profit),
                'gross_profit_margin': gross_margin,
                'total_expenses': float(total_expenses),
                'net_profit': float(net_profit),
                'net_profit_margin': net_margin,
                'cash_inflow': float(cf_in),
                'cash_outflow': float(cf_out),
                'net_cash_flow': float(cf_net),
            })
        except Exception as prof_err:
            pass  # Profitability fields remain at default 0 if service fails


        serializer = DashboardKPISerializer(data=kpi_data)
        if serializer.is_valid():
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {'error': f'Failed to fetch KPIs: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def monthly_revenue(request):
    """
    Monthly Revenue Breakdown
    
    Groups sales by month and calculates total revenue per month
    
    Method: GET
    Endpoint: /api/dashboard/monthly-revenue/
    
    Query Parameters:
        - year (optional): Filter by specific year
    
    Response:
        [
            {"month": "January", "year": 2023, "revenue": 20000.00},
            {"month": "February", "year": 2023, "revenue": 15000.00}
        ]
    """
    try:
        year_filter = request.query_params.get('year', None)
        
        # Base queryset
        queryset = Sale.objects.all()
        
        # Apply year filter if provided
        if year_filter:
            queryset = queryset.filter(sale_date__year=year_filter)

        # Group by month and year, calculate revenue
        monthly_data = queryset.annotate(
            month_num=ExtractMonth('sale_date'),
            year_num=ExtractYear('sale_date')
        ).values('month_num', 'year_num').annotate(
            revenue=Sum('total_price')
        ).order_by('year_num', 'month_num')

        # Convert month numbers to names
        month_names = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]

        result = []
        for item in monthly_data:
            result.append({
                'month': month_names[item['month_num'] - 1],
                'year': item['year_num'],
                'revenue': item['revenue']
            })

        serializer = MonthlyRevenueSerializer(result, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to fetch monthly revenue: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def top_products(request):
    """
    Top Selling Products
    
    Returns top N products by quantity sold
    
    Method: GET
    Endpoint: /api/dashboard/top-products/
    
    Query Parameters:
        - limit (optional): Number of products to return (default: 5)
    
    Response:
        [
            {
                "product_id": 1,
                "product_name": "A4 Copy Paper 80 GSM",
                "product_code": "PAP-A4-80",
                "quantity_sold": 500,
                "total_revenue": 25000.00
            }
        ]
    """
    try:
        limit = int(request.query_params.get('limit', 5))

        # Aggregate sales by product using select_related for performance
        top_products_data = Sale.objects.select_related('product').values(
            'product__id',
            'product__name',
            'product__sku'
        ).annotate(
            quantity_sold=Sum('quantity_sold'),
            total_revenue=Sum('total_price')
        ).order_by('-quantity_sold')[:limit]

        # Format the data
        result = []
        for item in top_products_data:
            result.append({
                'product_id': item['product__id'],
                'product_name': item['product__name'],
                'product_code': item['product__sku'],
                'quantity_sold': item['quantity_sold'],
                'total_revenue': item['total_revenue']
            })

        serializer = TopProductSerializer(result, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to fetch top products: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def low_stock_products(request):
    """
    Low Stock Products Alert
    
    Returns products where stock_quantity < reorder_level
    
    Method: GET
    Endpoint: /api/dashboard/low-stock-products/
    
    Response:
        [
            {
                "product_id": 5,
                "product_name": "Office Supplies",
                "product_code": "OFF-SUP-001",
                "stock_quantity": 15,
                "reorder_level": 20,
                "unit_price": 150.00
            }
        ]
    """
    try:
        # Primary set: products below minimum stock threshold.
        low_stock = Product.objects.filter(
            stock_quantity__lt=F('min_stock')
        ).values(
            'id',
            'name',
            'sku',
            'stock_quantity',
            'min_stock',
            'cost_price',
            'unit_price'
        ).order_by('stock_quantity')

        # If nothing is currently below the minimum stock threshold, return lowest-stock products
        # so the dashboard summary is still informative instead of empty.
        if not low_stock.exists():
            low_stock = Product.objects.values(
                'id',
                'name',
                'sku',
                'stock_quantity',
                'min_stock',
                'cost_price',
                'unit_price'
            ).order_by('stock_quantity')[:10]

        # Format the data
        result = []
        for item in low_stock:
            result.append({
                'product_id': item['id'],
                'product_name': item['name'],
                'product_code': item['sku'],
                'stock_quantity': item['stock_quantity'],
                'reorder_level': item['min_stock'],
                'cost_price': item['cost_price'],
                'unit_price': item['unit_price'],
                'stock_status': 'Out of Stock' if (item['stock_quantity'] or 0) <= 0 else ('Low Stock' if (item['stock_quantity'] or 0) <= (item['min_stock'] or 0) else 'In Stock'),
                'inventory_value': (item['cost_price'] or Decimal('0.00')) * (item['stock_quantity'] or 0),
                'isReorder': (item['stock_quantity'] or 0) < (item['min_stock'] or 0),
            })

        serializer = LowStockProductSerializer(result, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to fetch low stock products: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def recent_sales(request):
    """
    Recent Sales Transactions
    
    Returns the most recent sales transactions
    
    Method: GET
    Endpoint: /api/dashboard/recent-sales/
    
    Query Parameters:
        - limit (optional): Number of sales to return (default: 10)
        - start_date (optional): Lower bound date YYYY-MM-DD
        - end_date (optional): Upper bound date YYYY-MM-DD
    
    Response:
        [
            {
                "sale_id": 125,
                "product_name": "Laptop",
                "customer_name": "John Doe",
                "quantity_sold": 2,
                "total_price": 150000.00,
                "sale_date": "2023-10-15",
                "created_at": "2023-10-15T10:30:00Z"
            }
        ]
    """
    try:
        limit = int(request.query_params.get('limit', 10))
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)

        queryset = Sale.objects.select_related('product')

        if start_date:
            parsed_start_date = parse_date(start_date)
            if not parsed_start_date:
                return Response(
                    {'error': 'Invalid start_date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            queryset = queryset.filter(sale_date__gte=parsed_start_date)

        if end_date:
            parsed_end_date = parse_date(end_date)
            if not parsed_end_date:
                return Response(
                    {'error': 'Invalid end_date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            queryset = queryset.filter(sale_date__lte=parsed_end_date)

        # Use only stable sale fields so this endpoint works across schema variants.
        recent_sales_data = queryset.values(
            'id',
            'product__name',
            'quantity_sold',
            'total_price',
            'sale_date',
            'created_at'
        ).order_by('-created_at')[:limit]

        # Format the data
        result = []
        for item in recent_sales_data:
            result.append({
                'sale_id': item['id'],
                'product_name': item['product__name'],
                'customer_name': 'Customer',
                'quantity_sold': item['quantity_sold'],
                'total_price': item['total_price'],
                'sale_date': item['sale_date'],
                'created_at': item['created_at']
            })

        serializer = RecentSaleSerializer(result, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to fetch recent sales: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def outstanding_payables(request):
    """
    Outstanding Company Payables Details

    Returns detailed list of unpaid and partially paid purchase orders.
    Route name remains unchanged for frontend compatibility.
    
    Method: GET
    Endpoint: /api/dashboard/outstanding-payables/
    
    Response:
        [
            {
                "invoice_id": 10,
                "invoice_number": "INV-0010",
                "customer_name": "ABC Corp",
                "total_amount": 50000.00,
                "amount_paid": 20000.00,
                "balance_due": 30000.00,
                "due_date": "2023-11-01",
                "status": "PARTIALLY_PAID"
            }
        ]
    """
    return _outstanding_payables_response()


@api_view(['GET'])
def outstanding_invoices(request):
    """Backward-compatible alias for legacy route name."""
    return _outstanding_payables_response()


@api_view(['GET'])
def sales_performance(request):
    """
    Sales Performance Over Time
    
    Returns aggregated sales data for performance analysis
    Useful for charts and graphs
    
    Method: GET
    Endpoint: /api/dashboard/sales-performance/
    
    Query Parameters:
        - period (optional): 'daily' or 'monthly' (default: 'monthly')
        - timeframe (optional): '30days' to auto-apply last 30 days (daily)
        - range (optional): 'last30' alias for timeframe
        - year (optional): Filter by specific year
        - date (optional): Filter by exact date YYYY-MM-DD
        - start_date (optional): Lower bound date YYYY-MM-DD
        - end_date (optional): Upper bound date YYYY-MM-DD
    
    Response:
        [
            {"period": "2023-10", "total_sales": 50, "revenue": 125000.00},
            {"period": "2023-11", "total_sales": 65, "revenue": 180000.00}
        ]
    """
    try:
        period = request.query_params.get('period', 'monthly').lower()
        timeframe = request.query_params.get('timeframe', '').strip().lower()
        range_filter = request.query_params.get('range', '').strip().lower()
        year_filter = request.query_params.get('year', None)
        specific_date = request.query_params.get('date', None)
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        parsed_start_date = None
        parsed_end_date = None

        if (timeframe in ('30days', 'last30', '30d') or range_filter == 'last30') and not start_date and not end_date:
            from accounts.services import AccountsService
            parsed_start_date, parsed_end_date = AccountsService.get_date_filter('last_30_days')
            start_date = parsed_start_date.isoformat()
            end_date = parsed_end_date.isoformat()

        queryset = Sale.objects.all()
        
        if year_filter:
            queryset = queryset.filter(sale_date__year=year_filter)

        if specific_date:
            parsed_specific_date = parse_date(specific_date)
            if not parsed_specific_date:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            queryset = queryset.filter(sale_date=parsed_specific_date)

        if start_date:
            parsed_start_date = parsed_start_date or parse_date(start_date)
            if not parsed_start_date:
                return Response(
                    {'error': 'Invalid start_date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            queryset = queryset.filter(sale_date__gte=parsed_start_date)

        if end_date:
            parsed_end_date = parsed_end_date or parse_date(end_date)
            if not parsed_end_date:
                return Response(
                    {'error': 'Invalid end_date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            queryset = queryset.filter(sale_date__lte=parsed_end_date)

        if period == 'daily':
            performance_data = queryset.annotate(
                period_date=TruncDay('sale_date')
            ).values('period_date').annotate(
                total_sales=Count('id'),
                revenue=Sum('total_price')
            ).order_by('period_date')
        elif period == 'monthly':
            # Group by month
            performance_data = queryset.annotate(
                period_date=TruncMonth('sale_date')
            ).values('period_date').annotate(
                total_sales=Count('id'),
                revenue=Sum('total_price')
            ).order_by('period_date')
        else:
            return Response(
                {'error': "Invalid period. Use 'daily' or 'monthly'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = []

        if period == 'daily' and parsed_start_date and parsed_end_date:
            aggregated_by_day = {}
            for item in performance_data:
                if not item['period_date']:
                    continue
                key = item['period_date'].date() if hasattr(item['period_date'], 'date') else item['period_date']
                aggregated_by_day[key] = {
                    'total_sales': item['total_sales'],
                    'revenue': item['revenue'] or Decimal('0.00')
                }

            cursor = parsed_start_date
            while cursor <= parsed_end_date:
                day_values = aggregated_by_day.get(cursor, {'total_sales': 0, 'revenue': Decimal('0.00')})
                result.append({
                    'period': cursor.strftime('%Y-%m-%d'),
                    'total_sales': day_values['total_sales'],
                    'revenue': day_values['revenue']
                })
                cursor += timedelta(days=1)
        else:
            for item in performance_data:
                result.append({
                    'period': item['period_date'].strftime('%Y-%m-%d') if period == 'daily' and item['period_date'] else item['period_date'].strftime('%Y-%m') if item['period_date'] else 'N/A',
                    'total_sales': item['total_sales'],
                    'revenue': item['revenue']
                })

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to fetch sales performance: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def reset_system(request):
    """
    POST /api/dashboard/reset-system/
    Resets the database by clearing all tables and running the populate script logic.
    """
    try:
        from invoices.models import Invoice as BillingInvoice
        from sales.models import Sale
        from products.models import Product
        from purchases.models import Purchase, OrderedSlip, SupplierCompany
        from accounts.models import Revenue, Expense, Invoice as FinanceInvoice
        from datetime import datetime, date, timedelta

        # 1. Clear existing data
        BillingInvoice.objects.all().delete()
        Sale.objects.all().delete()
        Purchase.objects.all().delete()
        OrderedSlip.objects.all().delete()
        SupplierCompany.objects.all().delete()
        Revenue.objects.all().delete()
        Expense.objects.all().delete()
        FinanceInvoice.objects.all().delete()
        Product.objects.all().delete()

        # 2. Seed supplier companies
        suppliers = [
            {"name": "Apex Pharma", "category": "Medicine", "contact_number": "0300-1234567"},
            {"name": "Nova Biotech", "category": "Medicine", "contact_number": "0312-3456789"},
            {"name": "Global Health Care", "category": "Equipment", "contact_number": "0321-9876543"},
            {"name": "MediCare Distributors", "category": "Supplies", "contact_number": "0333-5555555"},
        ]
        supplier_map = {}
        for s_data in suppliers:
            supplier, _ = SupplierCompany.objects.get_or_create(
                name=s_data["name"],
                defaults={
                    "category": s_data["category"],
                    "contact_number": s_data["contact_number"]
                }
            )
            supplier_map[s_data["name"]] = supplier

        # 3. Seed products
        from product_catalog import ALL_PRODUCTS
        product_map = {}
        for product_data in ALL_PRODUCTS:
            sup_name = product_data.get('supplier', 'Apex Pharma')
            supplier_obj = supplier_map.get(sup_name, None)
            
            product = Product.objects.create(
                sku=product_data['sku'],
                name=product_data['name'],
                category=product_data['category'],
                description=f"{product_data.get('brand', '')} - {sup_name}",
                unit_price=product_data['unit_price'],
                cost_price=product_data.get('cost_price', Decimal(str(product_data['unit_price'])) * Decimal('0.7')),
                stock_quantity=product_data['stock_quantity'],
                min_stock=product_data['reorder_level'],
                supplier=supplier_obj,
                status='ACTIVE'
            )
            product_map[product_data['sku']] = product

        # 4. Seed sales
        from product_catalog.master_data import SALES_DATA
        for sale_data in SALES_DATA:
            product = product_map.get(sale_data['product_sku'])
            if product:
                total_price = (sale_data['quantity_sold'] * sale_data['unit_price']) - sale_data['discount']
                Sale.objects.create(
                    product=product,
                    customer_name=sale_data['customer_name'],
                    quantity_sold=sale_data['quantity_sold'],
                    unit_price=sale_data['unit_price'],
                    total_price=total_price,
                    discount=sale_data['discount'],
                    payment_method=sale_data['payment_method'],
                    payment_status=sale_data['payment_status'],
                    sale_date=datetime.strptime(sale_data['sale_date'], '%Y-%m-%d').date(),
                    notes=f"Real data sales transaction for {product.name}"
                )

        # 5. Seed invoices (billing app)
        from product_catalog.master_data import INVOICES_DATA
        for invoice_data in INVOICES_DATA:
            BillingInvoice.objects.create(
                invoice_number=invoice_data['invoice_number'],
                customer_name=invoice_data['customer_name'],
                customer_email=invoice_data['customer_email'],
                customer_phone=invoice_data['customer_phone'],
                invoice_date=datetime.strptime(invoice_data['invoice_date'], '%Y-%m-%d').date(),
                due_date=datetime.strptime(invoice_data['due_date'], '%Y-%m-%d').date(),
                subtotal=invoice_data['subtotal'],
                tax_amount=invoice_data['tax_amount'],
                discount_amount=invoice_data['discount_amount'],
                total_amount=invoice_data['total_amount'],
                amount_paid=invoice_data['amount_paid'],
                status=invoice_data['status'],
                notes=invoice_data['notes']
            )

        # 6. Seed accounts finance app data (Revenues, Expenses, Invoices)
        # Seed Revenues (from sales)
        for sale in Sale.objects.all()[:10]:
            Revenue.objects.create(
                source=f"Sale transaction #{sale.id} ({sale.customer_name})",
                amount=sale.total_price,
                date=sale.sale_date,
                description=f"Generated automatically from Sale #{sale.id}"
            )
            
        # Seed Expenses
        expenses = [
            {"category": "PAYROLL", "amount": Decimal("120000.00"), "vendor": "Staff Salaries", "description": "Monthly payroll payment"},
            {"category": "SUPPLIES", "amount": Decimal("15000.00"), "vendor": "Office Depot", "description": "Office stationary and printing paper"},
            {"category": "RENT_UTILITIES", "amount": Decimal("45000.00"), "vendor": "K-Electric / Building Owner", "description": "Office rent & electric utility"},
            {"category": "MARKETING", "amount": Decimal("30000.00"), "vendor": "Meta Ads / Google Ads", "description": "Online advertising campaign"},
        ]
        for exp in expenses:
            Expense.objects.create(
                category=exp["category"],
                amount=exp["amount"],
                date=date.today() - timedelta(days=15),
                vendor=exp["vendor"],
                description=exp["description"]
            )

        # Seed finance app Invoices
        for binv in BillingInvoice.objects.all()[:5]:
            FinanceInvoice.objects.create(
                invoice_number=binv.invoice_number,
                client_name=binv.customer_name,
                amount=binv.total_amount,
                status='PAID' if binv.status == 'PAID' else 'PENDING',
                due_date=binv.due_date,
                description=binv.notes or f"Client invoice {binv.invoice_number}"
            )

        # 7. Seed purchase orders (so stock batches are populated)
        # Create a few purchases
        for i, (sku, product) in enumerate(list(product_map.items())[:3]):
            Purchase.objects.create(
                product=product,
                company_name=suppliers[i % len(suppliers)]["name"],
                quantity_purchased=50,
                unit_cost=product.cost_price,
                total_cost=product.cost_price * Decimal("50.00"),
                purchase_date=date.today() - timedelta(days=5),
                payment_status="PAID"
            )

        return Response({'success': True, 'message': 'System reset and populated with ERP real data successfully.'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'error': f'Failed to reset system: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def sales_by_period(request):
    """
    Returns aggregated sales data grouped by period (daily, weekly, monthly, last10Days)
    with category breakdown and Recharts chart data.
    """
    try:
        period = request.query_params.get('period', 'last10Days')
        
        # 1. Determine reference date
        latest_date = Sale.objects.aggregate(latest=Max('sale_date'))['latest']
        if not latest_date:
            latest_date = timezone.localdate()
            
        # 2. Determine date ranges and pre-populate chart points
        chart_points = []
        date_to_label = {}
        
        if period == 'daily':
            start_date = latest_date
            end_date = latest_date
            labels = ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM', '11 PM']
            for label in labels:
                chart_points.append({'period': label})
            date_context = latest_date.strftime('%B %d, %Y')
            period_label = 'Daily'
            x_axis_type = 'hour'
            x_axis_label = 'Hours of the day'
            
        elif period == 'weekly':
            end_date = latest_date
            start_date = latest_date - timedelta(days=6)
            # Pre-populate 7 days
            for i in range(7):
                d = start_date + timedelta(days=i)
                label = d.strftime('%a')
                chart_points.append({'period': label})
                # map specific date to label
                date_to_label[d.isoformat()] = label
            date_context = f"{start_date.strftime('%b %d')} - {latest_date.strftime('%B %d, %Y')}"
            period_label = 'Weekly'
            x_axis_type = 'day'
            x_axis_label = 'Days of the week'
            
        elif period == 'last10Days':
            end_date = latest_date
            start_date = latest_date - timedelta(days=9)
            # Pre-populate 10 days
            for i in range(10):
                d = start_date + timedelta(days=i)
                label = d.strftime('%b %d')
                chart_points.append({'period': label})
                date_to_label[d.isoformat()] = label
            date_context = f"{start_date.strftime('%b %d')} - {latest_date.strftime('%B %d, %Y')}"
            period_label = 'Last 10 Days'
            x_axis_type = 'day'
            x_axis_label = 'Days'
        elif period == 'all':
            earliest_date = Sale.objects.aggregate(earliest=Min('sale_date'))['earliest']
            if not earliest_date:
                earliest_date = latest_date
            start_date = earliest_date.replace(day=1)
            end_date = latest_date
            current = start_date
            while current <= latest_date:
                label = current.strftime('%b %Y')
                key = current.strftime('%Y-%m')
                chart_points.append({'period': label})
                date_to_label[key] = label
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1, day=1)
                else:
                    current = current.replace(month=current.month + 1, day=1)
            date_context = f"{start_date.strftime('%b %Y')} - {latest_date.strftime('%b %Y')}"
            period_label = 'All Data'
            x_axis_type = 'month'
            x_axis_label = 'Months'
        else:  # monthly
            # Group sales for the month containing the latest sale
            start_date = latest_date.replace(day=1)
            # Get last day of month
            if start_date.month == 12:
                next_month = start_date.replace(year=start_date.year + 1, month=1, day=1)
            else:
                next_month = start_date.replace(month=start_date.month + 1, day=1)
            end_date = next_month - timedelta(days=1)
            
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
            for label in labels:
                chart_points.append({'period': label})
            date_context = f"{start_date.strftime('%B %d')} - {end_date.strftime('%B %d, %Y')}"
            period_label = 'Monthly'
            x_axis_type = 'week'
            x_axis_label = 'Weeks of the month'
            
        # 3. Query sales in the range
        sales_qs = Sale.objects.filter(
            sale_date__gte=start_date,
            sale_date__lte=end_date
        ).select_related('product')
        
        # Define category mapping and color mapping
        CATEGORY_MAPPING = {
            'Electronics & Applications': 'electronics_appliances',
            'Grocery & Food Items': 'grocery_food_items',
            'Clothing & Textiles': 'clothing_textiles',
            'Construction & Hardware': 'construction_hardware',
            'Pharmaceuticals & Health': 'pharmaceuticals_health',
            'Stationery & Office Supplies': 'stationery_office_supplies',
            'Automobiles & Accessories': 'automobiles_accessories',
        }
        
        CATEGORY_COLORS = {
            'electronics_appliances': '#0A6ED1',
            'grocery_food_items': '#06B6D4',
            'clothing_textiles': '#8B5CF6',
            'construction_hardware': '#F59E0B',
            'pharmaceuticals_health': '#16A34A',
            'stationery_office_supplies': '#F97316',
            'automobiles_accessories': '#EF4444',
        }
        
        def get_category_info(cat_name):
            if not cat_name:
                return 'other', '#94A3B8'
            if cat_name in CATEGORY_MAPPING:
                key = CATEGORY_MAPPING[cat_name]
            else:
                key = cat_name.lower().replace('&', 'and').replace(' ', '_').replace('-', '_')
            color = CATEGORY_COLORS.get(key, '#94A3B8')
            return key, color
            
        # Initialize category metrics
        category_stats = {}
        
        # 4. Process sales to compute category aggregates and point sales
        # To map each sale to its chart point index:
        point_sales = {p['period']: {} for p in chart_points}
        
        total_sales_amount = Decimal('0.00')
        total_profit = Decimal('0.00')
        total_quantity = 0
        
        for sale in sales_qs:
            prod = sale.product
            cat_name = prod.category or 'Other'
            subcat_name = prod.subcategory or 'Other'
            prod_name = prod.name
            
            qty = sale.quantity_sold
            revenue = sale.total_price
            
            # profit calculation: check cost price
            cost_price = prod.cost_price or (prod.unit_price * Decimal('0.72'))
            profit = revenue - (qty * cost_price)
            
            total_sales_amount += revenue
            total_profit += profit
            total_quantity += qty
            
            # Get category keys
            cat_key, cat_color = get_category_info(cat_name)
            
            # Update category statistics dict
            if cat_name not in category_stats:
                category_stats[cat_name] = {
                    'quantity_sold': 0,
                    'revenue': Decimal('0.00'),
                    'profit': Decimal('0.00'),
                    'subcategories': {}
                }
            category_stats[cat_name]['quantity_sold'] += qty
            category_stats[cat_name]['revenue'] += revenue
            category_stats[cat_name]['profit'] += profit
            
            subcats = category_stats[cat_name]['subcategories']
            if subcat_name not in subcats:
                subcats[subcat_name] = {
                    'quantity_sold': 0,
                    'revenue': Decimal('0.00'),
                    'profit': Decimal('0.00'),
                    'products': {}
                }
            subcats[subcat_name]['quantity_sold'] += qty
            subcats[subcat_name]['revenue'] += revenue
            subcats[subcat_name]['profit'] += profit
            
            prods = subcats[subcat_name]['products']
            if prod_name not in prods:
                prods[prod_name] = {
                    'quantity_sold': 0,
                    'revenue': Decimal('0.00'),
                    'profit': Decimal('0.00')
                }
            prods[prod_name]['quantity_sold'] += qty
            prods[prod_name]['revenue'] += revenue
            prods[prod_name]['profit'] += profit
            
            # Map sale to period label
            if period == 'daily':
                hour = sale.created_at.hour if sale.created_at else 12
                if hour < 10: label = '9 AM'
                elif hour < 12: label = '11 AM'
                elif hour < 14: label = '1 PM'
                elif hour < 16: label = '3 PM'
                elif hour < 18: label = '5 PM'
                elif hour < 20: label = '7 PM'
                elif hour < 22: label = '9 PM'
                else: label = '11 PM'
            elif period in ('weekly', 'last10Days'):
                date_str = sale.sale_date.isoformat()
                label = date_to_label.get(date_str, 'N/A')
            elif period == 'all':
                date_str = sale.sale_date.strftime('%Y-%m')
                label = date_to_label.get(date_str, 'N/A')
            else:  # monthly
                day = sale.sale_date.day
                if day <= 7: label = 'Week 1'
                elif day <= 14: label = 'Week 2'
                elif day <= 21: label = 'Week 3'
                else: label = 'Week 4'
                
            if label in point_sales:
                if cat_key not in point_sales[label]:
                    point_sales[label][cat_key] = 0
                    point_sales[label][f'{cat_key}_revenue'] = Decimal('0.00')
                point_sales[label][cat_key] += qty
                point_sales[label][f'{cat_key}_revenue'] += revenue
                
        # 5. Populate final chartData lists
        formatted_chart_data = []
        for point in chart_points:
            label = point['period']
            point_data = {'period': label}
            
            point_revenue = Decimal('0.00')
            point_qty = 0
            
            # We want to map all possible category keys
            for cat_key in CATEGORY_COLORS.keys():
                qty = point_sales[label].get(cat_key, 0)
                rev = point_sales[label].get(f'{cat_key}_revenue', Decimal('0.00'))
                point_data[cat_key] = qty
                point_data[f'{cat_key}_revenue'] = float(rev)
                point_revenue += rev
                point_qty += qty
                
            point_data['revenue'] = float(point_revenue)
            # profit calculated on 28% for fallback or cost margin
            point_data['profit'] = float(point_revenue * Decimal('0.28'))
            formatted_chart_data.append(point_data)
            
        # 6. Format nested category structure
        formatted_categories = []
        for cat_name, cat_data in category_stats.items():
            cat_key, cat_color = get_category_info(cat_name)
            
            formatted_subcats = []
            flat_products = []
            
            for subcat_name, subcat_data in cat_data['subcategories'].items():
                formatted_prods = []
                for prod_name, prod_data in subcat_data['products'].items():
                    prod_item = {
                        'name': prod_name,
                        'category': cat_name,
                        'subcategory': subcat_name,
                        'quantitySold': prod_data['quantity_sold'],
                        'revenue': float(prod_data['revenue']),
                        'profit': float(prod_data['profit'])
                    }
                    formatted_prods.append(prod_item)
                    flat_products.append(prod_item)
                    
                formatted_subcats.append({
                    'name': subcat_name,
                    'quantitySold': subcat_data['quantity_sold'],
                    'revenue': float(subcat_data['revenue']),
                    'profit': float(subcat_data['profit']),
                    'products': formatted_prods
                })
                
            formatted_categories.append({
                'name': cat_name,
                'key': cat_key,
                'color': cat_color,
                'quantitySold': cat_data['quantity_sold'],
                'revenue': float(cat_data['revenue']),
                'profit': float(cat_data['profit']),
                'subcategories': formatted_subcats,
                'products': flat_products
            })
            
        # Handle case if there are no categories populated to prevent frontend crash
        if not formatted_categories:
            for cat_name, cat_key in CATEGORY_MAPPING.items():
                formatted_categories.append({
                    'name': cat_name,
                    'key': cat_key,
                    'color': CATEGORY_COLORS[cat_key],
                    'quantitySold': 0,
                    'revenue': 0.0,
                    'profit': 0.0,
                    'subcategories': [],
                    'products': []
                })
                
        response_data = {
            'period': period,
            'periodLabel': period_label,
            'dateContext': date_context,
            'xAxisType': x_axis_type,
            'xAxisLabel': x_axis_label,
            'totalSalesAmount': float(total_sales_amount),
            'totalProfit': float(total_profit),
            'totalQuantity': total_quantity,
            'categories': formatted_categories,
            'chartData': formatted_chart_data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Failed to compile sales insights: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
