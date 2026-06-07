"""
Screen 4: Accounts & Finance - API Views
REST API endpoints for the accounts dashboard
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator

from .models import Revenue, Expense, Invoice
from .serializers import RevenueSerializer, ExpenseSerializer, InvoiceSerializer
from .services import AccountsService


def paginate_queryset(request, queryset, serializer_class):
    """
    Helper to paginated querysets programmatically.
    Returns standard paginated Response object.
    """
    page_number = request.GET.get('page', 1)
    page_size = request.GET.get('page_size', 10)
    
    paginator = Paginator(queryset, page_size)
    try:
        page_obj = paginator.page(page_number)
    except Exception:
        page_obj = paginator.page(1)
        
    serializer = serializer_class(page_obj.object_list, many=True)
    return Response({
        'success': True,
        'data': serializer.data,
        'pagination': {
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'page_size': int(page_size)
        }
    }, status=status.HTTP_200_OK)


# ==================== KPI ENDPOINTS ====================

@api_view(['GET'])
def accounts_kpi_view(request):
    """
    GET /api/accounts/kpis/?date_range=last_30_days
    Returns key performance indicators with prior-period growth rates.
    """
    try:
        date_range = request.GET.get('date_range')
        kpis = AccountsService.kpi_summary(date_range)
        
        return Response({
            'success': True,
            'data': kpis
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== ANALYTICS ENDPOINTS ====================

@api_view(['GET'])
def income_expense_trend_view(request):
    """
    GET /api/accounts/trend/?date_range=last_30_days
    Returns monthly trend of income vs expenses
    """
    try:
        date_range = request.GET.get('date_range')
        trend_data = AccountsService.income_vs_expense_trend(date_range)
        
        return Response({
            'success': True,
            'data': trend_data
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def recent_invoices_view(request):
    """
    GET /api/accounts/recent-invoices/
    Returns the 5 most recent invoices
    """
    try:
        limit = int(request.GET.get('limit', 5))
        invoices = AccountsService.recent_invoices(limit=limit)
        serializer = InvoiceSerializer(invoices, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def expense_categories_view(request):
    """
    GET /api/accounts/expense-categories/?date_range=last_30_days
    Returns breakdown of expenses by category with percentages
    """
    try:
        date_range = request.GET.get('date_range')
        categories = AccountsService.expense_categories_breakdown(date_range)
        
        return Response({
            'success': True,
            'data': categories
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== CRUD ENDPOINTS ====================

@api_view(['GET', 'POST'])
def revenue_list_create(request):
    """
    GET /api/accounts/revenues/?date_range=last_30_days&page=1
    POST /api/accounts/revenues/
    """
    if request.method == 'GET':
        queryset = Revenue.objects.all().order_by('-date', '-created_at')
        
        # Filter by date range
        date_range = request.GET.get('date_range')
        if date_range:
            start, end = AccountsService.get_date_filter(date_range)
            if start and end:
                queryset = queryset.filter(date__range=(start, end))
                
        return paginate_queryset(request, queryset, RevenueSerializer)
    
    elif request.method == 'POST':
        serializer = RevenueSerializer(data=request.data)
        if serializer.is_valid():
            revenue = serializer.save()
            AccountsService.post_revenue_ledger(revenue)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def revenue_detail(request, pk):
    """
    GET /api/accounts/revenues/<id>/
    PUT /api/accounts/revenues/<id>/
    DELETE /api/accounts/revenues/<id>/
    """
    revenue = get_object_or_404(Revenue, pk=pk)
    
    if request.method == 'GET':
        serializer = RevenueSerializer(revenue)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        serializer = RevenueSerializer(revenue, data=request.data)
        if serializer.is_valid():
            revenue = serializer.save()
            AccountsService.post_revenue_ledger(revenue)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Hard delete also cleans up associated journal entry
        if revenue.journal_entry:
            revenue.journal_entry.delete()
        revenue.delete()
        return Response({
            'success': True,
            'message': 'Revenue deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def expense_list_create(request):
    """
    GET /api/accounts/expenses/?date_range=last_30_days&page=1
    POST /api/accounts/expenses/
    """
    if request.method == 'GET':
        queryset = Expense.objects.all().order_by('-date', '-created_at')
        
        date_range = request.GET.get('date_range')
        if date_range:
            start, end = AccountsService.get_date_filter(date_range)
            if start and end:
                queryset = queryset.filter(date__range=(start, end))
                
        return paginate_queryset(request, queryset, ExpenseSerializer)
    
    elif request.method == 'POST':
        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            expense = serializer.save()
            AccountsService.post_expense_ledger(expense)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def expense_detail(request, pk):
    """
    GET /api/accounts/expenses/<id>/
    PUT /api/accounts/expenses/<id>/
    DELETE /api/accounts/expenses/<id>/
    """
    expense = get_object_or_404(Expense, pk=pk)
    
    if request.method == 'GET':
        serializer = ExpenseSerializer(expense)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        serializer = ExpenseSerializer(expense, data=request.data)
        if serializer.is_valid():
            expense = serializer.save()
            AccountsService.post_expense_ledger(expense)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if expense.journal_entry:
            expense.journal_entry.delete()
        expense.delete()
        return Response({
            'success': True,
            'message': 'Expense deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def invoice_list_create(request):
    """
    GET /api/accounts/invoices/?date_range=last_30_days&page=1
    POST /api/accounts/invoices/
    """
    if request.method == 'GET':
        queryset = Invoice.objects.all().order_by('-created_at')
        
        date_range = request.GET.get('date_range')
        if date_range:
            start, end = AccountsService.get_date_filter(date_range)
            if start and end:
                queryset = queryset.filter(created_at__date__range=(start, end))
                
        return paginate_queryset(request, queryset, InvoiceSerializer)
    
    elif request.method == 'POST':
        serializer = InvoiceSerializer(data=request.data)
        if serializer.is_valid():
            invoice = serializer.save()
            AccountsService.post_invoice_ledger(invoice)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def invoice_detail(request, pk):
    """
    GET /api/accounts/invoices/<id>/
    PUT /api/accounts/invoices/<id>/
    DELETE /api/accounts/invoices/<id>/
    """
    invoice = get_object_or_404(Invoice, pk=pk)
    
    if request.method == 'GET':
        serializer = InvoiceSerializer(invoice)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        serializer = InvoiceSerializer(invoice, data=request.data)
        if serializer.is_valid():
            invoice = serializer.save()
            AccountsService.post_invoice_ledger(invoice)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if invoice.journal_entry:
            invoice.journal_entry.delete()
        invoice.delete()
        return Response({
            'success': True,
            'message': 'Invoice deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ==================== VOID ACTIONS ====================

@api_view(['POST'])
def revenue_void(request, pk):
    """
    POST /api/accounts/revenues/<id>/void/
    """
    revenue = get_object_or_404(Revenue, pk=pk)
    reason = request.data.get('reason', '')
    if not reason:
        return Response({'success': False, 'error': 'Void reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    revenue.voided = True
    revenue.void_reason = reason
    revenue.payment_status = 'PENDING'
    revenue.save()
    
    # Update double entry impact
    AccountsService.post_revenue_ledger(revenue)
    
    return Response({
        'success': True,
        'message': 'Revenue record voided successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def expense_void(request, pk):
    """
    POST /api/accounts/expenses/<id>/void/
    """
    expense = get_object_or_404(Expense, pk=pk)
    reason = request.data.get('reason', '')
    if not reason:
        return Response({'success': False, 'error': 'Void reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    expense.voided = True
    expense.void_reason = reason
    expense.save()
    
    # Update double entry impact
    AccountsService.post_expense_ledger(expense)
    
    return Response({
        'success': True,
        'message': 'Expense record voided successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def invoice_void(request, pk):
    """
    POST /api/accounts/invoices/<id>/void/
    """
    invoice = get_object_or_404(Invoice, pk=pk)
    reason = request.data.get('reason', '')
    if not reason:
        return Response({'success': False, 'error': 'Void reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    invoice.voided = True
    invoice.void_reason = reason
    invoice.status = 'CANCELLED'
    invoice.balance_due = 0
    invoice.save()
    
    # Update double entry impact
    AccountsService.post_invoice_ledger(invoice)
    
    return Response({
        'success': True,
        'message': 'Invoice voided successfully'
    }, status=status.HTTP_200_OK)

