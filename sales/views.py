from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import F
from decimal import Decimal, InvalidOperation
from datetime import datetime
import csv, io

from .models import Sale
from .serializers import SaleSerializer
from products.models import Product


@api_view(['GET', 'POST'])
def sale_list(request):
    if request.method == 'GET':
        sales = Sale.objects.all()
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data)

    serializer = SaleSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def sale_detail(request, pk):
    sale = get_object_or_404(Sale, pk=pk)

    if request.method == 'GET':
        serializer = SaleSerializer(sale)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = SaleSerializer(sale, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    sale.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────
# BULK UPLOAD ENDPOINT
# POST /api/sales/bulk-upload/
#
# Accepts:
#   - JSON body: { "sales": [ {...}, {...} ] }
#   - CSV file:  multipart/form-data with field "file"
#
# Each sale row needs:
#   product_id (int) OR product_code (str)
#   quantity_sold (int)
#   unit_price (decimal)
#   sale_date (YYYY-MM-DD)
#   customer_name (str, optional — default "Walk-in Customer")
#   payment_status (PAID/PENDING, optional — default PAID)
#   payment_method (CASH/CARD/etc., optional — default CASH)
#
# Signals FIRE for each record → InventoryTransaction +
# CashTransaction + AuditLog are created automatically.
# ─────────────────────────────────────────────────────────────

REQUIRED_FIELDS = ['quantity_sold', 'unit_price', 'sale_date']


def _parse_sale_row(row: dict, row_num: int):
    """Validate and normalise one sale row dict. Returns (data_dict, error_str)."""
    errors = []

    # Resolve product
    product = None
    if row.get('product_id'):
        try:
            product = Product.objects.get(pk=int(row['product_id']))
        except (Product.DoesNotExist, ValueError):
            errors.append(f"Row {row_num}: product_id={row['product_id']} not found")
    elif row.get('product_code'):
        try:
            product = Product.objects.get(sku=row['product_code'].strip())
        except Product.DoesNotExist:
            errors.append(f"Row {row_num}: product_code='{row['product_code']}' not found")
    else:
        errors.append(f"Row {row_num}: must provide product_id or product_code")

    if errors:
        return None, errors[0]

    # Parse required numerics
    try:
        qty = int(row['quantity_sold'])
        if qty <= 0:
            raise ValueError
    except (KeyError, ValueError):
        return None, f"Row {row_num}: quantity_sold must be a positive integer"

    try:
        unit_price = Decimal(str(row['unit_price']))
    except (KeyError, InvalidOperation):
        return None, f"Row {row_num}: unit_price is invalid"

    # Parse date
    sale_date_raw = row.get('sale_date', '')
    try:
        sale_date = datetime.strptime(str(sale_date_raw).strip(), '%Y-%m-%d').date()
    except ValueError:
        return None, f"Row {row_num}: sale_date '{sale_date_raw}' must be YYYY-MM-DD"

    # Optional fields
    customer_name   = str(row.get('customer_name', 'Walk-in Customer')).strip() or 'Walk-in Customer'
    payment_status  = str(row.get('payment_status', 'PAID')).upper()
    payment_method  = str(row.get('payment_method', 'CASH')).upper()

    if payment_status not in ('PAID', 'PENDING', 'FAILED'):
        payment_status = 'PAID'
    if payment_method not in ('CASH', 'CARD', 'EASYPAY_JAZZCASH', 'BANK_TRANSFER', 'OTHER'):
        payment_method = 'CASH'

    total_price = unit_price * qty

    return {
        'product': product,
        'customer_name': customer_name,
        'quantity_sold': qty,
        'unit_price': unit_price,
        'unit_cost_price': product.cost_price,   # snapshot at upload time
        'total_price': total_price,
        'sale_date': sale_date,
        'payment_status': payment_status,
        'payment_method': payment_method,
        'line_items': [{
            'product': product.id,
            'product_name': product.name,
            'product_code': product.sku,
            'quantity_sold': qty,
            'unit_price': str(unit_price),
            'total_price': str(total_price),
        }],
    }, None


@api_view(['POST'])
def bulk_upload_sales(request):
    """
    Bulk upload sales records.
    Supports JSON body or CSV file upload.
    Each Sale is created individually so Django signals fire,
    ensuring InventoryTransaction + CashTransaction + AuditLog
    are created automatically.
    """
    rows = []
    parse_errors = []

    # ── Detect input format ──────────────────────────────────
    if request.FILES.get('file'):
        # CSV upload
        csv_file = request.FILES['file']
        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'Only .csv files are supported'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            decoded = csv_file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded))
            rows = list(reader)
        except Exception as e:
            return Response({'error': f'Failed to parse CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    elif request.data.get('sales'):
        # JSON body
        rows = request.data['sales']
        if not isinstance(rows, list):
            return Response({'error': '"sales" must be a list'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response(
            {'error': 'Provide either a CSV file (field: "file") or JSON body with "sales" list'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not rows:
        return Response({'error': 'No rows found in upload'}, status=status.HTTP_400_BAD_REQUEST)

    # ── Validate all rows first ──────────────────────────────
    parsed_rows = []
    for i, row in enumerate(rows, start=1):
        data, err = _parse_sale_row(row, i)
        if err:
            parse_errors.append(err)
        else:
            parsed_rows.append(data)

    if parse_errors:
        return Response({
            'error': 'Validation failed. No records were saved.',
            'validation_errors': parse_errors,
            'total_rows': len(rows),
            'failed_rows': len(parse_errors),
        }, status=status.HTTP_400_BAD_REQUEST)

    # ── Save all records (signals fire per-record) ──────────
    created_sales = []
    runtime_errors = []

    with transaction.atomic():
        for i, data in enumerate(parsed_rows, start=1):
            try:
                product = data.pop('product')
                sale = Sale(product=product, **data)
                sale.save()
                created_sales.append({
                    'row': i,
                    'sale_id': sale.id,
                    'product': product.name,
                    'qty': sale.quantity_sold,
                    'total': float(sale.total_price),
                    'date': str(sale.sale_date),
                })
            except Exception as e:
                runtime_errors.append(f"Row {i}: {str(e)}")

        if runtime_errors:
            # Roll back everything if any row failed
            raise transaction.TransactionManagementError(
                f"{len(runtime_errors)} rows failed during save"
            )

    # ── Return summary ───────────────────────────────────────
    total_revenue = sum(s['total'] for s in created_sales)
    return Response({
        'success': True,
        'message': f'{len(created_sales)} sales records created successfully',
        'summary': {
            'total_records_created': len(created_sales),
            'total_revenue': round(total_revenue, 2),
            'date_range': {
                'from': min(s['date'] for s in created_sales),
                'to': max(s['date'] for s in created_sales),
            },
        },
        'created_sales': created_sales,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def sync_excel_sales(request):
    """
    POST /api/sales/sync-excel/
    Triggers dynamic scan and import of monthly sales Excel files.
    Accepts: { "force": true } in JSON body (optional)
    """
    try:
        force = request.data.get('force', False)
        # Handle string 'true' or 'True' too
        if isinstance(force, str):
            force = force.lower() == 'true'
            
        from .services import SalesImportService
        result = SalesImportService.sync_monthly_sales_files(force=force)
        
        if not result['success']:
            return Response({'error': result.get('error')}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': f"Failed to sync sales files: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

