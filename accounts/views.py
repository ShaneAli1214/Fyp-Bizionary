"""
Screen 4: Accounts & Finance - API Views
REST API endpoints for the accounts dashboard
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator
from datetime import date
from functools import wraps

from .models import Revenue, Expense, Invoice, SalaryPayment, UtilityBill, RecurringCost
from .serializers import (
    RevenueSerializer, ExpenseSerializer, InvoiceSerializer,
    SalaryPaymentSerializer, UtilityBillSerializer, RecurringCostSerializer
)
from .services import AccountsService
from user_management.views import log_action


def check_accounts_permission(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        from user_management.views import get_request_user
        user = get_request_user(request)
        if not user:
            return Response({
                'success': False,
                'error': 'Authentication credentials were not provided.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        role_name = user.role.name if user.role else ''
        if role_name == 'Inventory Manager':
            return Response({
                'success': False,
                'error': 'Permission Denied. Inventory Managers do not have access to Accounts.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if role_name == 'Sales Manager':
            resolver_match = getattr(request, 'resolver_match', None)
            url_name = resolver_match.url_name if resolver_match else ''
            if request.method == 'GET' and url_name in ['invoice-list-create', 'recent-invoices', 'invoice-detail']:
                pass
            else:
                return Response({
                    'success': False,
                    'error': 'Permission Denied. Sales Managers do not have access to general Accounts.'
                }, status=status.HTTP_403_FORBIDDEN)
            
        request.user = user
        return view_func(request, *args, **kwargs)
    return wrapper


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
@check_accounts_permission
def accounts_kpi_view(request):
    """
    GET /api/accounts/kpis/?date_range=last_30_days&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    Returns key performance indicators with prior-period growth rates.
    """
    try:
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        kpis = AccountsService.kpi_summary(date_range, start_date, end_date)
        
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
@check_accounts_permission
def income_expense_trend_view(request):
    """
    GET /api/accounts/trend/?period=daily|weekly|monthly&date_range=last_30_days&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    Returns income vs expenses grouped by the requested period.
    """
    try:
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        period = request.GET.get('period', 'monthly')
        trend_data = AccountsService.income_vs_expense_trend(date_range, start_date, end_date, period)
        
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
@check_accounts_permission
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
@check_accounts_permission
def expense_categories_view(request):
    """
    GET /api/accounts/expense-categories/?date_range=last_30_days&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    Returns breakdown of expenses by category with percentages
    """
    try:
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        categories = AccountsService.expense_categories_breakdown(date_range, start_date, end_date)
        
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
@check_accounts_permission
def revenue_list_create(request):
    """
    GET /api/accounts/revenues/?date_range=last_30_days&page=1
    POST /api/accounts/revenues/
    """
    if request.method == 'GET':
        queryset = Revenue.objects.all().order_by('-date', '-created_at')
        
        # Filter by date range
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        start, end = AccountsService.get_date_filter(date_range, start_date, end_date)
        if start and end:
            queryset = queryset.filter(date__range=(start, end))
                
        serializer = RevenueSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = RevenueSerializer(data=request.data)
        if serializer.is_valid():
            revenue = serializer.save()
            AccountsService.post_revenue_ledger(revenue)
            log_action(request, 'CREATE', f"Revenue record '{revenue.description}' (PKR {revenue.amount}) created.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@check_accounts_permission
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
            log_action(request, 'UPDATE', f"Revenue record '{revenue.description}' (PKR {revenue.amount}) updated.", module='Accounts')
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
        log_action(request, 'DELETE', f"Revenue record '{revenue.description}' (PKR {revenue.amount}) deleted.", module='Accounts')
        revenue.delete()
        return Response({
            'success': True,
            'message': 'Revenue deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@check_accounts_permission
def expense_list_create(request):
    """
    GET /api/accounts/expenses/?date_range=last_30_days&page=1
    POST /api/accounts/expenses/
    """
    if request.method == 'GET':
        queryset = Expense.objects.all().order_by('-date', '-created_at')
        
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        start, end = AccountsService.get_date_filter(date_range, start_date, end_date)
        if start and end:
            queryset = queryset.filter(date__range=(start, end))
                
        serializer = ExpenseSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            expense = serializer.save()
            AccountsService.post_expense_ledger(expense)
            log_action(request, 'CREATE', f"Expense '{expense.description}' (PKR {expense.amount}) created.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@check_accounts_permission
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
            log_action(request, 'UPDATE', f"Expense '{expense.description}' (PKR {expense.amount}) updated.", module='Accounts')
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
        log_action(request, 'DELETE', f"Expense '{expense.description}' (PKR {expense.amount}) deleted.", module='Accounts')
        expense.delete()
        return Response({
            'success': True,
            'message': 'Expense deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@check_accounts_permission
def invoice_list_create(request):
    """
    GET /api/accounts/invoices/?date_range=last_30_days&page=1
    POST /api/accounts/invoices/
    """
    if request.method == 'GET':
        queryset = Invoice.objects.all().order_by('-created_at')
        
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        start, end = AccountsService.get_date_filter(date_range, start_date, end_date)
        if start and end:
            queryset = queryset.filter(date__range=(start, end))
                
        serializer = InvoiceSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = InvoiceSerializer(data=request.data)
        if serializer.is_valid():
            invoice = serializer.save()
            AccountsService.post_invoice_ledger(invoice)
            log_action(request, 'CREATE', f"Invoice #{invoice.invoice_number} for '{invoice.customer_name}' (PKR {invoice.total_amount}) created.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@check_accounts_permission
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
            log_action(request, 'UPDATE', f"Invoice #{invoice.invoice_number} for '{invoice.customer_name}' updated.", module='Accounts')
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
        log_action(request, 'DELETE', f"Invoice #{invoice.invoice_number} for '{invoice.customer_name}' deleted.", module='Accounts')
        invoice.delete()
        return Response({
            'success': True,
            'message': 'Invoice deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ==================== VOID ACTIONS ====================

@api_view(['POST'])
@check_accounts_permission
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

    AccountsService.post_revenue_ledger(revenue)
    log_action(request, 'UPDATE', f"Revenue record '{revenue.description}' voided. Reason: {reason}", module='Accounts')

    return Response({
        'success': True,
        'message': 'Revenue record voided successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@check_accounts_permission
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

    AccountsService.post_expense_ledger(expense)
    log_action(request, 'UPDATE', f"Expense '{expense.description}' voided. Reason: {reason}", module='Accounts')

    return Response({
        'success': True,
        'message': 'Expense record voided successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@check_accounts_permission
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

    AccountsService.post_invoice_ledger(invoice)
    log_action(request, 'UPDATE', f"Invoice #{invoice.invoice_number} voided. Reason: {reason}", module='Accounts')

    return Response({
        'success': True,
        'message': 'Invoice voided successfully'
    }, status=status.HTTP_200_OK)


# ==================== REPORT ENDPOINTS ====================

@api_view(['GET'])
@check_accounts_permission
def chart_of_accounts_tree_view(request):
    """
    GET /api/accounts/chart-tree/
    Returns collapsible tree structure of accounts with live balances
    """
    try:
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        parsed_start, parsed_end = AccountsService.get_date_filter(date_range, start_date, end_date)
        tree = AccountsService.get_chart_of_accounts_tree(parsed_start, parsed_end)
        return Response({
            'success': True,
            'data': tree
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@check_accounts_permission
def profit_loss_report_view(request):
    """
    GET /api/accounts/reports/profit-loss/
    Returns Profit & Loss statement for the chosen date range
    """
    try:
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        parsed_start, parsed_end = AccountsService.get_date_filter(date_range, start_date, end_date)
        report = AccountsService.get_profit_loss(parsed_start, parsed_end)
        return Response({
            'success': True,
            'data': report
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@check_accounts_permission
def balance_sheet_report_view(request):
    """
    GET /api/accounts/reports/balance-sheet/
    Returns Balance Sheet as of the end of the chosen date range
    """
    try:
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        parsed_start, parsed_end = AccountsService.get_date_filter(date_range, start_date, end_date)
        from datetime import date
        as_of_date = parsed_end or date.today()
        report = AccountsService.get_balance_sheet(as_of_date)
        return Response({
            'success': True,
            'data': report
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== EXPENSE BUDGET ENDPOINTS ====================

@api_view(['GET', 'POST'])
def expense_budget_list(request):
    """
    GET  /api/accounts/budgets/         — list all budgets with actual spend
    POST /api/accounts/budgets/         — create a new budget target

    Query params (GET): year, month, quarter, category, period_type
    """
    from .models import ExpenseBudget

    if request.method == 'GET':
        qs = ExpenseBudget.objects.all()

        # Optional filters
        year = request.GET.get('year')
        month = request.GET.get('month')
        quarter = request.GET.get('quarter')
        category = request.GET.get('category')
        period_type = request.GET.get('period_type')

        if year:
            qs = qs.filter(year=year)
        if month:
            qs = qs.filter(month=month)
        if quarter:
            qs = qs.filter(quarter=quarter)
        if category:
            qs = qs.filter(category=category)
        if period_type:
            qs = qs.filter(period_type=period_type)

        results = []
        for budget in qs:
            actual = float(budget.get_actual_spend())
            budgeted = float(budget.budgeted_amount)
            variance = budgeted - actual
            utilization = round(actual / budgeted * 100, 1) if budgeted > 0 else 0.0
            results.append({
                'id': budget.id,
                'category': budget.category,
                'period_type': budget.period_type,
                'year': budget.year,
                'month': budget.month,
                'quarter': budget.quarter,
                'budgeted_amount': budgeted,
                'actual_spend': actual,
                'variance': round(variance, 2),
                'utilization_pct': utilization,
                'status': 'OVER' if variance < 0 else ('OK' if utilization < 90 else 'WARNING'),
                'department': budget.department,
                'notes': budget.notes,
            })

        return Response({'success': True, 'data': results, 'count': len(results)})

    # POST — create budget
    try:
        data = request.data
        budget = ExpenseBudget.objects.create(
            category=data['category'],
            period_type=data.get('period_type', 'MONTHLY'),
            year=data['year'],
            month=data.get('month'),
            quarter=data.get('quarter'),
            budgeted_amount=data['budgeted_amount'],
            department=data.get('department'),
            notes=data.get('notes', ''),
        )
        return Response({
            'success': True,
            'id': budget.id,
            'message': f'Budget created: {budget}',
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def expense_budget_detail(request, pk):
    """
    GET    /api/accounts/budgets/<id>/  — retrieve budget with actuals
    PUT    /api/accounts/budgets/<id>/  — update budget amount
    DELETE /api/accounts/budgets/<id>/  — delete budget
    """
    from .models import ExpenseBudget
    budget = get_object_or_404(ExpenseBudget, pk=pk)

    if request.method == 'DELETE':
        budget.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if request.method == 'PUT':
        try:
            budget.budgeted_amount = request.data.get('budgeted_amount', budget.budgeted_amount)
            budget.notes = request.data.get('notes', budget.notes)
            budget.save()
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    actual = float(budget.get_actual_spend())
    budgeted = float(budget.budgeted_amount)
    variance = budgeted - actual
    return Response({
        'success': True,
        'data': {
            'id': budget.id,
            'category': budget.category,
            'period_type': budget.period_type,
            'year': budget.year,
            'month': budget.month,
            'quarter': budget.quarter,
            'budgeted_amount': budgeted,
            'actual_spend': actual,
            'variance': round(variance, 2),
            'utilization_pct': round(actual / budgeted * 100, 1) if budgeted > 0 else 0.0,
            'status': 'OVER' if variance < 0 else ('OK' if actual / budgeted < 0.9 else 'WARNING') if budgeted > 0 else 'OK',
        }
    })


# ==================== INVOICE PAYMENT ENDPOINTS ====================

@api_view(['GET', 'POST'])
def invoice_payment_list(request, invoice_pk):
    """
    GET  /api/accounts/invoices/<id>/payments/  — list all payments for invoice
    POST /api/accounts/invoices/<id>/payments/  — record a new payment
    """
    from .models import InvoicePayment
    invoice = get_object_or_404(Invoice, pk=invoice_pk)

    if request.method == 'GET':
        payments = InvoicePayment.objects.filter(invoice=invoice)
        total_paid = sum(float(p.amount_paid) for p in payments)
        return Response({
            'success': True,
            'invoice_number': invoice.invoice_number,
            'invoice_amount': float(invoice.amount),
            'total_paid': total_paid,
            'balance_due': float(invoice.balance_due),
            'status': invoice.status,
            'payments': [
                {
                    'id': p.id,
                    'amount_paid': float(p.amount_paid),
                    'payment_date': str(p.payment_date),
                    'payment_method': p.payment_method,
                    'reference': p.reference,
                    'notes': p.notes,
                }
                for p in payments
            ]
        })

    # POST — record a payment
    try:
        from decimal import Decimal
        amount = Decimal(str(request.data['amount_paid']))
        if amount <= 0:
            raise ValueError("Payment amount must be positive")
        if amount > invoice.balance_due:
            raise ValueError(f"Payment Rs.{amount} exceeds balance due Rs.{invoice.balance_due}")

        payment = InvoicePayment.objects.create(
            invoice=invoice,
            amount_paid=amount,
            payment_date=request.data.get('payment_date', date.today()),
            payment_method=request.data.get('payment_method', 'CASH'),
            reference=request.data.get('reference', ''),
            notes=request.data.get('notes', ''),
        )
        # Refresh invoice from DB (save() in InvoicePayment updates it)
        invoice.refresh_from_db()
        return Response({
            'success': True,
            'payment_id': payment.id,
            'invoice_status': invoice.status,
            'balance_due': float(invoice.balance_due),
            'message': f'Payment of Rs.{amount} recorded successfully',
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ==================== SALARY PAYMENT ENDPOINTS ====================

@api_view(['GET', 'POST'])
@check_accounts_permission
def salary_payment_list_create(request):
    """
    GET /api/accounts/salaries/
    POST /api/accounts/salaries/
    """
    if request.method == 'GET':
        queryset = SalaryPayment.objects.all()
        
        # Filter by date range if provided
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        start, end = AccountsService.get_date_filter(date_range, start_date, end_date)
        if start and end:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(payment_date__range=(start, end)) |
                (Q(payment_date__isnull=True) & Q(pay_period_end__range=(start, end)))
            )
            
        serializer = SalaryPaymentSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    elif request.method == 'POST':
        serializer = SalaryPaymentSerializer(data=request.data)
        if serializer.is_valid():
            salary = serializer.save()
            log_action(request, 'CREATE', f"Salary payment record for employee ID {salary.employee_id} (PKR {salary.amount}) created.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@check_accounts_permission
def salary_payment_detail(request, pk):
    """
    GET /api/accounts/salaries/<id>/
    PUT /api/accounts/salaries/<id>/
    DELETE /api/accounts/salaries/<id>/
    """
    salary = get_object_or_404(SalaryPayment, pk=pk)
    
    if request.method == 'GET':
        serializer = SalaryPaymentSerializer(salary)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    elif request.method == 'PUT':
        serializer = SalaryPaymentSerializer(salary, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_action(request, 'UPDATE', f"Salary payment record for employee ID {salary.employee_id} (PKR {salary.amount}) updated.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        log_action(request, 'DELETE', f"Salary payment record for employee ID {salary.employee_id} (PKR {salary.amount}) deleted.", module='Accounts')
        salary.delete()
        return Response({
            'success': True,
            'message': 'Salary payment deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ==================== UTILITY BILL ENDPOINTS ====================

@api_view(['GET', 'POST'])
@check_accounts_permission
def utility_bill_list_create(request):
    """
    GET /api/accounts/utilities/
    POST /api/accounts/utilities/
    """
    if request.method == 'GET':
        queryset = UtilityBill.objects.all()
        
        # Filter by date range if provided
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        start, end = AccountsService.get_date_filter(date_range, start_date, end_date)
        if start and end:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(payment_date__range=(start, end)) |
                (Q(payment_date__isnull=True) & Q(due_date__range=(start, end)))
            )
            
        serializer = UtilityBillSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    elif request.method == 'POST':
        serializer = UtilityBillSerializer(data=request.data)
        if serializer.is_valid():
            bill = serializer.save()
            log_action(request, 'CREATE', f"Utility bill record of type {bill.utility_type} (PKR {bill.amount}) created.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@check_accounts_permission
def utility_bill_detail(request, pk):
    """
    GET /api/accounts/utilities/<id>/
    PUT /api/accounts/utilities/<id>/
    DELETE /api/accounts/utilities/<id>/
    """
    bill = get_object_or_404(UtilityBill, pk=pk)
    
    if request.method == 'GET':
        serializer = UtilityBillSerializer(bill)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    elif request.method == 'PUT':
        serializer = UtilityBillSerializer(bill, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_action(request, 'UPDATE', f"Utility bill record of type {bill.utility_type} (PKR {bill.amount}) updated.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        log_action(request, 'DELETE', f"Utility bill record of type {bill.utility_type} (PKR {bill.amount}) deleted.", module='Accounts')
        bill.delete()
        return Response({
            'success': True,
            'message': 'Utility bill deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ==================== RECURRING COST ENDPOINTS ====================

@api_view(['GET', 'POST'])
@check_accounts_permission
def recurring_cost_list_create(request):
    """
    GET /api/accounts/recurring-costs/
    POST /api/accounts/recurring-costs/
    """
    if request.method == 'GET':
        queryset = RecurringCost.objects.all()
        
        # Filter by date range if provided
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        start, end = AccountsService.get_date_filter(date_range, start_date, end_date)
        if start and end:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(payment_date__range=(start, end)) |
                (Q(payment_date__isnull=True) & Q(due_date__range=(start, end)))
            )
            
        serializer = RecurringCostSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    elif request.method == 'POST':
        serializer = RecurringCostSerializer(data=request.data)
        if serializer.is_valid():
            cost = serializer.save()
            log_action(request, 'CREATE', f"Recurring cost record '{cost.name}' (PKR {cost.amount}) created.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@check_accounts_permission
def recurring_cost_detail(request, pk):
    """
    GET /api/accounts/recurring-costs/<id>/
    PUT /api/accounts/recurring-costs/<id>/
    DELETE /api/accounts/recurring-costs/<id>/
    """
    cost = get_object_or_404(RecurringCost, pk=pk)
    
    if request.method == 'GET':
        serializer = RecurringCostSerializer(cost)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    elif request.method == 'PUT':
        serializer = RecurringCostSerializer(cost, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_action(request, 'UPDATE', f"Recurring cost record '{cost.name}' (PKR {cost.amount}) updated.", module='Accounts')
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        log_action(request, 'DELETE', f"Recurring cost record '{cost.name}' (PKR {cost.amount}) deleted.", module='Accounts')
        cost.delete()
        return Response({
            'success': True,
            'message': 'Recurring cost deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)
