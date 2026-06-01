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
from django.db.models import Sum, Count, Max, F, Q, ExpressionWrapper, DecimalField
from django.db.models.functions import TruncMonth, TruncDay, ExtractMonth, ExtractYear
from django.utils.dateparse import parse_date
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

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

            # Legacy names
            'total_invoices': total_invoices,
            'unpaid_invoices': pending_invoices,
            'low_stock_count': low_stock_count,
        }

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
            parsed_end_date = timezone.localdate()
            parsed_start_date = parsed_end_date - timedelta(days=29)
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
