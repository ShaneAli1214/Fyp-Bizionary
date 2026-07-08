from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import F
from functools import wraps

from .models import Purchase, OrderedSlip, SupplierCompany
from .serializers import PurchaseSerializer, OrderedSlipSerializer, SupplierCompanySerializer
from user_management.views import log_action


@api_view(['GET'])
def categories_list(request):
    """
    Return unique product categories that have at least one product.
    Only categories from products.Product.category are returned — this
    ensures no phantom/empty categories appear in the UI.
    Returns a sorted list of { value, label } objects.
    """
    from products.models import Product

    # Only categories that actually have products
    product_cats = (
        Product.objects.exclude(category__isnull=True).exclude(category='')
        .values_list('category', flat=True)
        .distinct()
    )

    def normalize_key(value):
        return value.lower().replace('-', ' ').replace('_', ' ').strip()

    def make_label(value):
        return value.replace('-', ' ').replace('_', ' ').title().strip()

    # Deduplicate (case-insensitive) — prefer title-case / spaced versions
    best = {}
    for raw in product_cats:
        raw = raw.strip()
        if not raw:
            continue
        key = normalize_key(raw)
        if key not in best:
            best[key] = raw
        else:
            existing = best[key]
            if raw.count(' ') > existing.count(' '):
                best[key] = raw
            elif raw.count(' ') == existing.count(' ') and raw[0].isupper() and not existing[0].isupper():
                best[key] = raw

    categories = sorted(
        [{'value': v, 'label': make_label(v)} for v in best.values()],
        key=lambda x: x['label'].lower()
    )
    return Response(categories)


