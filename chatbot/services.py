import os
from decimal import Decimal

from groq import Groq
from django.conf import settings
from django.db.models import Sum

from sales.models import Sale


def _get_groq_api_key():
    from accounts.api_config_utils import get_active_api_key
    key = get_active_api_key(provider='groq')
    return key if key else ''


def _get_groq_model():
    return os.environ.get('GROQ_MODEL', getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile'))


def _is_revenue_question(message):
    text = (message or '').lower()
    return any(keyword in text for keyword in [
        'revenue',
        'total revenue',
        'current revenue',
        'sales amount',
        'sales total',
    ])


def _get_current_revenue_text():
    total = Sale.objects.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
    total = total.quantize(Decimal('0.01'))
    return f'Your current revenue is Rs {total:,.2f}.'


def _get_dynamic_business_context(user_message=None):
    try:
        from products.models import Product
        from accounts.models import Invoice as FinanceInvoice
        from purchases.models import Purchase
        
        # A very lightweight statistical overview to minimize token usage
        total_products = Product.objects.count()
        pending_invoices = FinanceInvoice.objects.filter(status__in=['PENDING', 'OVERDUE']).count()
        unpaid_purchases = Purchase.objects.filter(payment_status__in=['UNPAID', 'PARTIAL']).count()
        
        return f"""
REAL-TIME DATABASE OVERVIEW (To see details, use the available tools):
- Total Products registered: {total_products}
- Pending Billing Invoices: {pending_invoices}
- Unpaid Purchase Orders: {unpaid_purchases}
"""
    except Exception as e:
        return f"\nReal-time database business context currently unavailable: {str(e)}\n"


def build_chat_messages(user_message, history=None):
    dynamic_context = _get_dynamic_business_context(user_message)
    
    project_context = f"""
SYSTEM CONTEXT - Bizionary ERP System

{dynamic_context}

PROJECT OVERVIEW:
- Name: Bizionary Business Management ERP
- Stack: Django backend, React frontend, SQLite database
- Goal: A full ERP for sales, products, purchases, invoices, finance, analytics, and user management

ANSWER RULES:
- Keep answers simple and direct.
- If the user asks for a list of products (e.g., products with stock less than a threshold, out of stock, unpaid invoices, etc.), list ALL the items from the REAL-TIME DATABASE BUSINESS CONTEXT provided below. Do not truncate the list or say 'check the section' without listing the items.
- Use the exact Bizionary section or API endpoint when relevant.
- If the user asks for a total, KPI, revenue, count, or summary, answer with the specific dashboard/section name.
- If a question is about a module, mention the matching module and endpoint.
- If something is not available, say that clearly and briefly.
- CRITICAL: There is NO 'Invoices' section in the sidebar navigation. Customer invoices, paid/unpaid invoices, and ordered slips are shown in the 'Create Order' section. Guide the user to the 'Create Order' section (accessible at '/ordered-slips') for invoices.
- CRITICAL: Outstanding supplier payables or purchase orders are also viewed/managed under the 'Create Order' section.

FRONTEND SECTIONS (Sidebar Navigation):
- Dashboard (Main KPIs, summaries)
- Accounts (Expense logging, revenues, invoice bookkeeping)
- Products (Product catalog)
- Stock (Inventory list and low stock items)
- Sales (Sales analytics and transactions)
- Create Order (Ordered slips, customer invoices, pending supplier payables)
- AI Chatbot (AI Assistant page)
- Admin (User management, roles, and permissions)

BACKEND MODULES AND WHAT THEY DO:
- dashboard: main KPIs, revenue, top products, low stock, recent sales, sales performance, payables
- screen_2_sales_items: sales KPIs, monthly performance, category breakdown, top products, trends, targets
- products: product catalog and stock management
- sales: sales transactions
- purchases: purchase orders and supplier/company tracking
- invoices: invoice records
- accounts: revenues, expenses, invoices, trends, API configuration, finance KPIs
- insights: live insights, pricing, demand alerts, stock warnings, recommendations, customer reviews, smart reorder
- user_management: users, roles, departments, modules, permissions, invites, security settings, activity logs
- chatbot: AI support for answering Bizionary questions

KEY DASHBOARD ENDPOINTS:
- GET /api/dashboard/kpis/
- GET /api/dashboard/monthly-revenue/
- GET /api/dashboard/top-products/
- GET /api/dashboard/low-stock-products/
- GET /api/dashboard/recent-sales/
- GET /api/dashboard/outstanding-payables/
- GET /api/dashboard/sales-performance/

KEY SALES ANALYTICS ENDPOINTS:
- GET /api/screen2/analytics/kpis/
- GET /api/screen2/analytics/monthly-performance/
- GET /api/screen2/analytics/category-breakdown/
- GET /api/screen2/analytics/top-products/
- GET /api/screen2/analytics/trends/
- GET /api/screen2/analytics/targets/

KEY ACCOUNTS ENDPOINTS:
- GET /api/accounts/kpis/
- GET /api/accounts/trend/
- GET /api/accounts/recent-invoices/
- GET /api/accounts/expense-categories/
- GET /api/accounts/revenues/
- GET /api/accounts/expenses/
- GET /api/accounts/invoices/
- GET /api/accounts/api-configuration/

KEY INSIGHTS ENDPOINTS:
- GET /api/insights/
- GET /api/insights/live/
- GET /api/insights/pricing/
- GET /api/insights/demand-alerts/
- GET /api/insights/stock-warnings/
- GET /api/insights/recommendations/
- GET /api/insights/nlp-report/live/
- GET /api/insights/customer-reviews/
- GET /api/insights/smart-reorder/

KEY USER MANAGEMENT ENDPOINTS:
- GET /api/user-management/kpis/
- GET /api/user-management/users/
- GET /api/user-management/roles/
- GET /api/user-management/departments/
- GET /api/user-management/modules/
- GET /api/user-management/permissions/
- GET /api/user-management/invites/
- GET /api/user-management/security-settings/

TECHNOLOGY STACK:
- Backend: Python, Django 4.2.7, Django REST Framework
- Frontend: React 19, Vite, Tailwind CSS
- Database: SQLite
- AI: Groq API
- Auth: Token-based DRF auth

IMPORTANT:
- For revenue questions, use the dashboard revenue data or the live sales total from the database
- For section questions, answer with the exact Bizionary section name
- For module questions, mention the matching endpoint if helpful
"""
    
    messages = [
        {
            'role': 'system',
            'content': (
                'You are a Bizionary ERP assistant. Answer with short, simple, direct responses. '
                'You know the full project structure and can answer about every Bizionary section, module, and API endpoint. '
                'If the user asks for revenue, totals, counts, dashboards, or module help, answer with the exact section name and the correct endpoint when useful.\n\n'
                f'{project_context}\n\n'
                'IMPORTANT ON TOOL USE:\n'
                '- You have tools available to query the database. Always call the appropriate tool when asked about products, stock levels, invoices, or payables.\n'
                '- Do NOT call `search_products` with comparison queries (like "stock less than 15" or "unpaid invoices"). Use the dedicated tools (`get_stock_alerts` or `get_unpaid_invoices`) instead.\n'
                '- Do NOT format function calls as text inside XML tags (like <function=...>) or markdown code blocks. Always let the API handle tool execution structures.\n\n'
                'Provide clear, helpful, and accurate answers. Keep responses simple and direct.'
            ),
        }
    ]

    if history:
        # Limit history to the last 6 messages to save Groq daily tokens
        messages.extend(history[-6:])

    messages.append({'role': 'user', 'content': user_message})
    return messages


CHATBOT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search the product catalog by product name, SKU, or category to get their prices, inventory stock levels, and active status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The name, category, or SKU query string to search for."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_alerts",
            "description": "Get a list of products that have low stock, or are below/less than a specific stock quantity threshold (e.g. stock less than 15, inventory under 10). Use this for any stock level comparisons.",
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold": {
                        "type": "integer",
                        "description": "Maximum stock quantity threshold to check (e.g., 10)."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_financial_kpis",
            "description": "Get overall dashboard and financial KPI metrics, including total revenue, product counts, and customer invoice counts.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_unpaid_invoices",
            "description": "Get a list of all unpaid or pending customer invoices from accounts billing ledger.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_outstanding_payables",
            "description": "Get a list of all outstanding supplier payables (unpaid/partial purchase orders).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_reorder_recommendations",
            "description": "Get list of smart reorder recommendations detailing which products to buy, recommended quantities, weighted daily demand, and restocking urgency.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_hot_selling_products",
            "description": "Get a list of hot-selling top products, including units sold and total generated revenue.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]


def execute_tool(name, arguments):
    import json
    try:
        if name == "search_products":
            query = arguments.get("query", "")
            from products.models import Product
            from django.db.models import Q
            products = Product.objects.filter(
                Q(name__icontains=query) | Q(sku__icontains=query) | Q(category__icontains=query)
            ).order_by('name')[:30]
            if not products.exists():
                return "No products found matching query."
            return json.dumps([
                {
                    "id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "stock_quantity": p.stock_quantity,
                    "min_stock": p.min_stock,
                    "cost_price": float(p.cost_price),
                    "unit_price": float(p.unit_price),
                    "category": p.category,
                    "status": p.status
                } for p in products
            ])
            
        elif name == "get_stock_alerts":
            threshold = arguments.get("threshold")
            from products.models import Product
            from django.db.models import F, Q
            if threshold is not None:
                products = Product.objects.filter(stock_quantity__lte=threshold).order_by('stock_quantity')
            else:
                products = Product.objects.filter(
                    Q(stock_quantity__lte=10) | Q(stock_quantity__lt=F('min_stock'))
                ).order_by('stock_quantity')
            
            products = products[:50]
            if not products.exists():
                return "No products found meeting the low stock criteria."
            return json.dumps([
                {
                    "name": p.name,
                    "stock_quantity": p.stock_quantity,
                    "min_stock": p.min_stock,
                    "sku": p.sku
                } for p in products
            ])
            
        elif name == "get_financial_kpis":
            from sales.models import Sale
            from django.db.models import Sum
            from decimal import Decimal
            total_rev = Sale.objects.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
            
            from products.models import Product
            from accounts.models import Invoice as FinanceInvoice
            from purchases.models import Purchase
            
            total_products = Product.objects.count()
            pending_invoices = FinanceInvoice.objects.filter(status__in=['PENDING', 'OVERDUE']).count()
            unpaid_purchases = Purchase.objects.filter(payment_status__in=['UNPAID', 'PARTIAL']).count()
            
            return json.dumps({
                "total_revenue": float(total_rev),
                "total_products_count": total_products,
                "pending_customer_invoices_count": pending_invoices,
                "outstanding_supplier_payables_count": unpaid_purchases,
                "currency": "PKR (Rs)"
            })
            
        elif name == "get_unpaid_invoices":
            from accounts.models import Invoice as FinanceInvoice
            invoices = FinanceInvoice.objects.filter(
                status__in=['PENDING', 'OVERDUE']
            ).order_by('due_date')[:50]
            if not invoices.exists():
                return "No unpaid customer invoices found."
            return json.dumps([
                {
                    "invoice_number": inv.invoice_number,
                    "client_name": inv.client_name,
                    "amount": float(inv.amount),
                    "status": inv.status,
                    "due_date": str(inv.due_date)
                } for inv in invoices
            ])
            
        elif name == "get_outstanding_payables":
            from purchases.models import Purchase
            from django.db.models import Q
            payables = Purchase.objects.select_related('product').filter(
                Q(payment_status='UNPAID') | Q(payment_status='PARTIAL')
            ).order_by('purchase_date')[:50]
            if not payables.exists():
                return "No outstanding supplier payables found."
            return json.dumps([
                {
                    "id": p.id,
                    "supplier": p.company_name,
                    "po_reference": f"PO-{str(p.id).zfill(4)}",
                    "product_name": p.product.name if p.product else "Unknown",
                    "quantity": p.quantity_ordered,
                    "total_cost": float(p.total_cost),
                    "status": p.payment_status,
                    "purchase_date": str(p.purchase_date)
                } for p in payables
            ])
            
        elif name == "get_reorder_recommendations":
            from insights.services import get_smart_reorder_recommendations
            reorder = get_smart_reorder_recommendations()
            reorder_list = reorder.get('recommendations', [])[:30]
            if not reorder_list:
                return "No smart reorder recommendations at this time."
            return json.dumps([
                {
                    "product_name": r['product_name'],
                    "recommended_order_quantity": r['recommended_order_quantity'],
                    "current_stock": r['current_stock'],
                    "reorder_level": r['reorder_level'],
                    "urgency": r['urgency'],
                    "weighted_daily_demand": float(r['weighted_daily_demand'])
                } for r in reorder_list
            ])
            
        elif name == "get_hot_selling_products":
            from insights.services import get_product_performance
            perf = get_product_performance()
            hot_list = perf.get('hot_products', [])
            if not hot_list:
                return "No hot selling products data available."
            return json.dumps([
                {
                    "product_name": p['product_name'],
                    "total_sales": p['total_sales'],
                    "total_revenue": float(p['total_revenue']),
                    "stock_level": p['stock_level']
                } for p in hot_list
            ])
            
        else:
            return f"Error: Tool '{name}' is not supported."
    except Exception as e:
        return f"Error executing tool '{name}': {str(e)}"


def generate_chatbot_response(message, history=None):
    try:
        if _is_revenue_question(message):
            return _get_current_revenue_text()

        api_key = _get_groq_api_key()
        if not api_key:
            raise RuntimeError('Groq API key not configured. Please set GROQ_API_KEY environment variable.')
        
        print(f'[Chatbot] Creating Groq client with API key: {api_key[:20]}...')
        client = Groq(api_key=api_key)
        print('[Chatbot] Groq client created successfully')
        
        messages = build_chat_messages(message, history)
        print(f'[Chatbot] Built {len(messages)} messages')
        
        model = _get_groq_model()
        print(f'[Chatbot] Using model: {model} with function calling support')
        
        # Call Groq with rate-limit fallback handling
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=CHATBOT_TOOLS,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1000,
            )
        except Exception as exc:
            err_msg = str(exc)
            if '429' in err_msg or 'rate_limit' in err_msg or 'limit reached' in err_msg.lower():
                print(f"[Chatbot] Model '{model}' rate limited. Falling back to 'llama-3.1-8b-instant'...")
                model = 'llama-3.1-8b-instant'
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    tools=CHATBOT_TOOLS,
                    tool_choice="auto",
                    temperature=0.7,
                    max_tokens=1000,
                )
            else:
                raise
                
        print('[Chatbot] Got response from Groq API')
        
        response_message = response.choices[0].message
        tool_calls = getattr(response_message, 'tool_calls', None)
        
        if tool_calls:
            print(f'[Chatbot] LLM requested {len(tool_calls)} tool calls')
            # 1. Append assistant message with tool calls to history
            messages.append(response_message)
            
            # 2. Execute each tool and append the result
            for tool_call in tool_calls:
                tool_name = tool_call.function.name
                try:
                    import json
                    tool_args = json.loads(tool_call.function.arguments)
                except Exception:
                    tool_args = {}
                
                print(f"[Chatbot] Executing tool '{tool_name}' with args {tool_args}")
                tool_result = execute_tool(tool_name, tool_args)
                print(f"[Chatbot] Tool result length: {len(tool_result)} chars")
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_name,
                    "content": tool_result
                })
            
            # 3. Call Groq again to synthesize final response
            print('[Chatbot] Sending tool results back to Groq for synthesis...')
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1000,
                )
            except Exception as exc:
                err_msg = str(exc)
                if '429' in err_msg or 'rate_limit' in err_msg or 'limit reached' in err_msg.lower():
                    print(f"[Chatbot] Model '{model}' rate limited during synthesis. Falling back to 'llama-3.1-8b-instant'...")
                    model = 'llama-3.1-8b-instant'
                    response = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=1000,
                    )
                else:
                    raise
            content = response.choices[0].message.content.strip()
        else:
            content = response_message.content.strip()
            
        if not content:
            raise RuntimeError('Groq returned an empty response.')
        print(f'[Chatbot] Response length: {len(content)} characters')
        return content
    
    except Exception as exc:
        print(f'[Chatbot] Error: {exc}')
        import traceback
        traceback.print_exc()
        raise RuntimeError(f'Chatbot request failed: {str(exc)}') from exc
