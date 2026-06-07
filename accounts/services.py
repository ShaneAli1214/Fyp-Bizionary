"""
Screen 4: Accounts & Finance - Service Layer
Business logic for financial calculations and analytics
"""

from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from decimal import Decimal
from datetime import date, timedelta
from .models import Revenue, Expense, Invoice, Account, JournalEntry, JournalItem
from sales.models import Sale
from purchases.models import Purchase


class AccountsService:
    """
    Service class containing all business logic for accounts and finance
    """

    @classmethod
    def ensure_coa(cls):
        """
        Create standard Chart of Accounts if they do not exist
        """
        # Asset Root
        asset_root, _ = Account.objects.get_or_create(code='1000', defaults={'name': 'Current Assets', 'account_type': 'ASSET'})
        Account.objects.get_or_create(code='1010', defaults={'name': 'Cash & Cash Equivalents', 'account_type': 'ASSET', 'parent': asset_root})
        Account.objects.get_or_create(code='1200', defaults={'name': 'Accounts Receivable', 'account_type': 'ASSET', 'parent': asset_root})
        Account.objects.get_or_create(code='1500', defaults={'name': 'Fixed Assets', 'account_type': 'ASSET'})
        
        # Liabilities
        Account.objects.get_or_create(code='2010', defaults={'name': 'Accounts Payable', 'account_type': 'LIABILITY'})
        Account.objects.get_or_create(code='2200', defaults={'name': 'Loans & Borrowings', 'account_type': 'LIABILITY'})
        
        # Equity
        Account.objects.get_or_create(code='3000', defaults={'name': 'Capital / Owner Equity', 'account_type': 'EQUITY'})
        Account.objects.get_or_create(code='3100', defaults={'name': 'Retained Earnings', 'account_type': 'EQUITY'})
        
        # Revenue
        Account.objects.get_or_create(code='4010', defaults={'name': 'Sales Revenue', 'account_type': 'REVENUE'})
        Account.objects.get_or_create(code='4020', defaults={'name': 'Service Income', 'account_type': 'REVENUE'})
        Account.objects.get_or_create(code='4030', defaults={'name': 'Other Income', 'account_type': 'REVENUE'})
        
        # Expense
        cogs, _ = Account.objects.get_or_create(code='5010', defaults={'name': 'Cost of Goods Sold (COGS)', 'account_type': 'EXPENSE'})
        opex, _ = Account.objects.get_or_create(code='5020', defaults={'name': 'Operating Expenses', 'account_type': 'EXPENSE'})
        
        Account.objects.get_or_create(code='5030', defaults={'name': 'Payroll Expense', 'account_type': 'EXPENSE', 'parent': opex})
        Account.objects.get_or_create(code='5040', defaults={'name': 'Marketing Expense', 'account_type': 'EXPENSE', 'parent': opex})
        Account.objects.get_or_create(code='5050', defaults={'name': 'Rent & Utilities Expense', 'account_type': 'EXPENSE', 'parent': opex})
        Account.objects.get_or_create(code='5060', defaults={'name': 'Supplies Expense', 'account_type': 'EXPENSE', 'parent': opex})
        Account.objects.get_or_create(code='5070', defaults={'name': 'Technology Expense', 'account_type': 'EXPENSE', 'parent': opex})
        Account.objects.get_or_create(code='5080', defaults={'name': 'Travel Expense', 'account_type': 'EXPENSE', 'parent': opex})
        Account.objects.get_or_create(code='5090', defaults={'name': 'Other Operating Expenses', 'account_type': 'EXPENSE', 'parent': opex})
        Account.objects.get_or_create(code='5100', defaults={'name': 'Tax Expense', 'account_type': 'EXPENSE'})

    @classmethod
    def post_revenue_ledger(cls, revenue):
        """
        Generate double-entry ledger items for a Revenue transaction
        """
        cls.ensure_coa()
        
        # If voided, void the journal entry
        if revenue.voided:
            if revenue.journal_entry:
                je = revenue.journal_entry
                je.voided = True
                je.void_reason = revenue.void_reason
                je.save()
                je.items.all().delete()
            return

        desc = f"Revenue: {revenue.customer}"
        if revenue.invoice_number:
            desc += f" (Inv #{revenue.invoice_number})"

        if revenue.journal_entry:
            je = revenue.journal_entry
            je.date = revenue.date
            je.description = desc
            je.reference = revenue.invoice_number or ""
            je.save()
            je.items.all().delete()
        else:
            je = JournalEntry.objects.create(
                date=revenue.date,
                description=desc,
                reference=revenue.invoice_number or ""
            )
            revenue.journal_entry = je
            revenue.save(update_fields=['journal_entry'])

        # Double Entry:
        # Debit Cash (1010) (if Paid) or Accounts Receivable (1200) (if Pending)
        # Credit Sales Revenue (4010) or Service Income (4020)
        cash_acct = Account.objects.get(code='1010')
        ar_acct = Account.objects.get(code='1200')
        
        debit_acct = cash_acct if revenue.payment_status == 'PAID' else ar_acct
        
        rev_code = '4010'
        if revenue.category == 'SERVICE_INCOME':
            rev_code = '4020'
        elif revenue.category == 'OTHER_INCOME':
            rev_code = '4030'
            
        credit_acct = Account.objects.get(code=rev_code)

        JournalItem.objects.create(journal_entry=je, account=debit_acct, debit=revenue.amount, credit=Decimal('0.00'))
        JournalItem.objects.create(journal_entry=je, account=credit_acct, debit=Decimal('0.00'), credit=revenue.amount)

    @classmethod
    def post_expense_ledger(cls, expense):
        """
        Generate double-entry ledger items for an Expense transaction
        """
        cls.ensure_coa()

        if expense.voided:
            if expense.journal_entry:
                je = expense.journal_entry
                je.voided = True
                je.void_reason = expense.void_reason
                je.save()
                je.items.all().delete()
            return

        desc = f"Expense: {expense.vendor or 'Generic Vendor'} ({expense.get_category_display()})"

        if expense.journal_entry:
            je = expense.journal_entry
            je.date = expense.date
            je.description = desc
            je.reference = expense.vendor or ""
            je.save()
            je.items.all().delete()
        else:
            je = JournalEntry.objects.create(
                date=expense.date,
                description=desc,
                reference=expense.vendor or ""
            )
            expense.journal_entry = je
            expense.save(update_fields=['journal_entry'])

        # Double Entry:
        # Debit expense account (amount - tax_amount)
        # Debit tax account (tax_amount)
        # Credit Cash (1010)
        cat_to_code = {
            'PAYROLL': '5030',
            'MARKETING': '5040',
            'RENT_UTILITIES': '5050',
            'SUPPLIES': '5060',
            'TECHNOLOGY': '5070',
            'TRAVEL': '5080',
            'OTHER': '5090',
        }
        exp_code = cat_to_code.get(expense.category, '5090')
        exp_acct = Account.objects.get(code=exp_code)
        tax_acct = Account.objects.get(code='5100')
        cash_acct = Account.objects.get(code='1010')

        base_amount = expense.amount - expense.tax_amount

        # Base expense item
        JournalItem.objects.create(journal_entry=je, account=exp_acct, debit=base_amount, credit=Decimal('0.00'))
        
        # Tax item if positive
        if expense.tax_amount > 0:
            JournalItem.objects.create(journal_entry=je, account=tax_acct, debit=expense.tax_amount, credit=Decimal('0.00'))

        # Cash credit item
        JournalItem.objects.create(journal_entry=je, account=cash_acct, debit=Decimal('0.00'), credit=expense.amount)

    @classmethod
    def post_invoice_ledger(cls, invoice):
        """
        Generate double-entry ledger items for an Invoice
        """
        cls.ensure_coa()

        if invoice.voided:
            if invoice.journal_entry:
                je = invoice.journal_entry
                je.voided = True
                je.void_reason = invoice.void_reason
                je.save()
                je.items.all().delete()
            return

        desc = f"Invoice: {invoice.invoice_number} to {invoice.client_name}"
        inv_date = invoice.created_at.date() if invoice.created_at else date.today()

        if invoice.journal_entry:
            je = invoice.journal_entry
            je.date = inv_date
            je.description = desc
            je.reference = invoice.invoice_number
            je.save()
            je.items.all().delete()
        else:
            je = JournalEntry.objects.create(
                date=inv_date,
                description=desc,
                reference=invoice.invoice_number
            )
            invoice.journal_entry = je
            invoice.save(update_fields=['journal_entry'])

        # Double Entry:
        # Debit: Accounts Receivable (1200) for Invoice amount
        # Credit: Sales Revenue (4010) for Invoice amount
        ar_acct = Account.objects.get(code='1200')
        sales_acct = Account.objects.get(code='4010')

        JournalItem.objects.create(journal_entry=je, account=ar_acct, debit=invoice.amount, credit=Decimal('0.00'))
        JournalItem.objects.create(journal_entry=je, account=sales_acct, debit=Decimal('0.00'), credit=invoice.amount)

        # Paid portion affects Cash:
        # Debit Cash (1010)
        # Credit Accounts Receivable (1200)
        paid_amount = invoice.amount - invoice.balance_due
        if paid_amount > 0:
            cash_acct = Account.objects.get(code='1010')
            JournalItem.objects.create(journal_entry=je, account=cash_acct, debit=paid_amount, credit=Decimal('0.00'))
            JournalItem.objects.create(journal_entry=je, account=ar_acct, debit=Decimal('0.00'), credit=paid_amount)

    @staticmethod
    def get_date_filter(date_range_str):
        """
        Parse date range string and return (start_date, end_date)
        """
        today = date.today()
        if date_range_str == 'last_30_days':
            return today - timedelta(days=30), today
        elif date_range_str == 'this_quarter':
            quarter = (today.month - 1) // 3 + 1
            start_date = date(today.year, 3 * quarter - 2, 1)
            if quarter == 4:
                end_date = date(today.year, 12, 31)
            else:
                end_date = date(today.year, 3 * quarter + 1, 1) - timedelta(days=1)
            return start_date, end_date
        elif date_range_str == 'this_year':
            return date(today.year, 1, 1), date(today.year, 12, 31)
        return None, None

    @staticmethod
    def get_previous_period(start_date, end_date):
        """
        Given a current date range, returns the start/end dates of the previous period.
        """
        if not start_date or not end_date:
            # If all time, default to prior 30 days comparison
            today = date.today()
            return today - timedelta(days=60), today - timedelta(days=31)
        delta = end_date - start_date + timedelta(days=1)
        prev_start = start_date - delta
        prev_end = start_date - timedelta(days=1)
        return prev_start, prev_end

    @staticmethod
    def get_kpis_with_growth(date_range_str=None):
        """
        Calculate total revenue, expense, profit, cash flow and growth % vs previous period
        """
        start_date, end_date = AccountsService.get_date_filter(date_range_str)

        def get_total_revenue(s_date, e_date):
            qs = Revenue.objects.filter(voided=False)
            if s_date and e_date:
                qs = qs.filter(date__range=(s_date, e_date))
            return qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        def get_total_expense(s_date, e_date):
            qs = Expense.objects.filter(voided=False)
            if s_date and e_date:
                qs = qs.filter(date__range=(s_date, e_date))
            return qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        def get_cash_flow(s_date, e_date):
            # Calculate actual cash flow from double-entry items impacting the Cash account (1010)
            AccountsService.ensure_coa()
            cash_acct = Account.objects.get(code='1010')
            qs = JournalItem.objects.filter(account=cash_acct, journal_entry__voided=False)
            if s_date and e_date:
                qs = qs.filter(journal_entry__date__range=(s_date, e_date))
            
            debit_sum = qs.aggregate(total=Sum('debit'))['total'] or Decimal('0.00')
            credit_sum = qs.aggregate(total=Sum('credit'))['total'] or Decimal('0.00')
            return debit_sum - credit_sum

        # Current period totals
        curr_rev = get_total_revenue(start_date, end_date)
        curr_exp = get_total_expense(start_date, end_date)
        curr_profit = curr_rev - curr_exp
        curr_cf = get_cash_flow(start_date, end_date)

        # Previous period totals
        prev_start, prev_end = AccountsService.get_previous_period(start_date, end_date)
        prev_rev = get_total_revenue(prev_start, prev_end)
        prev_exp = get_total_expense(prev_start, prev_end)
        prev_profit = prev_rev - prev_exp
        prev_cf = get_cash_flow(prev_start, prev_end)

        # Calc growth percentage helper
        def calc_growth(curr, prev):
            if not prev or prev == Decimal('0.00'):
                return 100.0 if curr > 0 else 0.0
            return float(round(((curr - prev) / abs(prev)) * 100, 1))

        return {
            'total_revenue': float(curr_rev),
            'revenue_growth': calc_growth(curr_rev, prev_rev),
            'total_expense': float(curr_exp),
            'expense_growth': calc_growth(curr_exp, prev_exp),
            'net_profit': float(curr_profit),
            'profit_growth': calc_growth(curr_profit, prev_profit),
            'cash_flow': float(curr_cf),
            'cash_flow_growth': calc_growth(curr_cf, prev_cf),
        }

    @staticmethod
    def total_revenue():
        return Sale.objects.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')

    @staticmethod
    def total_expense():
        return Expense.objects.filter(voided=False).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    @staticmethod
    def net_profit():
        return AccountsService.total_revenue() - AccountsService.total_expense()

    @staticmethod
    def cash_flow():
        return AccountsService.net_profit()

    @staticmethod
    def income_vs_expense_trend(date_range_str=None):
        """
        Get monthly trend of income vs expenses
        """
        start_date, end_date = AccountsService.get_date_filter(date_range_str)

        rev_qs = Revenue.objects.filter(voided=False)
        exp_qs = Expense.objects.filter(voided=False)

        if start_date and end_date:
            rev_qs = rev_qs.filter(date__range=(start_date, end_date))
            exp_qs = exp_qs.filter(date__range=(start_date, end_date))

        # Group revenues by month
        revenue_by_month = rev_qs.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            income=Sum('amount')
        ).order_by('month')

        # Group expenses by month
        expense_by_month = exp_qs.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            expense=Sum('amount')
        ).order_by('month')

        # Combine the data
        expense_dict = {item['month']: item['expense'] for item in expense_by_month if item['month']}
        revenue_dict = {item['month']: item['income'] for item in revenue_by_month if item['month']}

        all_months = set(list(expense_dict.keys()) + list(revenue_dict.keys()))

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
        return Invoice.objects.filter(voided=False)[:limit]

    @staticmethod
    def expense_categories_breakdown(date_range_str=None):
        """
        Get breakdown of expenses by category with optional date filtering
        """
        start_date, end_date = AccountsService.get_date_filter(date_range_str)
        
        qs = Expense.objects.filter(voided=False)
        if start_date and end_date:
            qs = qs.filter(date__range=(start_date, end_date))

        breakdown = qs.values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        # Calculate total for percentage
        total_expense = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

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
    def kpi_summary(date_range_str=None):
        """
        Wrapper to return dynamic, growth-based summary KPIs
        """
        return AccountsService.get_kpis_with_growth(date_range_str)

