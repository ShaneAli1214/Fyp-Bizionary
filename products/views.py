from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, F, Q, ExpressionWrapper, DecimalField, Avg
from django.db.models.functions import TruncMonth
from decimal import Decimal
from datetime import date, timedelta

from .models import Product, InventoryTransaction
from .serializers import ProductSerializer
from sales.models import Sale


@api_view(['GET', 'POST'])
def product_list(request):
    if request.method == 'GET':
        products = Product.objects.all()
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    serializer = ProductSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)

    if request.method == 'GET':
        serializer = ProductSerializer(product)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = ProductSerializer(product, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'PATCH':
        serializer = ProductSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    product.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# ERP INVENTORY INTELLIGENCE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def inventory_kpis(request):
    """
    ERP-grade Inventory KPIs — all computed dynamically.

    Returns:
      - Total inventory value
      - Inventory turnover ratio
      - Dead stock products (no sales in last 30 days, qty > 0)
      - Fast movers (top 20% by units sold in last 30 days)
      - Slow movers (bottom 20% with qty > 0 but low sales)
      - Average stock coverage days across portfolio
    """
    try:
        today = date.today()
        window_days = int(request.query_params.get('days', 30))
        window_start = today - timedelta(days=window_days)

        # ── Total Inventory Value ─────────────────────────────────────────
        inv_value = Product.objects.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('stock_quantity') * F('cost_price'),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            )
        )['total'] or Decimal('0.00')

        # ── Sales by product in window ────────────────────────────────────
        sales_by_product = dict(
            Sale.objects.filter(sale_date__gte=window_start)
            .values('product_id')
            .annotate(units=Sum('quantity_sold'))
            .values_list('product_id', 'units')
        )

        # ── COGS for turnover ─────────────────────────────────────────────
        total_cogs = Sale.objects.filter(sale_date__gte=window_start).aggregate(
            cogs=Sum(
                ExpressionWrapper(
                    F('quantity_sold') * F('unit_cost_price'),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            )
        )['cogs'] or Decimal('0.00')

        turnover_ratio = (float(total_cogs) / float(inv_value) * (365 / window_days)) if inv_value > 0 else 0.0

        # ── Per-product analysis ──────────────────────────────────────────
        products = Product.objects.filter(status='ACTIVE').values(
            'id', 'name', 'sku', 'stock_quantity', 'cost_price', 'min_stock'
        )

        dead_stock = []
        fast_movers = []
        slow_movers = []
        reorder_needed = []

        product_velocities = []
        for p in products:
            units_sold = sales_by_product.get(p['id'], 0)
            avg_daily_sales = units_sold / window_days if window_days > 0 else 0
            coverage_days = (p['stock_quantity'] / avg_daily_sales) if avg_daily_sales > 0 else None
            inv_val = float(p['stock_quantity']) * float(p['cost_price'])

            product_velocities.append({
                'id': p['id'],
                'name': p['name'],
                'sku': p['sku'],
                'stock_quantity': p['stock_quantity'],
                'units_sold': units_sold,
                'avg_daily_sales': round(avg_daily_sales, 2),
                'coverage_days': round(coverage_days, 1) if coverage_days is not None else None,
                'inventory_value': round(inv_val, 2),
                'min_stock': p['min_stock'],
            })

            if p['stock_quantity'] > 0 and units_sold == 0:
                dead_stock.append({'id': p['id'], 'name': p['name'], 'sku': p['sku'],
                                   'stock_quantity': p['stock_quantity'], 'inventory_value': round(inv_val, 2)})

            if avg_daily_sales > 0 and coverage_days is not None and coverage_days < 7:
                reorder_needed.append({
                    'id': p['id'], 'name': p['name'], 'sku': p['sku'],
                    'stock_quantity': p['stock_quantity'],
                    'avg_daily_sales': round(avg_daily_sales, 2),
                    'coverage_days': round(coverage_days, 1),
                    'suggested_reorder_qty': round(avg_daily_sales * 30),  # 30-day restock
                })

        # Top 20% by units sold
        sorted_by_sales = sorted(product_velocities, key=lambda x: x['units_sold'], reverse=True)
        top_20pct = max(1, len(sorted_by_sales) // 5)
        fast_movers = sorted_by_sales[:top_20pct]
        slow_movers = [p for p in sorted_by_sales[-top_20pct:] if p['stock_quantity'] > 0]

        # Average stock coverage days (only products with sales)
        products_with_sales = [p for p in product_velocities if p['coverage_days'] is not None]
        avg_coverage_days = (
            round(sum(p['coverage_days'] for p in products_with_sales) / len(products_with_sales), 1)
            if products_with_sales else None
        )

        return Response({
            'period_days': window_days,
            'as_of_date': today.isoformat(),
            'summary': {
                'total_inventory_value': float(inv_value),
                'inventory_turnover_ratio': round(turnover_ratio, 2),
                'total_products': len(product_velocities),
                'dead_stock_count': len(dead_stock),
                'avg_stock_coverage_days': avg_coverage_days,
                'reorder_needed_count': len(reorder_needed),
            },
            'dead_stock': dead_stock[:20],
            'fast_movers': fast_movers,
            'slow_movers': slow_movers,
            'reorder_needed': reorder_needed,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def reorder_suggestions(request):
    """
    Dynamic reorder intelligence based on actual sales velocity.

    Instead of static min_stock thresholds, computes:
      - Average daily sales over the last N days
      - Current days of inventory remaining
      - Suggested reorder quantity (to cover 30 days)

    Query params:
      ?days=30   — lookback window for velocity calculation (default: 30)
      ?threshold=7  — flag products with < N days of cover (default: 7)
    """
    try:
        today = date.today()
        window_days = int(request.query_params.get('days', 30))
        coverage_threshold = int(request.query_params.get('threshold', 7))
        window_start = today - timedelta(days=window_days)

        # Sales velocity per product
        sales_velocity = dict(
            Sale.objects.filter(sale_date__gte=window_start)
            .values('product_id')
            .annotate(total_sold=Sum('quantity_sold'))
            .values_list('product_id', 'total_sold')
        )

        products = Product.objects.filter(
            status='ACTIVE', stock_quantity__gt=0
        ).values('id', 'name', 'sku', 'stock_quantity', 'cost_price', 'unit_price', 'min_stock', 'supplier_id')

        suggestions = []
        for p in products:
            units_sold = sales_velocity.get(p['id'], 0)
            avg_daily = units_sold / window_days if window_days > 0 else 0

            if avg_daily > 0:
                days_remaining = p['stock_quantity'] / avg_daily
            else:
                days_remaining = None  # No recent sales — unknown velocity

            # Only suggest reorder if coverage < threshold OR below static min_stock
            needs_reorder = (
                (days_remaining is not None and days_remaining < coverage_threshold) or
                p['stock_quantity'] < p['min_stock']
            )

            if needs_reorder:
                # Suggest enough stock for 30 days at current velocity, minimum 1
                if avg_daily > 0:
                    suggested_qty = max(1, round(avg_daily * 30 - p['stock_quantity']))
                else:
                    suggested_qty = max(1, p['min_stock'] - p['stock_quantity'])

                suggestions.append({
                    'product_id': p['id'],
                    'name': p['name'],
                    'sku': p['sku'],
                    'current_stock': p['stock_quantity'],
                    'min_stock_threshold': p['min_stock'],
                    'avg_daily_sales': round(avg_daily, 2),
                    'days_remaining': round(days_remaining, 1) if days_remaining is not None else 'Unknown',
                    'suggested_reorder_qty': suggested_qty,
                    'estimated_reorder_cost': round(suggested_qty * float(p['cost_price']), 2),
                    'urgency': (
                        'CRITICAL' if (days_remaining is not None and days_remaining < 3) or p['stock_quantity'] == 0
                        else 'HIGH' if days_remaining is not None and days_remaining < coverage_threshold
                        else 'MEDIUM'
                    ),
                })

        # Sort by urgency
        urgency_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2}
        suggestions.sort(key=lambda x: (urgency_order.get(x['urgency'], 3), x.get('days_remaining') or 999))

        return Response({
            'as_of_date': today.isoformat(),
            'lookback_days': window_days,
            'coverage_threshold_days': coverage_threshold,
            'total_suggestions': len(suggestions),
            'suggestions': suggestions,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def inventory_ledger(request, pk):
    """
    Full inventory movement audit trail for a specific product.
    Returns all InventoryTransaction records (IN/OUT/ADJUSTMENT) with references.
    """
    product = get_object_or_404(Product, pk=pk)
    transactions = InventoryTransaction.objects.filter(product=product).order_by('-date', '-created_at')

    # Running balance (most recent first, so reverse for calculation)
    txn_list = list(transactions.values(
        'id', 'txn_type', 'quantity', 'reference_type', 'reference_id', 'note', 'date', 'created_at'
    ))

    # Compute running balance
    balance = product.stock_quantity
    for txn in txn_list:
        txn['balance_after'] = balance
        if txn['txn_type'] == 'IN':
            balance -= txn['quantity']
        elif txn['txn_type'] == 'OUT':
            balance += txn['quantity']

    return Response({
        'product_id': product.id,
        'product_name': product.name,
        'sku': product.sku,
        'current_stock': product.stock_quantity,
        'total_movements': len(txn_list),
        'ledger': txn_list,
    })