@api_view(['DELETE'])
def delete_category(request):
    """
    DELETE /api/purchases/categories/delete/?name=<category_name>
    Removes a category from the screen2 Category table.
    Rejected if any products or suppliers are assigned to this category.
    """
    from products.models import Product
    from purchases.models import SupplierCompany
    from screen_2_sales_items.items_management.models import Category as S2Category

    name = request.query_params.get('name', '').strip()
    if not name:
        return Response({'error': 'Provide ?name=<category_name>'}, status=status.HTTP_400_BAD_REQUEST)

    # Safety: refuse deletion if products use this category
    product_count = Product.objects.filter(category__iexact=name).count()
    if product_count > 0:
        return Response(
            {'error': f'Cannot delete "{name}": {product_count} product(s) still assigned to this category.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Safety: refuse deletion if suppliers use this category
    supplier_count = SupplierCompany.objects.filter(category__iexact=name).count()
    if supplier_count > 0:
        return Response(
            {'error': f'Cannot delete "{name}": {supplier_count} supplier(s) still assigned to this category.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Delete from screen2 Category table (if exists)
    deleted_count, _ = S2Category.objects.filter(name__iexact=name).delete()

    return Response({'deleted': deleted_count, 'name': name}, status=status.HTTP_200_OK)


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


def _serialize_validation_errors(errors):
    return errors


@api_view(['GET', 'POST'])
@restrict_accountant_modifications
def company_list_create(request):
    if request.method == 'GET':
        companies = SupplierCompany.objects.all()
        serializer = SupplierCompanySerializer(companies, many=True)
        return Response(serializer.data)

    serializer = SupplierCompanySerializer(data=request.data)
    if serializer.is_valid():
        company, created = SupplierCompany.objects.get_or_create(
            name=serializer.validated_data['name'],
            defaults=serializer.validated_data,
        )
        if not created:
            update_fields = []
            for field_name, value in serializer.validated_data.items():
                if getattr(company, field_name) != value:
                    setattr(company, field_name, value)
                    update_fields.append(field_name)
            if update_fields:
                company.save(update_fields=update_fields + ['updated_at'])
        if created:
            log_action(request, 'CREATE', f"Supplier company '{company.name}' created.", module='Purchases')
        return Response(SupplierCompanySerializer(company).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@restrict_accountant_modifications
def company_detail_delete(request, pk):
    company = get_object_or_404(SupplierCompany, pk=pk)
    log_action(request, 'DELETE', f"Supplier company '{company.name}' deleted.", module='Purchases')
    company.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


def _apply_receipt_to_inventory(ordered_slip, new_received_quantity):
    received_delta = max(int(new_received_quantity) - int(ordered_slip.quantity_received), 0)
    if received_delta <= 0:
        return

    from products.models import InventoryTransaction
    from django.utils import timezone
    loc_display = 'Direct to Shop' if ordered_slip.delivery_location == 'SHOP' else 'Warehouse'
    InventoryTransaction.objects.create(
        product=ordered_slip.product,
        txn_type=InventoryTransaction.TYPE_IN,
        quantity=received_delta,
        reference_type='ordered_slip',
        reference_id=ordered_slip.id,
        note=f'OrderedSlip #{ordered_slip.id} receipt ({received_delta} units) from {ordered_slip.company_name} (Delivered to: {loc_display})',
        date=timezone.now().date(),
    )


@api_view(['GET', 'POST'])
@restrict_accountant_modifications
def ordered_slip_list(request):
    if request.method == 'GET':
        ordered_slips = OrderedSlip.objects.select_related('product').all()
        serializer = OrderedSlipSerializer(ordered_slips, many=True)
        return Response(serializer.data)

    serializer = OrderedSlipSerializer(data=request.data)
    if serializer.is_valid():
        ordered_slip = serializer.save()
        log_action(request, 'CREATE', f"Purchase order slip #{ordered_slip.id} created for product '{ordered_slip.product.name}' (Qty: {ordered_slip.quantity_ordered}).", module='Purchases')
        return Response(OrderedSlipSerializer(ordered_slip).data, status=status.HTTP_201_CREATED)
    return Response(_serialize_validation_errors(serializer.errors), status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@restrict_accountant_modifications
def ordered_slip_detail(request, pk):
    ordered_slip = get_object_or_404(OrderedSlip.objects.select_related('product'), pk=pk)

    if request.method == 'GET':
        serializer = OrderedSlipSerializer(ordered_slip)
        return Response(serializer.data)

    if request.method == 'PATCH':
        serializer = OrderedSlipSerializer(ordered_slip, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_action(request, 'UPDATE', f"Purchase order slip #{ordered_slip.id} updated.", module='Purchases')
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    log_action(request, 'DELETE', f"Purchase order slip #{ordered_slip.id} for product '{ordered_slip.product.name}' deleted.", module='Purchases')
    ordered_slip.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@restrict_accountant_modifications
def ordered_slip_send_email(request, pk):
    return Response(
        {'detail': 'Email sending is temporarily disabled for ordered slips.'},
        status=status.HTTP_410_GONE,
    )


@api_view(['POST'])
@restrict_accountant_modifications
def ordered_slip_mark_partial(request, pk):
    ordered_slip = get_object_or_404(OrderedSlip.objects.select_related('product'), pk=pk)
    received_quantity = request.data.get('quantity_received', request.data.get('received_quantity', None))

    if received_quantity is None:
        return Response({'quantity_received': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)

    received_quantity = int(received_quantity)
    if received_quantity < 0 or received_quantity > ordered_slip.quantity_ordered:
        return Response({'quantity_received': 'Received quantity must be between 0 and the ordered quantity.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        _apply_receipt_to_inventory(ordered_slip, received_quantity)
        ordered_slip.quantity_received = received_quantity
        ordered_slip.status = OrderedSlip.STATUS_PARTIAL if received_quantity < ordered_slip.quantity_ordered else OrderedSlip.STATUS_COMPLETED
        if ordered_slip.status == OrderedSlip.STATUS_COMPLETED:
            ordered_slip.received_at = timezone.now()
            # Create completed Purchase record
            loc_display = 'Direct to Shop' if ordered_slip.delivery_location == 'SHOP' else 'Warehouse'
            Purchase.objects.create(
                product=ordered_slip.product,
                company_name=ordered_slip.company_name,
                quantity_purchased=ordered_slip.quantity_ordered,
                unit_cost=ordered_slip.unit_cost,
                total_cost=ordered_slip.total_cost,
                purchase_date=timezone.now().date(),
                payment_status='PAID',
                notes=f"Generated from Completed OrderedSlip #{ordered_slip.id} (Delivered to: {loc_display})"
            )
        ordered_slip.save(update_fields=['quantity_received', 'status', 'received_at', 'updated_at'])

    log_action(request, 'UPDATE', f"Order slip #{ordered_slip.id}: marked partial receipt — {received_quantity}/{ordered_slip.quantity_ordered} units received.", module='Purchases')
    return Response(OrderedSlipSerializer(ordered_slip).data)


@api_view(['POST'])
@restrict_accountant_modifications
def ordered_slip_mark_complete(request, pk):
    ordered_slip = get_object_or_404(OrderedSlip.objects.select_related('product'), pk=pk)

    with transaction.atomic():
        _apply_receipt_to_inventory(ordered_slip, ordered_slip.quantity_ordered)
        ordered_slip.quantity_received = ordered_slip.quantity_ordered
        ordered_slip.status = OrderedSlip.STATUS_COMPLETED
        ordered_slip.received_at = timezone.now()
        ordered_slip.save(update_fields=['quantity_received', 'status', 'received_at', 'updated_at'])
        
        # Create completed Purchase record
        loc_display = 'Direct to Shop' if ordered_slip.delivery_location == 'SHOP' else 'Warehouse'
        Purchase.objects.create(
            product=ordered_slip.product,
            company_name=ordered_slip.company_name,
            quantity_purchased=ordered_slip.quantity_ordered,
            unit_cost=ordered_slip.unit_cost,
            total_cost=ordered_slip.total_cost,
            purchase_date=timezone.now().date(),
            payment_status='PAID',
            notes=f"Generated from Completed OrderedSlip #{ordered_slip.id} (Delivered to: {loc_display})"
        )

    log_action(request, 'UPDATE', f"Order slip #{ordered_slip.id}: marked fully complete — all {ordered_slip.quantity_ordered} units received.", module='Purchases')
    return Response(OrderedSlipSerializer(ordered_slip).data)


@api_view(['GET', 'POST'])
@restrict_accountant_modifications
def purchase_list(request):
    if request.method == 'GET':
        purchases = Purchase.objects.all()
        serializer = PurchaseSerializer(purchases, many=True)
        return Response(serializer.data)

    serializer = PurchaseSerializer(data=request.data)
    if serializer.is_valid():
        purchase = serializer.save()
        log_action(request, 'CREATE', f"Purchase record #{purchase.id} created.", module='Purchases')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@restrict_accountant_modifications
def purchase_detail(request, pk):
    purchase = get_object_or_404(Purchase, pk=pk)

    if request.method == 'GET':
        serializer = PurchaseSerializer(purchase)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = PurchaseSerializer(purchase, data=request.data)
        if serializer.is_valid():
            serializer.save()
            log_action(request, 'UPDATE', f"Purchase record #{purchase.id} updated.", module='Purchases')
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    log_action(request, 'DELETE', f"Purchase record #{purchase.id} deleted.", module='Purchases')
    purchase.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
