"""
Screen 4: Accounts & Finance - Service Layer
Business logic for financial calculations and analytics
"""

from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from decimal import Decimal
from .models import Revenue, Expense, Invoice
from sales.models import Sale
from purchases.models import Purchase


class AccountsService:
    """
    Service class containing all business logic for accounts and finance
    """

    @staticmethod
    def total_revenue():
        """
        Calculate total revenue from operational sales data
        Returns: Decimal
        """
        result = Sale.objects.aggregate(total=Sum('total_price'))
        return result['total'] or Decimal('0.00')

    @staticmethod
    def total_expense():
        """
        Calculate total expenses from operational purchases data
        Returns: Decimal
        """
        result = Purchase.objects.aggregate(total=Sum('total_cost'))
        return result['total'] or Decimal('0.00')

    @staticmethod
    def net_profit():
        """
        Calculate net profit (Revenue - Expense)
        Returns: Decimal
        """
        revenue = AccountsService.total_revenue()
        expense = AccountsService.total_expense()
        return revenue - expense

    @staticmethod
    def cash_flow():
        """
        Calculate cash flow (for now, same as net profit)
        Can be extended later with additional logic
        Returns: Decimal
        """
        return AccountsService.net_profit()

    @staticmethod
    def income_vs_expense_trend():
        """
        Get monthly trend of income vs expenses
        Returns: List of dicts with month, income, and expense
        """
        # Group revenues by month
        revenue_by_month = Revenue.objects.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            income=Sum('amount')
        ).order_by('month')

        # Group expenses by month
        expense_by_month = Expense.objects.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            expense=Sum('amount')
        ).order_by('month')

        # Combine the data
        # Create a dictionary for quick lookup
        expense_dict = {item['month']: item['expense'] for item in expense_by_month}
        revenue_dict = {item['month']: item['income'] for item in revenue_by_month}

        # Get all unique months
        all_months = set(list(expense_dict.keys()) + list(revenue_dict.keys()))

        # Build combined trend data
        trend_data = []
        for month in sorted(all_months):
            trend_data.append({
                'month': month.strftime('%Y-%m') if month else None,
                'income': float(revenue_dict.get(month, Decimal('0.00'))),
                'expense': float(expense_dict.get(month, Decimal('0.00'))),
            })

        return trend_data

    @staticmethod
    def recent_invoices(limit=5):
        """
        Get most recent invoices
        Args:
            limit: Number of invoices to return (default: 5)
        Returns: QuerySet of Invoice objects
        """
        return Invoice.objects.all()[:limit]

    @staticmethod
    def expense_categories_breakdown():
        """
        Get breakdown of expenses by category
        Returns: List of dicts with category and total amount
        """
        breakdown = Expense.objects.values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        # Calculate total for percentage
        total_expense = AccountsService.total_expense()

        result = []
        for item in breakdown:
            percentage = 0
            if total_expense > 0:
                percentage = (item['total'] / total_expense) * 100

            result.append({
                'category': item['category'],
                'total': float(item['total']),
                'count': item['count'],
                'percentage': round(percentage, 2)
            })

        return result

    @staticmethod
    def kpi_summary():
        """
        Get all KPIs in one call
        Returns: Dict with all KPI values
        """
        return {
            'total_revenue': float(AccountsService.total_revenue()),
            'total_expense': float(AccountsService.total_expense()),
            'net_profit': float(AccountsService.net_profit()),
            'cash_flow': float(AccountsService.cash_flow()),
        }

    @staticmethod
    def revenue_growth_percentage():
        """
        Calculate revenue growth percentage (can be enhanced with date range)
        Returns: Float
        """
        # This can be extended with time-based comparison
        # For now, returns 0 as placeholder
        return 0.0

    @staticmethod
    def expense_growth_percentage():
        """
        Calculate expense growth percentage (can be enhanced with date range)
        Returns: Float
        """
        # This can be extended with time-based comparison
        # For now, returns 0 as placeholder
        return 0.0
