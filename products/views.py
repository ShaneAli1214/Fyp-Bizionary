from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, F, Q, ExpressionWrapper, DecimalField, Avg
from django.db.models.functions import TruncMonth
from decimal import Decimal, InvalidOperation
from datetime import date, timedelta
from functools import wraps
import csv, io
from django.db import transaction

from .models import Product, InventoryTransaction, BulkProduct
from .serializers import ProductSerializer
from sales.models import Sale
from purchases.models import SupplierCompany
from user_management.views import log_action



def restrict_accountant_modifications(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        from user_management.views import get_request_user
        user = get_request_user(request)
        if user:
            role_name = user.role.name if user.role else ''
            if role_name == 'Accountant':
                if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                    return Response({
                        'success': False,
                        'error': 'Permission Denied. Accountants are not permitted to modify products or stock.'
                    }, status=status.HTTP_403_FORBIDDEN)
        return view_func(request, *args, **kwargs)
    return wrapper


def restrict_to_admin_or_manager(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        from user_management.views import get_request_user
        user = get_request_user(request)
        role_level = user.role.level.upper() if user and user.role else ''
        role_name = user.role.name.lower() if user and user.role else ''
        if role_level not in ['ADMIN', 'MANAGER'] and 'admin' not in role_name and 'manager' not in role_name:
            return Response({
                'error': 'You do not have permission to perform bulk uploads'
            }, status=status.HTTP_403_FORBIDDEN)
        return view_func(request, *args, **kwargs)
    return wrapper



@api_view(['GET', 'POST'])
@restrict_accountant_modifications
def product_list(request):
    if request.method == 'GET':
        products = Product.objects.all()
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    serializer = ProductSerializer(data=request.data)
    if serializer.is_valid():
        product = serializer.save()
        log_action(request, 'CREATE', f"Product '{product.name}' (SKU: {product.sku}) created.", module='Products')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@restrict_accountant_modifications
def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)

    if request.method == 'GET':
        serializer = ProductSerializer(product)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = ProductSerializer(product, data=request.data)
        if serializer.is_valid():
            serializer.save()
            log_action(request, 'UPDATE', f"Product '{product.name}' (SKU: {product.sku}) updated.", module='Products')
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'PATCH':
        serializer = ProductSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_action(request, 'UPDATE', f"Product '{product.name}' (SKU: {product.sku}) partially updated.", module='Products')
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    log_action(request, 'DELETE', f"Product '{product.name}' (SKU: {product.sku}) permanently deleted.", module='Products')
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


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@restrict_to_admin_or_manager
@restrict_accountant_modifications
def bulk_upload_products(request):
    """
    POST /api/products/bulk-upload
    Accepts multipart/form-data with field "file".
    Parses CSV row by row and inserts valid products in bulk.
    """
    from user_management.views import get_request_user
    user = get_request_user(request)

    # 1. Get the file
    csv_file = request.FILES.get('file')
    if not csv_file:
        return Response({'error': 'Please select a CSV file (field: "file")'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'Only .csv files are supported'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 2. Parse the CSV
    try:
        decoded = csv_file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(decoded))
        rows = list(reader)
    except Exception as e:
        return Response({'error': f'Failed to parse CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    if not rows:
        return Response({'error': 'File is empty'}, status=status.HTTP_400_BAD_REQUEST)

    total = len(rows)
    inserted = 0
    duplicates = 0
    errors = 0
    
    inserted_rows_details = []
    duplicate_rows_details = []
    error_rows_details = []
    warning_rows_details = []

    seen_skus = set()
    products_to_create = []
    bulk_products_to_create = []
    ledger_transactions = []

    # Cache for SupplierCompany to avoid redundant queries/creations in the loop
    supplier_cache = {}

    import re
    EMAIL_REGEX = re.compile(r"^[\w\.\+-]+@[\w\.-]+\.\w+$")
    PHONE_REGEX = re.compile(r"^\+?[0-9\s\-()]{7,20}$")

    for i, row in enumerate(rows, start=1):
        # Extract headers with fallbacks to avoid key errors
        product_name = str(row.get('product_name') or '').strip()
        sku = str(row.get('sku') or '').strip()
        category = str(row.get('category') or '').strip()
        purchase_price_raw = str(row.get('purchase_price') or '').strip()
        selling_price_raw = str(row.get('selling_price') or '').strip()
        quantity_raw = str(row.get('quantity') or '').strip()
        supplier_company = str(row.get('supplier_company') or '').strip()
        supplier_contact = str(row.get('supplier_contact') or '').strip()
        unit = str(row.get('unit') or '').strip()
        description = str(row.get('description') or '').strip()
        reorder_level_raw = str(row.get('reorder_level') or '').strip()

        # 1. product_name check
        if not product_name:
            error_rows_details.append({"row": i, "reason": "missing product_name"})
            errors += 1
            continue
            
        # 2. sku presence check
        if not sku:
            error_rows_details.append({"row": i, "reason": "missing sku"})
            errors += 1
            continue
            
        # 3. purchase_price presence check
        if not purchase_price_raw:
            error_rows_details.append({"row": i, "reason": "missing purchase_price"})
            errors += 1
            continue
            
        # 4. selling_price presence check
        if not selling_price_raw:
            error_rows_details.append({"row": i, "reason": "missing selling_price"})
            errors += 1
            continue
            
        # 5. quantity presence check
        if not quantity_raw:
            error_rows_details.append({"row": i, "reason": "missing quantity"})
            errors += 1
            continue

        # Data type parsing and constraints validation
        # purchase_price -> positive number (> 0)
        try:
            purchase_price = Decimal(purchase_price_raw)
            if purchase_price <= Decimal('0.00'):
                raise InvalidOperation
        except (ValueError, InvalidOperation):
            error_rows_details.append({"row": i, "reason": "purchase_price must be a positive number"})
            errors += 1
            continue

        # selling_price -> must be >= purchase_price
        try:
            selling_price = Decimal(selling_price_raw)
        except (ValueError, InvalidOperation):
            error_rows_details.append({"row": i, "reason": "invalid selling_price"})
            errors += 1
            continue

        if selling_price < purchase_price:
            error_rows_details.append({"row": i, "reason": "selling_price must be greater than or equal to purchase_price"})
            errors += 1
            continue

        # quantity -> must be a non-negative whole number (>= 0)
        try:
            quantity = int(quantity_raw)
            if quantity < 0:
                raise ValueError
        except ValueError:
            error_rows_details.append({"row": i, "reason": "invalid quantity, must be a non-negative whole number"})
            errors += 1
            continue

        # reorder_level -> optional, must be a non-negative integer if provided
        reorder_level = 0
        if reorder_level_raw:
            try:
                reorder_level = int(reorder_level_raw)
                if reorder_level < 0:
                    raise ValueError
            except ValueError:
                error_rows_details.append({"row": i, "reason": "invalid reorder_level, must be a non-negative integer"})
                errors += 1
                continue

        # supplier_contact -> optional, allowed to be any format
        pass

        # unit -> optional, default to "pcs" if not provided
        if not unit:
            unit = "pcs"
            warning_rows_details.append({"row": i, "reason": "unit is missing, defaulted to 'pcs'"})

        # Duplicate check (SKU uniqueness against DB and current batch)
        if sku in seen_skus or Product.objects.filter(sku=sku).exists():
            existing_product = Product.objects.filter(sku=sku).first()
            if existing_product:
                duplicate_rows_details.append({
                    "row": i,
                    "sku": sku,
                    "product_name": product_name,
                    "existing_product": {
                        "id": existing_product.id,
                        "name": existing_product.name,
                        "category": existing_product.category,
                        "cost_price": float(existing_product.cost_price),
                        "unit_price": float(existing_product.unit_price),
                        "stock_quantity": existing_product.stock_quantity,
                    }
                })
            else:
                duplicate_rows_details.append({
                    "row": i,
                    "sku": sku,
                    "product_name": product_name,
                    "reason": "Duplicate SKU within the uploaded file"
                })
            duplicates += 1
            continue

        # Valid row: Add SKU to processed set
        seen_skus.add(sku)

        # Resolve supplier company
        supplier_instance = None
        if supplier_company:
            if supplier_company not in supplier_cache:
                supplier_instance, _ = SupplierCompany.objects.get_or_create(
                    name=supplier_company,
                    defaults={"contact_number": supplier_contact}
                )
                supplier_cache[supplier_company] = supplier_instance
            else:
                supplier_instance = supplier_cache[supplier_company]

        # Prepare Product instance
        product_instance = Product(
            name=product_name,
            sku=sku,
            category=category,
            cost_price=purchase_price,
            unit_price=selling_price,
            stock_quantity=quantity,
            min_stock=reorder_level,
            unit=unit,
            description=description,
            supplier=supplier_instance
        )
        products_to_create.append(product_instance)

        # Prepare BulkProduct staging instance
        bulk_product_instance = BulkProduct(
            product_name=product_name,
            sku=sku,
            category=category,
            purchase_price=purchase_price,
            selling_price=selling_price,
            quantity=quantity,
            supplier_company=supplier_company,
            supplier_contact=supplier_contact,
            unit=unit,
            description=description,
            reorder_level=reorder_level,
            added_by=user
        )
        bulk_products_to_create.append(bulk_product_instance)

        inserted_rows_details.append({
            "row": i,
            "sku": sku,
            "product_name": product_name,
            "category": category,
            "quantity": quantity,
            "purchase_price": float(purchase_price),
            "selling_price": float(selling_price)
        })
        inserted += 1

    # 3. Perform bulk creation in the database
    if products_to_create:
        try:
            with transaction.atomic():
                # Bulk create Products
                created_products = Product.objects.bulk_create(products_to_create)
                
                # Bulk create BulkProduct history records
                BulkProduct.objects.bulk_create(bulk_products_to_create)
                
                # Create corresponding initial opening_stock ledger transactions
                today = date.today()
                for prod in created_products:
                    if prod.stock_quantity > 0:
                        ledger_transactions.append(InventoryTransaction(
                            product=prod,
                            txn_type=InventoryTransaction.TYPE_IN,
                            quantity=prod.stock_quantity,
                            reference_type='opening_stock',
                            reference_id=prod.id,
                            note=f'Opening stock balance from bulk upload (SKU: {prod.sku})',
                            date=today,
                        ))
                
                if ledger_transactions:
                    InventoryTransaction.objects.bulk_create(ledger_transactions)

                # Log overall action to Audit Logs/Activity Log
                log_action(request, 'CREATE', f"Bulk uploaded {len(created_products)} products via CSV.", module='Products')
        except Exception as e:
            return Response({
                'error': f'Database transaction failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        "total": total,
        "insertedCount": inserted,
        "duplicatesCount": duplicates,
        "errorsCount": errors,
        "warningsCount": len(warning_rows_details),
        "inserted": inserted_rows_details,
        "duplicates": duplicate_rows_details,
        "errors": error_rows_details,
        "warnings": warning_rows_details,
        "insertedRows": inserted_rows_details,
        "duplicateRows": duplicate_rows_details,
        "errorRows": error_rows_details,
        "warningRows": warning_rows_details,
    }, status=status.HTTP_201_CREATED if inserted > 0 else status.HTTP_200_OK)

