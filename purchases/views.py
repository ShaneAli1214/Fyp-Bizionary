from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from .models import Purchase, OrderedSlip
from .serializers import PurchaseSerializer, OrderedSlipSerializer


def _serialize_validation_errors(errors):
    return errors


def _apply_receipt_to_inventory(ordered_slip, new_received_quantity):
    received_delta = max(int(new_received_quantity) - int(ordered_slip.quantity_received), 0)
    if received_delta <= 0:
        return

    product = ordered_slip.product
    product.stock_quantity += received_delta
    product.save(update_fields=['stock_quantity', 'updated_at'])


@api_view(['GET', 'POST'])
def ordered_slip_list(request):
    if request.method == 'GET':
        ordered_slips = OrderedSlip.objects.select_related('product').all()
        serializer = OrderedSlipSerializer(ordered_slips, many=True)
        return Response(serializer.data)

    serializer = OrderedSlipSerializer(data=request.data)
    if serializer.is_valid():
        with transaction.atomic():
            ordered_slip = serializer.save()
        return Response(OrderedSlipSerializer(ordered_slip).data, status=status.HTTP_201_CREATED)
    return Response(_serialize_validation_errors(serializer.errors), status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def ordered_slip_detail(request, pk):
    ordered_slip = get_object_or_404(OrderedSlip.objects.select_related('product'), pk=pk)

    if request.method == 'GET':
        serializer = OrderedSlipSerializer(ordered_slip)
        return Response(serializer.data)

    if request.method == 'PATCH':
        serializer = OrderedSlipSerializer(ordered_slip, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    ordered_slip.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def ordered_slip_send_email(request, pk):
    return Response(
        {'detail': 'Email sending is temporarily disabled for ordered slips.'},
        status=status.HTTP_410_GONE,
    )


@api_view(['POST'])
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
        ordered_slip.save(update_fields=['quantity_received', 'status', 'received_at', 'updated_at'])

    return Response(OrderedSlipSerializer(ordered_slip).data)


@api_view(['POST'])
def ordered_slip_mark_complete(request, pk):
    ordered_slip = get_object_or_404(OrderedSlip.objects.select_related('product'), pk=pk)

    with transaction.atomic():
        _apply_receipt_to_inventory(ordered_slip, ordered_slip.quantity_ordered)
        ordered_slip.quantity_received = ordered_slip.quantity_ordered
        ordered_slip.status = OrderedSlip.STATUS_COMPLETED
        ordered_slip.received_at = timezone.now()
        ordered_slip.save(update_fields=['quantity_received', 'status', 'received_at', 'updated_at'])

    return Response(OrderedSlipSerializer(ordered_slip).data)


@api_view(['GET', 'POST'])
def purchase_list(request):
    if request.method == 'GET':
        purchases = Purchase.objects.all()
        serializer = PurchaseSerializer(purchases, many=True)
        return Response(serializer.data)

    serializer = PurchaseSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def purchase_detail(request, pk):
    purchase = get_object_or_404(Purchase, pk=pk)

    if request.method == 'GET':
        serializer = PurchaseSerializer(purchase)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = PurchaseSerializer(purchase, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    purchase.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
