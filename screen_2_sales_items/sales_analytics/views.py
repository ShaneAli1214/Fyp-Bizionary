from django.shortcuts import render
from django.db.models import Sum, Count, Avg, F, Q, ExpressionWrapper, DecimalField
from django.db.models.functions import TruncMonth
from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime, timedelta
from decimal import Decimal
from sales.models import Sale
from products.models import Product
from .models import SalesTarget
from .serializers import (
    SalesKPISerializer, MonthlyPerformanceSerializer,
    CategoryPerformanceSerializer, TopProductSerializer,
    SalesTargetSerializer
)


@api_view(['GET'])
def sales_kpis(request):
    """
    Calculate top 4 KPI cards for Sales & Items Management screen:
    1. Total Sales (PKR)
    2. Total Revenue (PKR)
    3. Total Orders (count)
    4. Growth Rate (%)
    """
    # Date ranges
    today = datetime.now().date()
    current_month_start = today.replace(day=1)
    last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    last_month_end = current_month_start - timedelta(days=1)
    
    # Current month metrics
    current_sales = Sale.objects.filter(sale_date__gte=current_month_start)
    
    total_sales_value = current_sales.aggregate(
        total=Sum('total_price')
    )['total'] or Decimal('0')
    
    total_revenue = total_sales_value  # Same as total sales for this context
    total_orders = current_sales.count()

    # Fallback for demo/seeded environments where products exist but sales rows are not inserted yet.
    if total_sales_value == 0 and total_orders == 0:
        product_totals = Product.objects.aggregate(
            total_catalog_value=Sum(
                ExpressionWrapper(
                    F('unit_price') * F('stock_quantity'),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            ),
            product_count=Count('id')
        )

        total_sales_value = product_totals['total_catalog_value'] or Decimal('0')
        total_revenue = total_sales_value
        total_orders = product_totals['product_count'] or 0
    
    # Last month metrics for comparison
    last_month_sales = Sale.objects.filter(
        sale_date__gte=last_month_start,
        sale_date__lte=last_month_end
    )
    
    last_month_revenue = last_month_sales.aggregate(
        total=Sum('total_price')
    )['total'] or Decimal('0')
    
    last_month_orders = last_month_sales.count()
    
    # Calculate growth rate
    if last_month_revenue > 0:
        growth_rate = ((total_revenue - last_month_revenue) / last_month_revenue) * 100
    else:
        growth_rate = Decimal('0') if total_revenue == 0 else Decimal('100')
    
    # Calculate vs last month percentages
    if last_month_revenue > 0:
        sales_vs_last = ((total_sales_value - last_month_revenue) / last_month_revenue) * 100
        revenue_vs_last = sales_vs_last
    else:
        sales_vs_last = Decimal('0')
        revenue_vs_last = Decimal('0')
    
    if last_month_orders > 0:
        orders_vs_last = ((total_orders - last_month_orders) / last_month_orders) * 100
    else:
        orders_vs_last = Decimal('0')
    
    # Check against target
    current_target = SalesTarget.objects.filter(
        start_date__lte=today,
        end_date__gte=today
    ).first()
    
    if current_target:
        growth_vs_target = ((total_revenue / current_target.target_amount) * 100) - 100
    else:
        growth_vs_target = Decimal('0')
    
    kpi_data = {
        'total_sales': f'PKR {total_sales_value:,.0f}',
        'total_revenue': f'PKR {total_revenue:,.0f}',
        'total_orders': total_orders,
        'growth_rate': f'+{growth_rate:.1f}%' if growth_rate >= 0 else f'{growth_rate:.1f}%',
        'sales_vs_last_month': f'+{sales_vs_last:.1f}%' if sales_vs_last >= 0 else f'{sales_vs_last:.1f}%',
        'revenue_vs_last_month': f'+{revenue_vs_last:.1f}%' if revenue_vs_last >= 0 else f'{revenue_vs_last:.1f}%',
        'orders_vs_last_month': f'+{orders_vs_last:.1f}%' if orders_vs_last >= 0 else f'{orders_vs_last:.1f}%',
        'growth_vs_target': f'+{growth_vs_target:.1f}%' if growth_vs_target >= 0 else f'{growth_vs_target:.1f}%',
    }
    
    serializer = SalesKPISerializer(kpi_data)
    return Response(serializer.data)


@api_view(['GET'])
def monthly_performance(request):
    """
    Get monthly sales performance for the chart
    Returns last 6 months of revenue and sales count
    """
    # Get number of months from query param (default 6)
    months = int(request.query_params.get('months', 6))
    
    # Calculate date range
    today = datetime.now().date()
    start_date = today - timedelta(days=months * 30)
    
    # Aggregate sales by month
    monthly_data = Sale.objects.filter(
        sale_date__gte=start_date
    ).annotate(
        month=TruncMonth('sale_date')
    ).values('month').annotate(
        revenue=Sum('total_price'),
        sales_count=Count('id')
    ).order_by('month')
    
    # Format data with month names
    results = []
    for item in monthly_data:
        month_date = item['month']
        results.append({
            'month': month_date.strftime('%Y-%m'),
            'month_name': month_date.strftime('%b'),
            'revenue': item['revenue'],
            'sales_count': item['sales_count']
        })
    
    serializer = MonthlyPerformanceSerializer(results, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def category_breakdown(request):
    """
    Sales breakdown by product category
    """
    # Aggregate by category
    category_data = Sale.objects.values('product__category').annotate(
        total_revenue=Sum('total_price'),
        total_quantity=Sum('quantity_sold'),
        order_count=Count('id')
    ).order_by('-total_revenue')
    
    # Calculate total for percentage
    total_revenue = Sale.objects.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0')
    
    results = []
    for item in category_data:
        percentage = (item['total_revenue'] / total_revenue * 100) if total_revenue > 0 else 0
        results.append({
            'category': item['product__category'] or 'Uncategorized',
            'total_revenue': item['total_revenue'],
            'total_quantity': item['total_quantity'],
            'order_count': item['order_count'],
            'percentage_of_total': percentage
        })
    
    serializer = CategoryPerformanceSerializer(results, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def top_products(request):
    """
    Get top-selling products
    """
    limit = int(request.query_params.get('limit', 10))
    
    # Aggregate by product
    top_products = Sale.objects.values(
        'product__id', 'product__name', 'product__sku', 'product__category'
    ).annotate(
        total_quantity_sold=Sum('quantity_sold'),
        total_revenue=Sum('total_price'),
        order_count=Count('id')
    ).order_by('-total_revenue')[:limit]
    
    results = []
    for item in top_products:
        results.append({
            'product_id': item['product__id'],
            'product_name': item['product__name'],
            'product_code': item['product__sku'],
            'category': item['product__category'],
            'total_quantity_sold': item['total_quantity_sold'],
            'total_revenue': item['total_revenue'],
            'order_count': item['order_count']
        })
    
    serializer = TopProductSerializer(results, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def sales_trends(request):
    """
    Analyze sales trends over time
    Returns daily, weekly, or monthly trends based on query param
    """
    period = request.query_params.get('period', 'daily')  # daily, weekly, monthly
    days = int(request.query_params.get('days', 30))
    
    start_date = datetime.now().date() - timedelta(days=days)
    sales = Sale.objects.filter(sale_date__gte=start_date)
    
    if period == 'daily':
        trend_data = sales.values('sale_date').annotate(
            revenue=Sum('total_price'),
            count=Count('id'),
            avg_order_value=Avg('total_price')
        ).order_by('sale_date')
    else:
        trend_data = sales.annotate(
            period_date=TruncMonth('sale_date')
        ).values('period_date').annotate(
            revenue=Sum('total_price'),
            count=Count('id'),
            avg_order_value=Avg('total_price')
        ).order_by('period_date')
    
    return Response(list(trend_data))


@api_view(['GET', 'POST'])
def sales_targets(request):
    """
    GET: List all sales targets
    POST: Create new sales target
    """
    if request.method == 'GET':
        targets = SalesTarget.objects.all()
        serializer = SalesTargetSerializer(targets, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = SalesTargetSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
