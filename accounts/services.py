"""
Screen 4: Accounts & Finance - Service Layer
ERP-grade financial KPI engine.
All KPIs are computed dynamically from raw transactions. Nothing is stored.
"""

from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField
from django.db.models.functions import TruncMonth
from decimal import Decimal
from datetime import date, timedelta
from .models import Revenue, Expense, Invoice, Account, JournalEntry, JournalItem, CashTransaction
from sales.models import Sale
from purchases.models import Purchase
from products.models import Product


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
        inv_date = invoice.date or (invoice.created_at.date() if invoice.created_at else date.today())

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
        # Align base date logic dynamically with the latest transaction in the DB to avoid demo decay.
        from django.db.models import Max, Min
        from sales.models import Sale
        from accounts.models import JournalEntry
        
        latest_sale = Sale.objects.aggregate(latest=Max('sale_date'))['latest']
        latest_je = JournalEntry.objects.aggregate(latest=Max('date'))['latest']
        
        dates = [d for d in [latest_sale, latest_je] if d]
        ref_date = max(dates) if dates else date.today()

        if date_range_str == 'last_30_days':
            earliest_sale = Sale.objects.aggregate(earliest=Min('sale_date'))['earliest']
            earliest_je = JournalEntry.objects.aggregate(earliest=Min('date'))['earliest']
            earliest_dates = [d for d in [earliest_sale, earliest_je] if d]
            earliest_transaction = min(earliest_dates) if earliest_dates else ref_date
            
            # Ensure the 30-day range starts no earlier than 29 days before ref_date.
            start_date = max(earliest_transaction, ref_date - timedelta(days=29))
            return start_date, ref_date
        elif date_range_str == 'this_quarter':
            quarter = (ref_date.month - 1) // 3 + 1
            start_date = date(ref_date.year, 3 * quarter - 2, 1)
            if quarter == 4:
                end_date = date(ref_date.year, 12, 31)
            else:
                end_date = date(ref_date.year, 3 * quarter + 1, 1) - timedelta(days=1)
            return start_date, end_date
        elif date_range_str == 'this_year':
            return date(ref_date.year, 1, 1), date(ref_date.year, 12, 31)
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

    # =========================================================
    # ERP KPI ENGINE — all values computed dynamically
    # =========================================================

    @staticmethod
    def get_revenue(start_date=None, end_date=None):
        """Revenue = SUM(Sale.total_price) for PAID sales in date range."""
        qs = Sale.objects.filter(payment_status='PAID')
        if start_date and end_date:
            qs = qs.filter(sale_date__range=(start_date, end_date))
        return qs.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')

    @staticmethod
    def get_cogs(start_date=None, end_date=None):
        """COGS = SUM(quantity_sold × unit_cost_price) using immutable snapshot."""
        qs = Sale.objects.filter(payment_status='PAID')
        if start_date and end_date:
            qs = qs.filter(sale_date__range=(start_date, end_date))
        result = qs.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('quantity_sold') * F('unit_cost_price'),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            )
        )['total']
        return result or Decimal('0.00')

    @staticmethod
    def get_gross_profit(start_date=None, end_date=None):
        """Gross Profit = Revenue - COGS."""
        rev = AccountsService.get_revenue(start_date, end_date)
        cogs = AccountsService.get_cogs(start_date, end_date)
        return rev - cogs

    @staticmethod
    def get_expenses(start_date=None, end_date=None):
        """Expenses = SUM(Expense.amount) where SUPPLIES + non-voided."""
        qs = Expense.objects.filter(voided=False, category='SUPPLIES')
        if start_date and end_date:
            qs = qs.filter(date__range=(start_date, end_date))
        return qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    @staticmethod
    def get_net_profit(start_date=None, end_date=None):
        """Net Profit = Gross Profit - Operating Expenses."""
        return AccountsService.get_gross_profit(start_date, end_date) - AccountsService.get_expenses(start_date, end_date)

    @staticmethod
    def get_cash_flow(start_date=None, end_date=None):
        """Cash Flow from CashTransaction ledger."""
        qs = CashTransaction.objects.all()
        if start_date and end_date:
            qs = qs.filter(date__range=(start_date, end_date))
        inflow = qs.filter(txn_type='IN').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        outflow = qs.filter(txn_type='OUT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return inflow, outflow, inflow - outflow

    @staticmethod
    def get_inventory_value():
        """Inventory Value = SUM(stock_quantity × cost_price) across all products."""
        result = Product.objects.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('stock_quantity') * F('cost_price'),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            )
        )['total']
        return result or Decimal('0.00')

    @staticmethod
    def get_kpis_with_growth(date_range_str=None):
        """
        ERP KPI summary with prior-period growth comparison.
        All values computed dynamically — nothing stored.
        """
        start_date, end_date = AccountsService.get_date_filter(date_range_str)
        prev_start, prev_end = AccountsService.get_previous_period(start_date, end_date)

        def calc_growth(curr, prev):
            if not prev or prev == Decimal('0.00'):
                return 100.0 if curr > 0 else 0.0
            return float(round(((curr - prev) / abs(prev)) * 100, 1))

        def safe_margin(numerator, denominator):
            if not denominator or denominator == Decimal('0.00'):
                return 0.0
            return float(round((numerator / denominator) * 100, 2))

        # Current period
        curr_rev  = AccountsService.get_revenue(start_date, end_date)
        curr_cogs = AccountsService.get_cogs(start_date, end_date)
        curr_gp   = curr_rev - curr_cogs
        curr_exp  = AccountsService.get_expenses(start_date, end_date)
        curr_np   = curr_gp - curr_exp
        curr_cf_in, curr_cf_out, curr_cf_net = AccountsService.get_cash_flow(start_date, end_date)

        # Previous period
        prev_rev  = AccountsService.get_revenue(prev_start, prev_end)
        prev_cogs = AccountsService.get_cogs(prev_start, prev_end)
        prev_gp   = prev_rev - prev_cogs
        prev_exp  = AccountsService.get_expenses(prev_start, prev_end)
        prev_np   = prev_gp - prev_exp
        _, __, prev_cf_net = AccountsService.get_cash_flow(prev_start, prev_end)

        # Inventory value (always all-time, no date filter)
        inv_value = AccountsService.get_inventory_value()

        return {
            # Revenue
            'total_revenue': float(curr_rev),
            'revenue_growth': calc_growth(curr_rev, prev_rev),
            # COGS
            'total_cogs': float(curr_cogs),
            'cogs_growth': calc_growth(curr_cogs, prev_cogs),
            # Gross Profit
            'gross_profit': float(curr_gp),
            'gross_profit_margin': safe_margin(curr_gp, curr_rev),
            'gross_profit_growth': calc_growth(curr_gp, prev_gp),
            # Expenses (Supplies only, non-voided)
            'total_expense': float(curr_exp),
            'expense_growth': calc_growth(curr_exp, prev_exp),
            # Net Profit
            'net_profit': float(curr_np),
            'net_profit_margin': safe_margin(curr_np, curr_rev),
            'profit_growth': calc_growth(curr_np, prev_np),
            # Cash Flow
            'cash_inflow': float(curr_cf_in),
            'cash_outflow': float(curr_cf_out),
            'cash_flow': float(curr_cf_net),
            'cash_flow_growth': calc_growth(curr_cf_net, prev_cf_net),
            # Inventory
            'inventory_value': float(inv_value),
            # Meta
            'start_date': start_date.isoformat() if start_date else None,
            'end_date': end_date.isoformat() if end_date else None,
        }

    @staticmethod
    def income_vs_expense_trend(date_range_str=None):
        """
        Monthly income vs expense trend.
        Income source: Sale.total_price grouped by sale_date month.
        Expense source: Expense.amount (SUPPLIES, non-voided) grouped by date month.
        """
        start_date, end_date = AccountsService.get_date_filter(date_range_str)

        sale_qs = Sale.objects.filter(payment_status='PAID')
        exp_qs  = Expense.objects.filter(voided=False, category='SUPPLIES')

        if start_date and end_date:
            sale_qs = sale_qs.filter(sale_date__range=(start_date, end_date))
            exp_qs  = exp_qs.filter(date__range=(start_date, end_date))

        revenue_by_month = sale_qs.annotate(
            month=TruncMonth('sale_date')
        ).values('month').annotate(income=Sum('total_price')).order_by('month')

        expense_by_month = exp_qs.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(expense=Sum('amount')).order_by('month')

        expense_dict = {item['month']: item['expense'] for item in expense_by_month if item['month']}
        revenue_dict = {item['month']: item['income'] for item in revenue_by_month if item['month']}
        all_months = set(list(expense_dict.keys()) + list(revenue_dict.keys()))

        return [
            {
                'month': month.strftime('%Y-%m'),
                'income': float(revenue_dict.get(month, Decimal('0.00'))),
                'expense': float(expense_dict.get(month, Decimal('0.00'))),
            }
            for month in sorted(all_months)
        ]

    @staticmethod
    def recent_invoices(limit=5):
        return Invoice.objects.filter(voided=False)[:limit]

    @staticmethod
    def expense_categories_breakdown(date_range_str=None):
        """Breakdown of expenses by category with percentages."""
        start_date, end_date = AccountsService.get_date_filter(date_range_str)
        qs = Expense.objects.filter(voided=False)
        if start_date and end_date:
            qs = qs.filter(date__range=(start_date, end_date))

        breakdown = qs.values('category').annotate(total=Sum('amount'), count=Count('id')).order_by('-total')
        total_expense = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        result = []
        for item in breakdown:
            pct = float((item['total'] / total_expense) * 100) if total_expense > 0 else 0
            result.append({'category': item['category'], 'total': float(item['total']), 'count': item['count'], 'percentage': round(pct, 2)})
        return result

    @staticmethod
    def kpi_summary(date_range_str=None):
        """Public entry point — returns full ERP KPI dict with growth rates."""
        return AccountsService.get_kpis_with_growth(date_range_str)

    @staticmethod
    def get_chart_of_accounts_tree(start_date=None, end_date=None):
        """
        Builds a hierarchical tree of Chart of Accounts with aggregated balances.
        """
        AccountsService.ensure_coa()
        
        # 1. Fetch all active accounts
        accounts = Account.objects.filter(is_active=True).order_by('code')
        
        # 2. Get debits/credits per account in the given period (excluding voided journal entries)
        items_qs = JournalItem.objects.filter(journal_entry__voided=False)
        if start_date and end_date:
            items_qs = items_qs.filter(journal_entry__date__range=(start_date, end_date))
        elif end_date:
            items_qs = items_qs.filter(journal_entry__date__lte=end_date)
            
        balances_qs = items_qs.values('account_id').annotate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        )
        
        balances_map = {
            item['account_id']: {
                'debit': item['total_debit'] or Decimal('0.00'),
                'credit': item['total_credit'] or Decimal('0.00')
            }
            for item in balances_qs
        }
        
        # 3. Create nodes for each account
        nodes = {}
        for acct in accounts:
            # Calculate raw balance for this specific account
            bal_data = balances_map.get(acct.id, {'debit': Decimal('0.00'), 'credit': Decimal('0.00')})
            dr = bal_data['debit']
            cr = bal_data['credit']
            
            # Determine balance based on account type
            if acct.account_type in ['ASSET', 'EXPENSE']:
                raw_bal = dr - cr
            else: # LIABILITY, EQUITY, REVENUE
                raw_bal = cr - dr
                
            nodes[acct.id] = {
                'id': acct.id,
                'code': acct.code,
                'name': acct.name,
                'account_type': acct.account_type,
                'raw_balance': raw_bal,
                'balance': Decimal('0.00'), # Will be aggregated
                'parent_id': acct.parent_id,
                'children': []
            }
            
        # 4. Connect children to parents
        roots = []
        for node in nodes.values():
            parent_id = node['parent_id']
            if parent_id and parent_id in nodes:
                nodes[parent_id]['children'].append(node)
            else:
                roots.append(node)
                
        # 5. Recursive function to aggregate balances and format response
        def aggregate_balance(node):
            node_balance = node['raw_balance']
            for child in node['children']:
                node_balance += aggregate_balance(child)
            node['balance'] = float(node_balance)
            if 'raw_balance' in node:
                del node['raw_balance']
            if 'parent_id' in node:
                del node['parent_id']
            return node_balance

        for root in roots:
            aggregate_balance(root)
            
        return roots

    @staticmethod
    def get_profit_loss(start_date=None, end_date=None):
        """
        Calculates Net Profit & Loss statement within a date range
        """
        AccountsService.ensure_coa()
        
        items_qs = JournalItem.objects.filter(journal_entry__voided=False)
        if start_date and end_date:
            items_qs = items_qs.filter(journal_entry__date__range=(start_date, end_date))
            
        balances = items_qs.values('account_id', 'account__code', 'account__name', 'account__account_type').annotate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        )
        
        revenue_items = []
        expense_items = []
        total_revenue = Decimal('0.00')
        total_expense = Decimal('0.00')
        
        all_rev_exp = Account.objects.filter(is_active=True, account_type__in=['REVENUE', 'EXPENSE'])
        balances_map = {item['account_id']: item for item in balances}
        
        for acct in all_rev_exp:
            bal_data = balances_map.get(acct.id, {
                'total_debit': Decimal('0.00'),
                'total_credit': Decimal('0.00')
            })
            dr = bal_data['total_debit'] or Decimal('0.00')
            cr = bal_data['total_credit'] or Decimal('0.00')
            
            if acct.account_type == 'REVENUE':
                bal = cr - dr
                if bal != 0 or not acct.parent:
                    revenue_items.append({
                        'code': acct.code,
                        'name': acct.name,
                        'balance': float(bal)
                    })
                    total_revenue += bal
            elif acct.account_type == 'EXPENSE':
                bal = dr - cr
                if bal != 0 or not acct.parent:
                    expense_items.append({
                        'code': acct.code,
                        'name': acct.name,
                        'balance': float(bal)
                    })
                    total_expense += bal
                    
        revenue_items.sort(key=lambda x: x['code'])
        expense_items.sort(key=lambda x: x['code'])
        
        net_profit = total_revenue - total_expense
        
        return {
            'revenue': revenue_items,
            'total_revenue': float(total_revenue),
            'expense': expense_items,
            'total_expense': float(total_expense),
            'net_profit': float(net_profit),
            'start_date': start_date.isoformat() if start_date else None,
            'end_date': end_date.isoformat() if end_date else None,
        }

    @staticmethod
    def get_balance_sheet(as_of_date=None):
        """
        Calculates Balance Sheet statement as of a specific date
        """
        AccountsService.ensure_coa()
        
        items_qs = JournalItem.objects.filter(journal_entry__voided=False)
        if as_of_date:
            items_qs = items_qs.filter(journal_entry__date__lte=as_of_date)
            
        balances = items_qs.values('account_id', 'account__code', 'account__name', 'account__account_type').annotate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        )
        
        balances_map = {item['account_id']: item for item in balances}
        
        assets = []
        liabilities = []
        equity = []
        
        total_assets = Decimal('0.00')
        total_liabilities = Decimal('0.00')
        total_equity = Decimal('0.00')
        
        net_profit_from_inception = Decimal('0.00')
        
        all_accounts = Account.objects.filter(is_active=True)
        for acct in all_accounts:
            bal_data = balances_map.get(acct.id, {
                'total_debit': Decimal('0.00'),
                'total_credit': Decimal('0.00')
            })
            dr = bal_data['total_debit'] or Decimal('0.00')
            cr = bal_data['total_credit'] or Decimal('0.00')
            
            if acct.account_type == 'ASSET':
                bal = dr - cr
                if bal != 0 or not acct.parent:
                    assets.append({
                        'code': acct.code,
                        'name': acct.name,
                        'balance': float(bal)
                    })
                    total_assets += bal
            elif acct.account_type == 'LIABILITY':
                bal = cr - dr
                if bal != 0 or not acct.parent:
                    liabilities.append({
                        'code': acct.code,
                        'name': acct.name,
                        'balance': float(bal)
                    })
                    total_liabilities += bal
            elif acct.account_type == 'EQUITY':
                bal = cr - dr
                if bal != 0 or not acct.parent:
                    equity.append({
                        'code': acct.code,
                        'name': acct.name,
                        'balance': float(bal)
                    })
                    total_equity += bal
            elif acct.account_type == 'REVENUE':
                net_profit_from_inception += (cr - dr)
            elif acct.account_type == 'EXPENSE':
                net_profit_from_inception -= (dr - cr)
                
        equity.append({
            'code': '3100-NP',
            'name': 'Retained Earnings (Net Income)',
            'balance': float(net_profit_from_inception)
        })
        total_equity += net_profit_from_inception
        
        assets.sort(key=lambda x: x['code'])
        liabilities.sort(key=lambda x: x['code'])
        equity.sort(key=lambda x: x['code'])
        
        return {
            'assets': assets,
            'total_assets': float(total_assets),
            'liabilities': liabilities,
            'total_liabilities': float(total_liabilities),
            'equity': equity,
            'total_equity': float(total_equity),
            'total_liabilities_and_equity': float(total_liabilities + total_equity),
            'as_of_date': as_of_date.isoformat() if as_of_date else None,
        }

