"""
Screen 4: Accounts & Finance - API Views
REST API endpoints for the accounts dashboard
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Revenue, Expense, Invoice
from .serializers import RevenueSerializer, ExpenseSerializer, InvoiceSerializer
from .services import AccountsService


# ==================== KPI ENDPOINTS ====================

@api_view(['GET'])
def accounts_kpi_view(request):
    """
    GET /api/accounts/kpis/
    Returns all key performance indicators for the accounts dashboard
    """
    try:
        kpis = AccountsService.kpi_summary()
        
        return Response({
            'success': True,
            'data': {
                'total_revenue': kpis['total_revenue'],
                'total_expense': kpis['total_expense'],
                'net_profit': kpis['net_profit'],
                'cash_flow': kpis['cash_flow'],
            }
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
    GET /api/accounts/trend/
    Returns monthly trend of income vs expenses
    """
    try:
        trend_data = AccountsService.income_vs_expense_trend()
        
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
    GET /api/accounts/expense-categories/
    Returns breakdown of expenses by category with percentages
    """
    try:
        categories = AccountsService.expense_categories_breakdown()
        
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
    GET /api/accounts/revenues/
    POST /api/accounts/revenues/
    """
    if request.method == 'GET':
        revenues = Revenue.objects.all()
        serializer = RevenueSerializer(revenues, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = RevenueSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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
            serializer.save()
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        revenue.delete()
        return Response({
            'success': True,
            'message': 'Revenue deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def expense_list_create(request):
    """
    GET /api/accounts/expenses/
    POST /api/accounts/expenses/
    """
    if request.method == 'GET':
        expenses = Expense.objects.all()
        serializer = ExpenseSerializer(expenses, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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
            serializer.save()
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        expense.delete()
        return Response({
            'success': True,
            'message': 'Expense deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def invoice_list_create(request):
    """
    GET /api/accounts/invoices/
    POST /api/accounts/invoices/
    """
    if request.method == 'GET':
        invoices = Invoice.objects.all()
        serializer = InvoiceSerializer(invoices, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = InvoiceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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
            serializer.save()
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        invoice.delete()
        return Response({
            'success': True,
            'message': 'Invoice deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)
