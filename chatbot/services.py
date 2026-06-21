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
    # Do not bypass the LLM if the user is asking for a visual chart/graph/trend of revenue
    if any(k in text for k in ['chart', 'graph', 'trend', 'comparison', 'visual']):
        return False
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


def compress_history(history):
    if not history or len(history) <= 10:
        return history
        
    keep_count = 4
    compress_messages = history[:-keep_count]
    keep_messages = history[-keep_count:]
    
    try:
        from groq import Groq
        api_key = _get_groq_api_key()
        if not api_key:
            return history
            
        client = Groq(api_key=api_key)
        model = _get_groq_model()
        
        summary_prompt = (
            "Summarize the following conversation history between the User and the AI Assistant in a concise, "
            "one-paragraph summary (maximum 120 words). Focus only on key actions, requested details, and resolved facts:\n\n"
        )
        for msg in compress_messages:
            role_name = "User" if msg.get('role') == 'user' else "Assistant"
            summary_prompt += f"{role_name}: {msg.get('content', '')}\n"
            
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": summary_prompt}],
            temperature=0.3,
            max_tokens=200
        )
        summary_text = response.choices[0].message.content.strip()
        print(f"[Chatbot Memory Compression] Compressed {len(compress_messages)} messages into: {summary_text}")
        
        compressed = [
            {
                "role": "system",
                "content": f"Summary of earlier conversation: {summary_text}"
            }
        ]
        compressed.extend(keep_messages)
        return compressed
    except Exception as e:
        print(f"[Chatbot Memory Compression] Error compressing history: {e}")
        return history[-6:]


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
- If the user asks a question about any section or data (like products, stock, sales, expenses, users, invoices, etc.), ALWAYS call the corresponding database tool and list the results directly in your response. Do NOT tell the user to visit or check the section unless they explicitly asked how to navigate there.
- If the user asks for a list of products (e.g., products with stock less than a threshold, out of stock, unpaid invoices, etc.), list ALL the items returned by the tool. Do not truncate the list or say 'check the section' without listing the items.
- Use the exact Bizionary section or API endpoint when relevant.
- If the user asks for a total, KPI, revenue, count, or summary, answer with the specific dashboard/section name.
- If a question is about a module, mention the matching module and endpoint.
- If something is not available, say that clearly and briefly.
- CRITICAL: Customer invoices and receivables are managed in the Accounts module under the Invoices tab. Do NOT direct users to the Create Order section for customer invoices.
- CRITICAL: The Create Order section is only for supplier ordered slips and pending purchase payables.

FRONTEND SECTIONS (Sidebar Navigation):
- Dashboard (Main KPIs, summaries)
- Accounts (Expense logging, revenues, invoices, and transaction logs)
- Products (Product catalog)
- Stock (Inventory list and low stock items)
- Sales (Sales analytics and transactions)
- Create Order (Ordered slips and supplier payables)
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
                'You are Bizionary, a smart ERP assistant. You understand ALL types of input including:\n'
                '- Perfect English: "What is total revenue?"\n'
                '- Broken English: "tell me how much sale done today"\n'
                '- Roman Urdu: "kitna sale hua?", "stock batao", "kharcha kya hai", "top product kaun sa hai"\n'
                '- Mixed language: "Electronics ka total sale kitna hai?", "last month ki expenses batao"\n'
                '- Typos/abbreviations: "sals", "expnses", "prouct stok", "reveue", "purchse"\n'
                '- Urdu/Hindi terms: "farokht" (sale), "kharcha" (expense), "aamdani" (revenue), "maal" (stock/goods)\n'
                'ALWAYS interpret the user intent correctly regardless of spelling, grammar, or language used.\n\n'
                f'{project_context}\n\n'
                'ANSWER RULES FOR CHARTS AND VISUALS:\n'
                '- If the user asks for a chart, graph, visual comparison, or trend (such as sales trend, low stock inventory, income vs expense comparison, or expense category breakdown), ALWAYS call `get_analytics_chart_data` with the correct metric parameter.\n'
                '- In your response, include the raw JSON output of the tool wrapped EXACTLY in a ```chart-data block like this:\n'
                '```chart-data\n'
                '<json_content>\n'
                '```\n'
                '- Do NOT summarize or repeat the raw numbers inside the chart data unless the user asks you to explain the data.\n\n'
                'ANSWER RULES FOR ROUTE NAVIGATION LINKS:\n'
                '- If the user asks how to navigate to any section, or you want to direct them to a page, provide route link buttons in standard markdown syntax:\n'
                '  `[Go to Dashboard](route:/)`\n'
                '  `[View Products](route:/products)`\n'
                '  `[View Sales](route:/sales)`\n'
                '  `[View Purchases](route:/purchases)`\n'
                '  `[View Invoices](route:/invoices)`\n'
                '  `[Check Stock/Inventory](route:/inventory-managment)`\n'
                '  `[Create Order](route:/ordered-slips)`\n'
                '  `[Manage Accounts](route:/accounts)`\n'
                '  `[Open Settings](route:/settings)`\n'
                '  `[Manage Users](route:/user-management)`\n'
                '  `[AI Insights](route:/insights)`\n'
                '  `[Smart Reorder](route:/smart-reorder)`\n'
                '- NEVER output generic hyperlinks. Always use the `route:` prefix inside standard markdown links for ERP pages.\n\n'
                'ANSWER RULES FOR REPORTS AND EXPORTS:\n'
                '- If the user asks for a report download or export (like sales, expenses, or inventory report), ALWAYS call `generate_report` with the correct report_type.\n'
                '- In your response, present the download URL returned by the tool as a standard link button in markdown: `[Download <type> Report](url)` where url is the download_url returned by the tool.\n\n'
                'CONVERSATIONAL SALE RECORDING RULES:\n'
                '- When the user asks to record, create, register, add, or make a sale, you MUST NOT execute the `create_sale` tool immediately.\n'
                '- Instead, first search for the product details using `search_products` to confirm its availability, unit price, and stock.\n'
                '- Present a drafted sale summary to the user including Product Name, Quantity, Unit Price, Total Price (applying any discount), Payment Method, and Customer Name.\n'
                '- Ask the user: "Would you like to confirm recording this sale? Please reply with \'Confirm\' to proceed."\n'
                '- ONLY execute the `create_sale` tool in the subsequent turn if the user explicitly replies with "Confirm", "Yes", "Go ahead", or similar confirmation. If they cancel or do not confirm, do not create the sale.\n\n'
                'TOOL SELECTION RULES — use the most specific tool available:\n'
                '- Sales by date / time period → `get_sales_by_date_range`\n'
                '- Sales by payment method (cash/card) → `get_sales_by_payment_method`\n'
                '- Sales by customer name → `get_sales_by_customer`\n'
                '- Sales by product category → `get_sales_by_category`\n'
                '- Profit margin / net profit → `get_profit_margin`\n'
                '- Returns / refunds → `get_sales_returns`\n'
                '- Discounts given → `get_discount_summary`\n'
                '- Top customers / best buyers → `get_top_customers`\n'
                '- Customer reviews / ratings → `get_customer_reviews`\n'
                '- Expenses by category → `get_expenses_by_category`\n'
                '- Expenses by date → `get_expenses_by_date_range`\n'
                '- Budget vs actual spending → `get_budget_vs_actual`\n'
                '- Revenue vs expenses / P&L → `get_revenue_vs_expenses`\n'
                '- Cash flow / cash transactions → `get_cash_transactions`\n'
                '- Salary payments → `get_salary_payments`\n'
                '- Utility bills → `get_utility_bills`\n'
                '- Purchases / procurement summary → `get_purchases_summary`\n'
                '- Supplier performance → `get_supplier_performance`\n'
                '- Purchase order status → `get_purchase_orders_status`\n'
                '- Purchases for a specific product → `get_purchases_by_product`\n'
                '- Stock/inventory total value → `get_inventory_valuation`\n'
                '- Stock movement / inventory transactions → `get_stock_movement`\n'
                '- Dead stock / zero-sales products → `get_dead_stock`\n'
                '- Sales targets / goal tracking → `get_sales_targets`\n'
                '- Performance metrics / KPI → `get_performance_metrics`\n'
                '- Product search → `search_products`\n'
                '- Low stock alerts → `get_stock_alerts`\n'
                '- Overall KPIs / dashboard → `get_financial_kpis`\n'
                '- Unpaid invoices → `get_unpaid_invoices`\n'
                '- Supplier payables → `get_outstanding_payables`\n'
                '- Reorder recommendations → `get_reorder_recommendations`\n'
                '- Hot selling products → `get_hot_selling_products`\n'
                '- Cold / slow selling products → `get_cold_selling_products`\n'
                '- Recent sales list → `get_recent_sales`\n'
                '- Users list → `get_erp_users`\n'
                '- Activity logs → `get_activity_logs`\n\n'
                'IMPORTANT ON TOOL USE:\n'
                '- Always call the appropriate tool when a data question is asked. NEVER redirect to a UI page for data questions.\n'
                '- Do NOT call `search_products` with comparison queries. Use the dedicated tools instead.\n'
                '- Always call tools natively using the API. Never generate simulated tool requests as text.\n'
                '- When dates are missing from a query like "last month", "last week", "this year", compute the actual date range and pass it to the tool.\n\n'
                'Provide clear, helpful, and accurate answers. Keep responses simple and direct.'
            ),
        }
    ]

    processed_history = history
    if history and len(history) > 10:
        processed_history = compress_history(history)

    if processed_history:
        messages.extend(processed_history)

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
            "description": "Get overall dashboard and financial KPI metrics, including total revenue, total sales count, product counts, and customer invoice counts.",
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
    },
    {
        "type": "function",
        "function": {
            "name": "get_cold_selling_products",
            "description": "Get a list of cold-selling (least sold) products, including units sold, total revenue, and stock levels. Use this when the user asks about cold products, least selling products, or items with very few or no sales.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_sales",
            "description": "Get a list of recent sales transactions. Use this when the user asks about recent sales, order logs, transaction history, or specific sale records.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of recent sales to return. Defaults to 10."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_erp_users",
            "description": "Get a list of ERP users, their designations, departments, roles, and status. Use this for user management queries (e.g. registered users, active/inactive staff).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_invites",
            "description": "Get a list of user invitations, their statuses (e.g., PENDING, ACCEPTED), roles, and departments. Use this for queries about invitations or pending invites.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_activity_logs",
            "description": "Get recent security and activity audit logs showing user actions like login, logout, create, update, or delete. Use this when the user asks about activity logs or action history.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of audit logs to retrieve. Defaults to 15."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_expenses",
            "description": "Get a list of recorded expenses. Filter by category if the query is about specific spend categories.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional category filter. Allowed values: PAYROLL, MARKETING, RENT_UTILITIES, SUPPLIES, TECHNOLOGY, TRAVEL, OTHER."
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of expenses to retrieve. Defaults to 20."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_expense_breakdown",
            "description": "Get a breakdown of expenses by category (total amounts, percentages, and transaction counts). Use this for summary expense queries.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_analytics_chart_data",
            "description": "Retrieve dynamic visual chart data configs (Bar, Line, Pie) for analytical questions, comparisons, revenue vs expense trends, expense category breakdowns, or recent sales trend.",
            "parameters": {
                "type": "object",
                "properties": {
                    "metric": {
                        "type": "string",
                        "enum": ["revenue_vs_expense", "expense_category", "low_stock", "recent_sales_trend"],
                        "description": "The specific metric type of visual chart to generate."
                    }
                },
                "required": ["metric"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_sale",
            "description": "Create a new sales transaction in the database. Use this when the user requests to record, register, create, add, or make a sale.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name_or_sku": {
                        "type": "string",
                        "description": "The name or SKU of the product to sell (e.g. 'Pepsi 1.5L')."
                    },
                    "customer_name": {
                        "type": "string",
                        "description": "The name of the customer buying the product. Default is 'Walk-in Customer'."
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "The number of units sold. Must be at least 1."
                    },
                    "payment_status": {
                        "type": "string",
                        "enum": ["PAID", "PENDING", "FAILED"],
                        "description": "Status of the payment. Default is 'PAID'."
                    },
                    "payment_method": {
                        "type": "string",
                        "enum": ["CASH", "CARD", "EASYPAY_JAZZCASH", "BANK_TRANSFER", "OTHER"],
                        "description": "Method of payment. Default is 'CASH'."
                    },
                    "discount": {
                        "type": "number",
                        "description": "Discount amount applied to the sale in Rs. Default is 0.00."
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes or comments about the sale."
                    }
                },
                "required": ["product_name_or_sku", "quantity"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_report",
            "description": "Generate a downloadable CSV report link for sales, expenses, or inventory stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "report_type": {
                        "type": "string",
                        "enum": ["sales", "expenses", "inventory"],
                        "description": "The type of report to generate (sales, expenses, or inventory)."
                    }
                },
                "required": ["report_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_by_category",
            "description": "Get sales analytics broken down by product category. Returns total quantity sold, total revenue, and number of transactions for each category. Optionally filter by a specific category name. Use this when the user asks about sales per category, total units sold in a specific category (e.g. 'Electronics', 'Books'), or revenue by category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional. Filter results to a specific category name (e.g. 'Electronics & Appliances', 'Books'). Leave empty to get all categories."
                    }
                },
                "required": []
            }
        }
    },
    # ── SALES TOOLS ──────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_sales_by_date_range",
            "description": "Get total sales revenue, quantity sold, and transaction count between two dates. Use for queries like 'sales last week', 'sales in June', 'revenue between Jan and March', 'aaj ki sale', 'is hafty ki farokht'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format."},
                    "end_date": {"type": "string", "description": "End date in YYYY-MM-DD format."}
                },
                "required": ["start_date", "end_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_by_payment_method",
            "description": "Get sales broken down by payment method (Cash, Card, Online, etc). Use for queries like 'how many cash sales?', 'card vs cash revenue', 'payment method breakdown'.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_by_customer",
            "description": "Get sales records and total spending for a specific customer, or list top customers by revenue. Use for 'how much did Ali spend?', 'customer purchase history', 'sales for customer X'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Optional customer name to filter. Leave empty to get all customers ranked by spending."},
                    "limit": {"type": "integer", "description": "Number of top customers to return. Default 10."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_profit_margin",
            "description": "Get profit margin, net profit, gross profit, total cost, and total revenue. Optionally filter by product category or date range. Use for 'profit margin?', 'net profit?', 'how much profit did we make?', 'Electronics ka profit kya hai?'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Optional product category to filter."},
                    "start_date": {"type": "string", "description": "Optional start date YYYY-MM-DD."},
                    "end_date": {"type": "string", "description": "Optional end date YYYY-MM-DD."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_returns",
            "description": "Get sales return/refund records including quantities returned and refund amounts. Use for 'returns this month?', 'how many refunds?', 'return amount?', 'wapas kiya gaya maal'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Optional start date YYYY-MM-DD."},
                    "end_date": {"type": "string", "description": "Optional end date YYYY-MM-DD."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_discount_summary",
            "description": "Get total discounts given, average discount per sale, and maximum discount. Use for 'total discounts?', 'how much discount given?', 'average discount on sales?'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Optional start date YYYY-MM-DD."},
                    "end_date": {"type": "string", "description": "Optional end date YYYY-MM-DD."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_customers",
            "description": "Get the top customers ranked by total amount spent. Use for 'best customers', 'top buyers', 'who spends the most?', 'VIP customers'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of top customers to return. Default 10."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_reviews",
            "description": "Get customer reviews and ratings for products. Use for 'customer reviews', 'ratings', 'negative feedback', 'customer satisfaction'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "min_rating": {"type": "number", "description": "Optional minimum rating filter (1-5)."},
                    "max_rating": {"type": "number", "description": "Optional maximum rating filter (1-5)."},
                    "limit": {"type": "integer", "description": "Number of reviews to return. Default 20."}
                },
                "required": []
            }
        }
    },
    # ── EXPENSE & ACCOUNTS TOOLS ──────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_expenses_by_category",
            "description": "Get total expenses broken down by category (Utilities, Salaries, Rent, etc). Use for 'expense breakdown', 'how much spent on utilities?', 'salary expenses', 'kharcha categories'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Optional specific expense category to filter."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_expenses_by_date_range",
            "description": "Get total expenses between two dates. Use for 'expenses last month?', 'spending in January?', 'pichlay mahiny ka kharcha'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date YYYY-MM-DD."},
                    "end_date": {"type": "string", "description": "End date YYYY-MM-DD."}
                },
                "required": ["start_date", "end_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_budget_vs_actual",
            "description": "Compare budgeted amounts vs actual expenses per category. Use for 'are we over budget?', 'budget utilization?', 'how much of budget is used?'.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenue_vs_expenses",
            "description": "Get a profit and loss summary comparing total revenue vs total expenses and net profit/loss. Use for 'P&L', 'profit and loss', 'income vs expenses', 'are we profitable?', 'aamdani vs kharcha'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Optional start date YYYY-MM-DD."},
                    "end_date": {"type": "string", "description": "Optional end date YYYY-MM-DD."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_cash_transactions",
            "description": "Get recent cash flow transactions (cash in and cash out). Use for 'cash flow', 'cash transactions', 'recent cash movements'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of transactions to return. Default 20."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_salary_payments",
            "description": "Get salary payment records for employees. Use for 'salary payments', 'who was paid?', 'total salary cost', 'employee pay'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Optional start date YYYY-MM-DD."},
                    "end_date": {"type": "string", "description": "Optional end date YYYY-MM-DD."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_utility_bills",
            "description": "Get utility bill records (electricity, gas, water, internet, etc). Use for 'utility bills', 'electricity bill', 'overdue bills', 'bijli ka bill'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Optional status filter: PAID, UNPAID, OVERDUE."},
                    "utility_type": {"type": "string", "description": "Optional utility type: Electricity, Gas, Water, Internet, etc."}
                },
                "required": []
            }
        }
    },
    # ── PURCHASES & SUPPLIER TOOLS ────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_purchases_summary",
            "description": "Get total purchase cost, quantity purchased, and number of purchase orders. Optionally filter by date range. Use for 'total purchases this month', 'procurement cost', 'how much stock did we buy?'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Optional start date YYYY-MM-DD."},
                    "end_date": {"type": "string", "description": "Optional end date YYYY-MM-DD."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_supplier_performance",
            "description": "Get supplier performance ranking by total purchases and order value. Use for 'best supplier', 'supplier ranking', 'which supplier gives us most?'.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_purchase_orders_status",
            "description": "Get purchase orders / ordered slips filtered by status (PENDING, RECEIVED, PARTIAL, CANCELLED). Use for 'pending orders', 'received orders', 'order status', 'kaunsa order pending hai?'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Optional status filter: PENDING, RECEIVED, PARTIAL, CANCELLED. Leave empty for all."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_purchases_by_product",
            "description": "Get purchase history for a specific product including quantities bought and total cost. Use for 'how much did we buy of Samsung TV?', 'purchase history for product X'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "Product name or partial name to search for."}
                },
                "required": ["product_name"]
            }
        }
    },
    # ── INVENTORY TOOLS ───────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_inventory_valuation",
            "description": "Get the total monetary value of current stock (quantity × cost price) per product and per category. Use for 'stock value', 'inventory worth', 'total inventory value', 'maal ki qeemat kitni hai?'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Optional category to filter."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_movement",
            "description": "Get inventory transaction history (IN/OUT movements) for a specific product or all products. Use for 'stock movement', 'inventory transactions', 'stock history for product X'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "Optional product name to filter transactions."},
                    "limit": {"type": "integer", "description": "Number of transactions to return. Default 20."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_dead_stock",
            "description": "Get products that have had zero or very few sales in the last N days (stagnant/dead inventory). Use for 'dead stock', 'zero sales products', 'which products are not selling?', 'stagnant inventory'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Number of days to look back for sales activity. Default 30."}
                },
                "required": []
            }
        }
    },
    # ── TARGETS & PERFORMANCE TOOLS ───────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_sales_targets",
            "description": "Get sales targets and compare with actual sales achieved. Use for 'sales target', 'target vs actual', 'are we hitting targets?', 'goal achievement'.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_performance_metrics",
            "description": "Get stored performance metrics and KPI values from the analytics system. Use for 'performance metrics', 'KPI dashboard', 'business performance'.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
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
                # Try fuzzy matching using difflib
                import difflib
                all_products = Product.objects.all()
                name_map = {p.name: p for p in all_products}
                sku_map = {p.sku: p for p in all_products}
                choices = list(name_map.keys()) + list(sku_map.keys())
                close_matches = difflib.get_close_matches(query.strip(), choices, n=5, cutoff=0.4)
                if close_matches:
                    matched_ids = []
                    for m in close_matches:
                        p_obj = name_map.get(m) or sku_map.get(m)
                        if p_obj and p_obj.id not in matched_ids:
                            matched_ids.append(p_obj.id)
                    products = Product.objects.filter(id__in=matched_ids)
            
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
            total_sales = Sale.objects.count()
            
            from products.models import Product
            from accounts.models import Invoice as FinanceInvoice
            from purchases.models import Purchase
            
            total_products = Product.objects.count()
            pending_invoices = FinanceInvoice.objects.filter(status__in=['PENDING', 'OVERDUE']).count()
            unpaid_purchases = Purchase.objects.filter(payment_status__in=['UNPAID', 'PARTIAL']).count()
            
            return json.dumps({
                "total_revenue": float(total_rev),
                "total_sales_count": total_sales,
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
                    "quantity": p.quantity_purchased,
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
            
        elif name == "get_cold_selling_products":
            from insights.services import get_product_performance
            perf = get_product_performance()
            cold_list = perf.get('cold_products', [])
            if not cold_list:
                return "No cold selling products data available."
            return json.dumps([
                {
                    "product_name": p['product_name'],
                    "total_sales": p['total_sales'],
                    "total_revenue": float(p['total_revenue']),
                    "stock_level": p['stock_level']
                } for p in cold_list
            ])

        elif name == "get_recent_sales":
            from sales.models import Sale
            limit = arguments.get("limit", 10)
            sales = Sale.objects.all().order_by('-sale_date', '-created_at')[:limit]
            if not sales.exists():
                return "No sales transactions found."
            return json.dumps([
                {
                    "id": s.id,
                    "customer_name": s.customer_name,
                    "quantity_sold": s.quantity_sold,
                    "total_price": float(s.total_price),
                    "discount": float(s.discount),
                    "payment_status": s.payment_status,
                    "payment_method": s.payment_method,
                    "sale_date": str(s.sale_date),
                    "product_name": s.product.name if s.product else "Unknown Product"
                } for s in sales
            ])

        elif name == "get_erp_users":
            from user_management.models import ERPUser
            users = ERPUser.objects.all().select_related('department', 'role')
            if not users.exists():
                return "No ERP users registered."
            return json.dumps([
                {
                    "username": u.username,
                    "email": u.email,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "designation": u.designation,
                    "status": u.status,
                    "is_active": u.is_active,
                    "department": u.department.name if u.department else "None",
                    "role": u.role.name if u.role else "None"
                } for u in users
            ])

        elif name == "get_user_invites":
            from user_management.models import UserInvite
            invites = UserInvite.objects.all().select_related('department', 'role')
            if not invites.exists():
                return "No user invites found."
            return json.dumps([
                {
                    "email": i.email,
                    "first_name": i.first_name,
                    "last_name": i.last_name,
                    "status": i.status,
                    "department": i.department.name if i.department else "None",
                    "role": i.role.name if i.role else "None",
                    "created_at": str(i.created_at)
                } for i in invites
            ])

        elif name == "get_activity_logs":
            from user_management.models import ActivityLog
            limit = arguments.get("limit", 15)
            logs = ActivityLog.objects.all().select_related('user').order_by('-timestamp')[:limit]
            if not logs.exists():
                return "No activity logs found."
            return json.dumps([
                {
                    "username": l.user.username if l.user else "Unknown",
                    "action": l.action,
                    "module": l.module,
                    "description": l.description,
                    "status": l.status,
                    "timestamp": str(l.timestamp)
                } for l in logs
            ])

        elif name == "get_expenses":
            from accounts.models import Expense
            category = arguments.get("category")
            limit = arguments.get("limit", 20)
            
            expenses = Expense.objects.all()
            if category:
                expenses = expenses.filter(category=category.upper())
            
            expenses = expenses.order_by('-date', '-created_at')[:limit]
            if not expenses.exists():
                return "No expenses found."
            return json.dumps([
                {
                    "id": e.id,
                    "category": e.category,
                    "amount": float(e.amount),
                    "date": str(e.date),
                    "description": e.description,
                    "vendor": e.vendor
                } for e in expenses
            ])

        elif name == "get_expense_breakdown":
            from accounts.services import AccountsService
            breakdown = AccountsService.expense_categories_breakdown()
            if not breakdown:
                return "No expense breakdown data available."
            return json.dumps(breakdown)
            
        elif name == "get_analytics_chart_data":
            metric = arguments.get("metric")
            if metric == "revenue_vs_expense":
                from accounts.services import AccountsService
                trend = AccountsService.income_vs_expense_trend()
                # Limit to latest 6 data points to prevent token bloat
                trend = trend[-6:] if len(trend) > 6 else trend
                return json.dumps({
                    "chart_type": "line",
                    "title": "Income vs Expense Trend (Last 6 Months)",
                    "x_key": "month",
                    "series": [
                        {"key": "income", "color": "#3B82F6", "name": "Income"},
                        {"key": "expense", "color": "#EF4444", "name": "Expense"}
                    ],
                    "data": trend
                })
            elif metric == "expense_category":
                from accounts.services import AccountsService
                breakdown = AccountsService.expense_categories_breakdown()
                # Format to simple pie chart dataset
                pie_data = [{"category": item["category"], "total": item["total"]} for item in breakdown]
                return json.dumps({
                    "chart_type": "pie",
                    "title": "Expense Categories Breakdown",
                    "x_key": "category",
                    "series": [
                        {"key": "total", "color": "#F59E0B", "name": "Total"}
                    ],
                    "data": pie_data
                })
            elif metric == "low_stock":
                from products.models import Product
                products = Product.objects.filter(stock_quantity__lte=15).order_by('stock_quantity')[:8]
                data = [{"name": p.name[:12], "stock": p.stock_quantity, "min": p.min_stock} for p in products]
                return json.dumps({
                    "chart_type": "bar",
                    "title": "Low Stock Inventory (Under 15)",
                    "x_key": "name",
                    "series": [
                        {"key": "stock", "color": "#EF4444", "name": "Current Stock"},
                        {"key": "min", "color": "#8B5CF6", "name": "Min Stock"}
                    ],
                    "data": data
                })
            elif metric == "recent_sales_trend":
                from insights.services import get_sales_trend
                trend = get_sales_trend()
                # Grab latest 7 days
                trend = trend[-7:] if len(trend) > 7 else trend
                return json.dumps({
                    "chart_type": "bar",
                    "title": "Sales Volume Trend (Last 7 Days)",
                    "x_key": "date",
                    "series": [
                        {"key": "sales", "color": "#10B981", "name": "Sales Volume"}
                    ],
                    "data": trend
                })
            else:
                return f"Error: Unsupported metric '{metric}' for charts."
            
        elif name == "create_sale":
            from decimal import Decimal
            product_query = arguments.get("product_name_or_sku", "")
            qty = arguments.get("quantity", 1)
            customer = arguments.get("customer_name", "Walk-in Customer")
            pay_status = arguments.get("payment_status", "PAID").upper()
            pay_method = arguments.get("payment_method", "CASH").upper()
            discount_val = Decimal(str(arguments.get("discount", 0.00)))
            notes_val = arguments.get("notes", "")

            from django.db import transaction
            from products.models import Product, InventoryTransaction
            from sales.models import Sale
            from django.db.models import Q
            from django.utils import timezone

            # Find the product
            product = Product.objects.filter(
                Q(sku__iexact=product_query.strip()) | Q(name__iexact=product_query.strip())
            ).first()

            if not product:
                # Try partial match if exact match fails
                product = Product.objects.filter(
                    Q(sku__icontains=product_query.strip()) | Q(name__icontains=product_query.strip())
                ).first()

            if not product:
                # Try fuzzy matching using difflib
                import difflib
                all_products = Product.objects.all()
                name_map = {p.name: p for p in all_products}
                sku_map = {p.sku: p for p in all_products}
                choices = list(name_map.keys()) + list(sku_map.keys())
                close_matches = difflib.get_close_matches(product_query.strip(), choices, n=1, cutoff=0.5)
                if close_matches:
                    matched_choice = close_matches[0]
                    product = name_map.get(matched_choice) or sku_map.get(matched_choice)

            if not product:
                return json.dumps({
                    "success": False,
                    "error": f"Product '{product_query}' not found. Please provide a valid product name or SKU."
                })

            # Check stock
            if product.stock_quantity < qty:
                return json.dumps({
                    "success": False,
                    "error": f"Insufficient stock. Product '{product.name}' has only {product.stock_quantity} units available, but {qty} were requested."
                })

            try:
                with transaction.atomic():
                    # Create Sale (which triggers sale_post_save signals automatically!)
                    sale = Sale.objects.create(
                        product=product,
                        customer_name=customer,
                        quantity_sold=qty,
                        unit_price=product.unit_price,
                        unit_cost_price=product.cost_price,
                        total_price=product.unit_price * qty - discount_val,
                        discount=discount_val,
                        payment_status=pay_status,
                        payment_method=pay_method,
                        sale_date=timezone.now().date(),
                        notes=notes_val or "Created via AI Chatbot"
                    )

                return json.dumps({
                    "success": True,
                    "message": f"Sale #{sale.id} created successfully.",
                    "sale": {
                        "id": sale.id,
                        "product_name": product.name,
                        "customer_name": sale.customer_name,
                        "quantity_sold": sale.quantity_sold,
                        "unit_price": float(sale.unit_price),
                        "total_price": float(sale.total_price),
                        "discount": float(sale.discount),
                        "payment_status": sale.payment_status,
                        "payment_method": sale.payment_method,
                        "sale_date": str(sale.sale_date)
                    }
                })
            except Exception as e:
                return json.dumps({
                    "success": False,
                    "error": f"Failed to save sale transaction: {str(e)}"
                })
            
        elif name == "generate_report":
            report_type = arguments.get("report_type", "sales").lower()
            if report_type not in ["sales", "expenses", "inventory", "stock"]:
                return json.dumps({
                    "success": False,
                    "error": f"Unsupported report type '{report_type}'. Allowed types are 'sales', 'expenses', or 'inventory'."
                })
            
            url_type = "inventory" if report_type == "stock" else report_type
            download_url = f"/api/chatbot/download-report/?type={url_type}"
            
            return json.dumps({
                "success": True,
                "report_type": report_type,
                "download_url": download_url,
                "message": f"Successfully generated a download link for the {report_type} report. Please present this link in markdown format [Download {report_type.capitalize()} Report]({download_url}) to the user so they can click it to download."
            })
            
        elif name == "get_sales_by_category":
            from products.models import Product
            from sales.models import Sale
            from django.db.models import Sum, Count, F, Q
            import difflib

            category_filter = arguments.get("category", "").strip()

            # Fuzzy-match the category name if provided
            all_categories = list(
                Product.objects.values_list('category', flat=True).distinct()
            )

            if category_filter:
                # Try exact (case-insensitive) first
                exact_match = next(
                    (c for c in all_categories if c.lower() == category_filter.lower()), None
                )
                if exact_match:
                    matched_category = exact_match
                else:
                    close = difflib.get_close_matches(
                        category_filter, all_categories, n=1, cutoff=0.4
                    )
                    matched_category = close[0] if close else None

                if not matched_category:
                    return json.dumps({
                        "success": False,
                        "error": f"Category '{category_filter}' not found. Available categories: {', '.join(all_categories)}"
                    })

                filter_categories = [matched_category]
            else:
                filter_categories = all_categories

            results = []
            for cat in filter_categories:
                # Get all products in this category
                cat_product_ids = list(
                    Product.objects.filter(category=cat).values_list('id', flat=True)
                )

                if not cat_product_ids:
                    continue

                # Aggregate Sale rows for these products
                agg = Sale.objects.filter(
                    product__in=cat_product_ids
                ).aggregate(
                    total_qty=Sum('quantity_sold'),
                    total_revenue=Sum('total_price'),
                    total_transactions=Count('id', distinct=True)
                )

                total_qty = agg['total_qty'] or 0
                total_revenue = agg['total_revenue'] or 0
                total_txn = agg['total_transactions'] or 0

                # Top 5 products in this category by qty sold
                top_products = (
                    Sale.objects.filter(product__in=cat_product_ids)
                    .values('product__name')
                    .annotate(qty_sold=Sum('quantity_sold'), revenue=Sum('total_price'))
                    .order_by('-qty_sold')[:5]
                )

                results.append({
                    "category": cat,
                    "total_quantity_sold": total_qty,
                    "total_revenue": round(float(total_revenue), 2),
                    "total_transactions": total_txn,
                    "top_products": [
                        {
                            "name": p['product__name'],
                            "quantity_sold": p['qty_sold'],
                            "revenue": round(float(p['revenue']), 2)
                        }
                        for p in top_products
                    ]
                })

            if not results:
                return json.dumps({
                    "success": True,
                    "message": "No sales data found for the requested category.",
                    "data": []
                })

            return json.dumps({
                "success": True,
                "data": results,
                "categories_queried": len(results)
            })

        # ── SALES TOOLS ─────────────────────────────────────────────────────
        elif name == "get_sales_by_date_range":
            from sales.models import Sale
            from django.db.models import Sum, Count
            from datetime import datetime
            start_date = arguments.get("start_date", "")
            end_date = arguments.get("end_date", "")
            qs = Sale.objects.filter(sale_date__date__gte=start_date, sale_date__date__lte=end_date)
            agg = qs.aggregate(
                total_revenue=Sum('total_price'),
                total_qty=Sum('quantity_sold'),
                total_transactions=Count('id')
            )
            return json.dumps({
                "success": True,
                "start_date": start_date,
                "end_date": end_date,
                "total_revenue": round(float(agg['total_revenue'] or 0), 2),
                "total_quantity_sold": agg['total_qty'] or 0,
                "total_transactions": agg['total_transactions'] or 0
            })

        elif name == "get_sales_by_payment_method":
            from sales.models import Sale
            from django.db.models import Sum, Count
            rows = (
                Sale.objects.values('payment_method')
                .annotate(total_revenue=Sum('total_price'), total_transactions=Count('id'), total_qty=Sum('quantity_sold'))
                .order_by('-total_revenue')
            )
            return json.dumps({
                "success": True,
                "data": [
                    {
                        "payment_method": r['payment_method'] or "Not Specified",
                        "total_revenue": round(float(r['total_revenue'] or 0), 2),
                        "total_transactions": r['total_transactions'],
                        "total_quantity_sold": r['total_qty'] or 0
                    }
                    for r in rows
                ]
            })

        elif name == "get_sales_by_customer":
            from sales.models import Sale
            from django.db.models import Sum, Count, Q
            import difflib
            customer_name = arguments.get("customer_name", "").strip()
            limit = arguments.get("limit", 10)
            if customer_name:
                qs = Sale.objects.filter(customer_name__icontains=customer_name)
                if not qs.exists():
                    all_customers = list(Sale.objects.values_list('customer_name', flat=True).distinct())
                    close = difflib.get_close_matches(customer_name, all_customers, n=3, cutoff=0.4)
                    if close:
                        qs = Sale.objects.filter(customer_name__in=close)
            else:
                qs = Sale.objects.all()
            rows = (
                qs.values('customer_name')
                .annotate(total_spent=Sum('total_price'), total_orders=Count('id'), total_qty=Sum('quantity_sold'))
                .order_by('-total_spent')[:limit]
            )
            return json.dumps({
                "success": True,
                "data": [
                    {
                        "customer_name": r['customer_name'] or "Walk-in",
                        "total_spent": round(float(r['total_spent'] or 0), 2),
                        "total_orders": r['total_orders'],
                        "total_quantity": r['total_qty'] or 0
                    }
                    for r in rows
                ]
            })

        elif name == "get_profit_margin":
            from sales.models import Sale
            from django.db.models import Sum, F, Q
            import difflib
            category = arguments.get("category", "").strip()
            start_date = arguments.get("start_date", "")
            end_date = arguments.get("end_date", "")
            qs = Sale.objects.all()
            if category:
                from products.models import Product
                all_cats = list(Product.objects.values_list('category', flat=True).distinct())
                exact = next((c for c in all_cats if c.lower() == category.lower()), None)
                if not exact:
                    close = difflib.get_close_matches(category, all_cats, n=1, cutoff=0.4)
                    exact = close[0] if close else None
                if exact:
                    pids = list(Product.objects.filter(category=exact).values_list('id', flat=True))
                    qs = qs.filter(product__in=pids)
            if start_date:
                qs = qs.filter(sale_date__date__gte=start_date)
            if end_date:
                qs = qs.filter(sale_date__date__lte=end_date)
            agg = qs.aggregate(
                total_revenue=Sum('total_price'),
                total_cost=Sum(F('unit_cost_price') * F('quantity_sold'))
            )
            revenue = float(agg['total_revenue'] or 0)
            cost = float(agg['total_cost'] or 0)
            gross_profit = revenue - cost
            margin = (gross_profit / revenue * 100) if revenue > 0 else 0
            return json.dumps({
                "success": True,
                "category_filter": category or "All",
                "total_revenue": round(revenue, 2),
                "total_cost": round(cost, 2),
                "gross_profit": round(gross_profit, 2),
                "profit_margin_percent": round(margin, 2)
            })

        elif name == "get_sales_returns":
            from sales.models import SaleReturn
            from django.db.models import Sum, Count
            start_date = arguments.get("start_date", "")
            end_date = arguments.get("end_date", "")
            qs = SaleReturn.objects.all()
            if start_date:
                qs = qs.filter(return_date__date__gte=start_date)
            if end_date:
                qs = qs.filter(return_date__date__lte=end_date)
            agg = qs.aggregate(
                total_refund=Sum('refund_amount'),
                total_qty_returned=Sum('quantity_returned'),
                total_returns=Count('id')
            )
            recent = list(qs.select_related('product', 'sale').order_by('-return_date')[:10].values(
                'product__name', 'quantity_returned', 'refund_amount', 'reason', 'return_date'
            ))
            return json.dumps({
                "success": True,
                "total_returns": agg['total_returns'] or 0,
                "total_quantity_returned": agg['total_qty_returned'] or 0,
                "total_refund_amount": round(float(agg['total_refund'] or 0), 2),
                "recent_returns": [
                    {
                        "product": r['product__name'],
                        "qty_returned": r['quantity_returned'],
                        "refund_amount": round(float(r['refund_amount'] or 0), 2),
                        "reason": r['reason'],
                        "return_date": str(r['return_date'])
                    }
                    for r in recent
                ]
            })

        elif name == "get_discount_summary":
            from sales.models import Sale
            from django.db.models import Sum, Avg, Max, Count
            start_date = arguments.get("start_date", "")
            end_date = arguments.get("end_date", "")
            qs = Sale.objects.all()
            if start_date:
                qs = qs.filter(sale_date__date__gte=start_date)
            if end_date:
                qs = qs.filter(sale_date__date__lte=end_date)
            agg = qs.aggregate(
                total_discount=Sum('discount'),
                avg_discount=Avg('discount'),
                max_discount=Max('discount'),
                sales_with_discount=Count('id', filter=Q(discount__gt=0))
            )
            return json.dumps({
                "success": True,
                "total_discount_given": round(float(agg['total_discount'] or 0), 2),
                "average_discount_per_sale": round(float(agg['avg_discount'] or 0), 2),
                "maximum_discount": round(float(agg['max_discount'] or 0), 2),
                "sales_with_discount_count": agg['sales_with_discount'] or 0
            })

        elif name == "get_top_customers":
            from sales.models import Sale
            from django.db.models import Sum, Count
            limit = arguments.get("limit", 10)
            rows = (
                Sale.objects.values('customer_name')
                .annotate(total_spent=Sum('total_price'), total_orders=Count('id'))
                .order_by('-total_spent')[:limit]
            )
            return json.dumps({
                "success": True,
                "data": [
                    {
                        "rank": i + 1,
                        "customer_name": r['customer_name'] or "Walk-in",
                        "total_spent": round(float(r['total_spent'] or 0), 2),
                        "total_orders": r['total_orders']
                    }
                    for i, r in enumerate(rows)
                ]
            })

        elif name == "get_customer_reviews":
            from insights.models import CustomerReview
            from django.db.models import Q
            min_rating = arguments.get("min_rating")
            max_rating = arguments.get("max_rating")
            limit = arguments.get("limit", 20)
            qs = CustomerReview.objects.all()
            if min_rating is not None:
                qs = qs.filter(rating__gte=min_rating)
            if max_rating is not None:
                qs = qs.filter(rating__lte=max_rating)
            reviews = list(qs.order_by('-created_at')[:limit].values(
                'customer_name', 'review_text', 'rating', 'sentiment_label', 'sentiment_score', 'created_at'
            ))
            from django.db.models import Avg, Count
            agg = CustomerReview.objects.aggregate(avg_rating=Avg('rating'), total=Count('id'))
            return json.dumps({
                "success": True,
                "total_reviews": agg['total'] or 0,
                "average_rating": round(float(agg['avg_rating'] or 0), 2),
                "reviews": [
                    {
                        "customer": r['customer_name'],
                        "review": r['review_text'],
                        "rating": r['rating'],
                        "sentiment": r['sentiment_label'],
                        "date": str(r['created_at'])
                    }
                    for r in reviews
                ]
            })

        # ── EXPENSE & ACCOUNTS TOOLS ─────────────────────────────────────────
        elif name == "get_expenses_by_category":
            from accounts.models import Expense
            from django.db.models import Sum, Count
            import difflib
            category = arguments.get("category", "").strip()
            qs = Expense.objects.filter(voided=False)
            if category:
                all_cats = list(Expense.objects.values_list('category', flat=True).distinct())
                exact = next((c for c in all_cats if c.lower() == category.lower()), None)
                if not exact:
                    close = difflib.get_close_matches(category, all_cats, n=1, cutoff=0.4)
                    exact = close[0] if close else None
                if exact:
                    qs = qs.filter(category=exact)
            rows = (
                qs.values('category')
                .annotate(total_amount=Sum('amount'), count=Count('id'))
                .order_by('-total_amount')
            )
            return json.dumps({
                "success": True,
                "data": [
                    {
                        "category": r['category'] or "Uncategorized",
                        "total_amount": round(float(r['total_amount'] or 0), 2),
                        "count": r['count']
                    }
                    for r in rows
                ]
            })

        elif name == "get_expenses_by_date_range":
            from accounts.models import Expense
            from django.db.models import Sum, Count
            start_date = arguments.get("start_date", "")
            end_date = arguments.get("end_date", "")
            qs = Expense.objects.filter(voided=False, date__gte=start_date, date__lte=end_date)
            agg = qs.aggregate(total_amount=Sum('amount'), count=Count('id'))
            breakdown = list(
                qs.values('category')
                .annotate(total=Sum('amount'))
                .order_by('-total')[:10]
            )
            return json.dumps({
                "success": True,
                "start_date": start_date,
                "end_date": end_date,
                "total_expenses": round(float(agg['total_amount'] or 0), 2),
                "expense_count": agg['count'] or 0,
                "by_category": [{"category": r['category'], "amount": round(float(r['total'] or 0), 2)} for r in breakdown]
            })

        elif name == "get_budget_vs_actual":
            from accounts.models import Expense, ExpenseBudget
            from django.db.models import Sum
            from datetime import date
            budgets = ExpenseBudget.objects.all()
            result = []
            today = date.today()
            for b in budgets:
                actual_qs = Expense.objects.filter(voided=False, category__icontains=b.category)
                if b.period_type == 'MONTHLY' and b.month and b.year:
                    actual_qs = actual_qs.filter(date__year=b.year, date__month=b.month)
                elif b.period_type == 'YEARLY' and b.year:
                    actual_qs = actual_qs.filter(date__year=b.year)
                actual = float(actual_qs.aggregate(t=Sum('amount'))['t'] or 0)
                budgeted = float(b.budgeted_amount or 0)
                result.append({
                    "category": b.category,
                    "period": b.period_type,
                    "budgeted_amount": round(budgeted, 2),
                    "actual_amount": round(actual, 2),
                    "variance": round(budgeted - actual, 2),
                    "utilization_percent": round(actual / budgeted * 100, 1) if budgeted > 0 else 0,
                    "status": "Over Budget" if actual > budgeted else "Within Budget"
                })
            return json.dumps({"success": True, "data": result, "total_budgets": len(result)})

        elif name == "get_revenue_vs_expenses":
            from sales.models import Sale
            from accounts.models import Expense
            from django.db.models import Sum
            start_date = arguments.get("start_date", "")
            end_date = arguments.get("end_date", "")
            sale_qs = Sale.objects.all()
            exp_qs = Expense.objects.filter(voided=False)
            if start_date:
                sale_qs = sale_qs.filter(sale_date__date__gte=start_date)
                exp_qs = exp_qs.filter(date__gte=start_date)
            if end_date:
                sale_qs = sale_qs.filter(sale_date__date__lte=end_date)
                exp_qs = exp_qs.filter(date__lte=end_date)
            total_revenue = float(sale_qs.aggregate(t=Sum('total_price'))['t'] or 0)
            total_expenses = float(exp_qs.aggregate(t=Sum('amount'))['t'] or 0)
            net = total_revenue - total_expenses
            return json.dumps({
                "success": True,
                "total_revenue": round(total_revenue, 2),
                "total_expenses": round(total_expenses, 2),
                "net_profit_or_loss": round(net, 2),
                "status": "Profitable" if net >= 0 else "At a Loss",
                "profit_margin_percent": round(net / total_revenue * 100, 2) if total_revenue > 0 else 0
            })

        elif name == "get_cash_transactions":
            from accounts.models import CashTransaction
            limit = arguments.get("limit", 20)
            txns = list(CashTransaction.objects.order_by('-date')[:limit].values(
                'txn_type', 'amount', 'source_type', 'date', 'description'
            ))
            from accounts.models import CashTransaction as CT
            from django.db.models import Sum
            cash_in = float(CT.objects.filter(txn_type='IN').aggregate(t=Sum('amount'))['t'] or 0)
            cash_out = float(CT.objects.filter(txn_type='OUT').aggregate(t=Sum('amount'))['t'] or 0)
            return json.dumps({
                "success": True,
                "total_cash_in": round(cash_in, 2),
                "total_cash_out": round(cash_out, 2),
                "net_cash_flow": round(cash_in - cash_out, 2),
                "recent_transactions": [
                    {
                        "type": t['txn_type'],
                        "amount": round(float(t['amount'] or 0), 2),
                        "source": t['source_type'],
                        "date": str(t['date']),
                        "description": t['description']
                    }
                    for t in txns
                ]
            })

        elif name == "get_salary_payments":
            from accounts.models import SalaryPayment
            from django.db.models import Sum, Count
            start_date = arguments.get("start_date", "")
            end_date = arguments.get("end_date", "")
            qs = SalaryPayment.objects.all()
            if start_date:
                qs = qs.filter(payment_date__gte=start_date)
            if end_date:
                qs = qs.filter(payment_date__lte=end_date)
            agg = qs.aggregate(total_paid=Sum('amount'), count=Count('id'))
            records = list(qs.select_related('employee').order_by('-payment_date')[:20].values(
                'employee__first_name', 'employee__last_name', 'amount', 'payment_date', 'status', 'payment_method'
            ))
            return json.dumps({
                "success": True,
                "total_salary_paid": round(float(agg['total_paid'] or 0), 2),
                "payment_count": agg['count'] or 0,
                "records": [
                    {
                        "employee": f"{r['employee__first_name']} {r['employee__last_name']}",
                        "amount": round(float(r['amount'] or 0), 2),
                        "payment_date": str(r['payment_date']),
                        "status": r['status'],
                        "method": r['payment_method']
                    }
                    for r in records
                ]
            })

        elif name == "get_utility_bills":
            from accounts.models import UtilityBill
            from django.db.models import Sum, Count
            status = arguments.get("status", "").upper()
            utility_type = arguments.get("utility_type", "").strip()
            qs = UtilityBill.objects.all()
            if status:
                qs = qs.filter(status__iexact=status)
            if utility_type:
                qs = qs.filter(utility_type__icontains=utility_type)
            agg = qs.aggregate(total_amount=Sum('amount'), count=Count('id'))
            bills = list(qs.order_by('-due_date')[:20].values(
                'utility_type', 'bill_number', 'amount', 'due_date', 'status', 'payment_date'
            ))
            return json.dumps({
                "success": True,
                "total_bills": agg['count'] or 0,
                "total_amount": round(float(agg['total_amount'] or 0), 2),
                "bills": [
                    {
                        "type": b['utility_type'],
                        "bill_number": b['bill_number'],
                        "amount": round(float(b['amount'] or 0), 2),
                        "due_date": str(b['due_date']),
                        "status": b['status'],
                        "paid_on": str(b['payment_date']) if b['payment_date'] else "Not Paid"
                    }
                    for b in bills
                ]
            })

        # ── PURCHASES & SUPPLIER TOOLS ───────────────────────────────────────
        elif name == "get_purchases_summary":
            from purchases.models import Purchase
            from django.db.models import Sum, Count
            start_date = arguments.get("start_date", "")
            end_date = arguments.get("end_date", "")
            qs = Purchase.objects.all()
            if start_date:
                qs = qs.filter(purchase_date__date__gte=start_date)
            if end_date:
                qs = qs.filter(purchase_date__date__lte=end_date)
            agg = qs.aggregate(
                total_cost=Sum('total_cost'),
                total_qty=Sum('quantity_purchased'),
                count=Count('id')
            )
            by_status = list(
                qs.values('payment_status')
                .annotate(total=Sum('total_cost'), cnt=Count('id'))
                .order_by('-total')
            )
            return json.dumps({
                "success": True,
                "total_purchase_cost": round(float(agg['total_cost'] or 0), 2),
                "total_quantity_purchased": agg['total_qty'] or 0,
                "total_purchase_orders": agg['count'] or 0,
                "by_payment_status": [
                    {"status": r['payment_status'], "total_cost": round(float(r['total'] or 0), 2), "count": r['cnt']}
                    for r in by_status
                ]
            })

        elif name == "get_supplier_performance":
            from purchases.models import Purchase
            from django.db.models import Sum, Count
            rows = (
                Purchase.objects.values('company_name')
                .annotate(total_cost=Sum('total_cost'), total_orders=Count('id'), total_qty=Sum('quantity_purchased'))
                .order_by('-total_cost')[:15]
            )
            return json.dumps({
                "success": True,
                "data": [
                    {
                        "rank": i + 1,
                        "supplier": r['company_name'] or "Unknown",
                        "total_purchase_cost": round(float(r['total_cost'] or 0), 2),
                        "total_orders": r['total_orders'],
                        "total_quantity": r['total_qty'] or 0
                    }
                    for i, r in enumerate(rows)
                ]
            })

        elif name == "get_purchase_orders_status":
            from purchases.models import OrderedSlip
            from django.db.models import Sum, Count, Q
            status = arguments.get("status", "").upper()
            qs = OrderedSlip.objects.all()
            if status:
                qs = qs.filter(status__iexact=status)
            orders = list(qs.order_by('-created_at')[:30].values(
                'product__name', 'company_name', 'quantity_ordered', 'quantity_received',
                'unit_cost', 'total_cost', 'status', 'due_date', 'created_at'
            ))
            summary = list(
                OrderedSlip.objects.values('status')
                .annotate(count=Count('id'), total_value=Sum('total_cost'))
            )
            return json.dumps({
                "success": True,
                "summary_by_status": [
                    {"status": r['status'], "count": r['count'], "total_value": round(float(r['total_value'] or 0), 2)}
                    for r in summary
                ],
                "orders": [
                    {
                        "product": o['product__name'],
                        "supplier": o['company_name'],
                        "qty_ordered": o['quantity_ordered'],
                        "qty_received": o['quantity_received'],
                        "total_cost": round(float(o['total_cost'] or 0), 2),
                        "status": o['status'],
                        "due_date": str(o['due_date']) if o['due_date'] else None
                    }
                    for o in orders
                ]
            })

        elif name == "get_purchases_by_product":
            from purchases.models import Purchase
            from django.db.models import Sum, Count, Q
            import difflib
            product_name = arguments.get("product_name", "").strip()
            from products.models import Product
            products = Product.objects.filter(name__icontains=product_name)
            if not products.exists():
                all_names = list(Product.objects.values_list('name', flat=True))
                close = difflib.get_close_matches(product_name, all_names, n=3, cutoff=0.4)
                if close:
                    products = Product.objects.filter(name__in=close)
            if not products.exists():
                return json.dumps({"success": False, "error": f"Product '{product_name}' not found."})
            pids = list(products.values_list('id', flat=True))
            purchases = list(
                Purchase.objects.filter(product__in=pids)
                .values('product__name', 'company_name', 'quantity_purchased', 'unit_cost', 'total_cost', 'purchase_date', 'payment_status')
                .order_by('-purchase_date')[:20]
            )
            agg = Purchase.objects.filter(product__in=pids).aggregate(
                total_cost=Sum('total_cost'), total_qty=Sum('quantity_purchased'), count=Count('id')
            )
            return json.dumps({
                "success": True,
                "total_purchased_qty": agg['total_qty'] or 0,
                "total_purchase_cost": round(float(agg['total_cost'] or 0), 2),
                "total_purchase_orders": agg['count'] or 0,
                "purchases": [
                    {
                        "product": p['product__name'],
                        "supplier": p['company_name'],
                        "qty": p['quantity_purchased'],
                        "unit_cost": round(float(p['unit_cost'] or 0), 2),
                        "total_cost": round(float(p['total_cost'] or 0), 2),
                        "date": str(p['purchase_date']),
                        "status": p['payment_status']
                    }
                    for p in purchases
                ]
            })

        # ── INVENTORY TOOLS ─────────────────────────────────────────────────
        elif name == "get_inventory_valuation":
            from products.models import Product
            from django.db.models import Sum, F, FloatField, ExpressionWrapper
            import difflib
            category = arguments.get("category", "").strip()
            qs = Product.objects.filter(status='ACTIVE')
            if category:
                all_cats = list(Product.objects.values_list('category', flat=True).distinct())
                exact = next((c for c in all_cats if c.lower() == category.lower()), None)
                if not exact:
                    close = difflib.get_close_matches(category, all_cats, n=1, cutoff=0.4)
                    exact = close[0] if close else None
                if exact:
                    qs = qs.filter(category=exact)
            products = list(qs.values('name', 'category', 'stock_quantity', 'cost_price').order_by('category', 'name'))
            by_category = {}
            total_value = 0
            for p in products:
                val = float(p['stock_quantity'] or 0) * float(p['cost_price'] or 0)
                total_value += val
                cat = p['category'] or "Uncategorized"
                if cat not in by_category:
                    by_category[cat] = {"category": cat, "total_value": 0, "product_count": 0}
                by_category[cat]["total_value"] += val
                by_category[cat]["product_count"] += 1
            for cat in by_category:
                by_category[cat]["total_value"] = round(by_category[cat]["total_value"], 2)
            return json.dumps({
                "success": True,
                "total_inventory_value": round(total_value, 2),
                "by_category": list(by_category.values()),
                "top_10_by_value": sorted(
                    [{"name": p['name'], "category": p['category'],
                      "stock": p['stock_quantity'],
                      "value": round(float(p['stock_quantity'] or 0) * float(p['cost_price'] or 0), 2)}
                     for p in products],
                    key=lambda x: x['value'], reverse=True
                )[:10]
            })

        elif name == "get_stock_movement":
            from products.models import InventoryTransaction, Product
            from django.db.models import Q
            import difflib
            product_name = arguments.get("product_name", "").strip()
            limit = arguments.get("limit", 20)
            qs = InventoryTransaction.objects.all()
            if product_name:
                products = Product.objects.filter(name__icontains=product_name)
                if not products.exists():
                    all_names = list(Product.objects.values_list('name', flat=True))
                    close = difflib.get_close_matches(product_name, all_names, n=3, cutoff=0.4)
                    if close:
                        products = Product.objects.filter(name__in=close)
                if products.exists():
                    qs = qs.filter(product__in=products)
            txns = list(qs.select_related('product').order_by('-date')[:limit].values(
                'product__name', 'txn_type', 'quantity', 'reference_type', 'note', 'date'
            ))
            return json.dumps({
                "success": True,
                "transactions": [
                    {
                        "product": t['product__name'],
                        "type": t['txn_type'],
                        "quantity": t['quantity'],
                        "reference": t['reference_type'],
                        "note": t['note'],
                        "date": str(t['date'])
                    }
                    for t in txns
                ]
            })

        elif name == "get_dead_stock":
            from products.models import Product
            from sales.models import Sale
            from django.db.models import Max
            from datetime import date, timedelta
            days = arguments.get("days", 30)
            cutoff = date.today() - timedelta(days=days)
            active_products = Product.objects.filter(status='ACTIVE', stock_quantity__gt=0)
            # Get product IDs with a sale in the last N days
            recently_sold_ids = set(
                Sale.objects.filter(sale_date__date__gte=cutoff)
                .values_list('product_id', flat=True)
                .distinct()
            )
            dead = [
                {
                    "name": p.name,
                    "sku": p.sku,
                    "category": p.category,
                    "stock_quantity": p.stock_quantity,
                    "stock_value": round(float(p.stock_quantity or 0) * float(p.cost_price or 0), 2)
                }
                for p in active_products
                if p.id not in recently_sold_ids
            ]
            dead.sort(key=lambda x: x['stock_value'], reverse=True)
            return json.dumps({
                "success": True,
                "days_checked": days,
                "dead_stock_count": len(dead),
                "total_dead_stock_value": round(sum(p['stock_value'] for p in dead), 2),
                "products": dead[:30]
            })

        # ── TARGETS & PERFORMANCE TOOLS ─────────────────────────────────────
        elif name == "get_sales_targets":
            from screen_2_sales_items.sales_analytics.models import SalesTarget
            from sales.models import Sale
            from django.db.models import Sum
            from datetime import date
            targets = SalesTarget.objects.all().order_by('-start_date')
            result = []
            for t in targets:
                actual_qs = Sale.objects.filter(sale_date__date__gte=t.start_date, sale_date__date__lte=t.end_date)
                actual_revenue = float(actual_qs.aggregate(r=Sum('total_price'))['r'] or 0)
                actual_units = int(actual_qs.aggregate(u=Sum('quantity_sold'))['u'] or 0)
                target_amount = float(t.target_amount or 0)
                target_units = int(t.target_units or 0)
                result.append({
                    "period": t.period_type,
                    "start_date": str(t.start_date),
                    "end_date": str(t.end_date),
                    "category": t.category or "All",
                    "target_revenue": target_amount,
                    "actual_revenue": round(actual_revenue, 2),
                    "revenue_achievement_percent": round(actual_revenue / target_amount * 100, 1) if target_amount > 0 else 0,
                    "target_units": target_units,
                    "actual_units": actual_units,
                    "units_achievement_percent": round(actual_units / target_units * 100, 1) if target_units > 0 else 0,
                    "status": "On Track" if actual_revenue >= target_amount * 0.8 else "Behind Target"
                })
            return json.dumps({"success": True, "data": result})

        elif name == "get_performance_metrics":
            from screen_2_sales_items.sales_analytics.models import PerformanceMetric
            metrics = list(PerformanceMetric.objects.all().values('metric_name', 'metric_value', 'last_updated'))
            return json.dumps({
                "success": True,
                "data": [
                    {"metric": m['metric_name'], "value": m['metric_value'], "last_updated": str(m['last_updated'])}
                    for m in metrics
                ]
            })

        else:
            return f"Error: Tool '{name}' is not supported."
    except Exception as e:
        return f"Error executing tool '{name}': {str(e)}"


def parse_text_tool_call(text):
    if not text:
        return None, None
    import re
    import json
    
    normalized = text.strip()
    
    # Try pattern: <function=name>{"arg": "val"} or <function=name{"arg": "val"}
    match = re.search(r'<function=(\w+)>\s*(\{.*?\})', normalized)
    if not match:
        match = re.search(r'<function=(\w+)\s*(\{.*?\})', normalized)
    
    if match:
        name = match.group(1)
        args_str = match.group(2).strip()
        try:
            args_str = re.sub(r'</?\w+.*?>', '', args_str).strip()
            arguments = json.loads(args_str)
            return name, arguments
        except Exception:
            pass
            
    # Try pattern: <function=name> or <function=name> ... with possible JSON later
    match = re.search(r'<function=(\w+)(?:>)?', normalized)
    if match:
        name = match.group(1)
        args_match = re.search(r'\{.*?\}', normalized)
        arguments = {}
        if args_match:
            try:
                arguments = json.loads(args_match.group(0))
            except Exception:
                pass
        return name, arguments
        
    return None, None


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
        
        response_message = None
        tool_calls = None
        content = ""
        
        # Call Groq with rate-limit and bad-request fallback handling
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=CHATBOT_TOOLS,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1000,
            )
            response_message = response.choices[0].message
            tool_calls = getattr(response_message, 'tool_calls', None)
            content = response_message.content or ""
        except Exception as exc:
            err_msg = str(exc)
            failed_gen = None
            
            # Check for bad request / tool use failure (such as Llama-3 returning XML tag text)
            if 'tool_use_failed' in err_msg or 'failed_generation' in err_msg:
                try:
                    if hasattr(exc, 'body') and isinstance(exc.body, dict):
                        failed_gen = exc.body.get('error', {}).get('failed_generation')
                    else:
                        import re
                        m = re.search(r"'failed_generation':\s*'([^']+)'", err_msg)
                        if m:
                            failed_gen = m.group(1)
                except Exception:
                    pass
            
            if failed_gen:
                print(f"[Chatbot] Groq tool use failed. Intercepted failed_generation: {failed_gen}")
                content = failed_gen
                tool_calls = None
            elif '429' in err_msg or 'rate_limit' in err_msg or 'limit reached' in err_msg.lower():
                print(f"[Chatbot] Model '{model}' rate limited. Falling back to 'llama-3.1-8b-instant'...")
                model = 'llama-3.1-8b-instant'
                try:
                    response = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        tools=CHATBOT_TOOLS,
                        tool_choice="auto",
                        temperature=0.7,
                        max_tokens=1000,
                    )
                    response_message = response.choices[0].message
                    tool_calls = getattr(response_message, 'tool_calls', None)
                    content = response_message.content or ""
                except Exception as exc2:
                    err_msg2 = str(exc2)
                    failed_gen2 = None
                    if 'tool_use_failed' in err_msg2 or 'failed_generation' in err_msg2:
                        try:
                            if hasattr(exc2, 'body') and isinstance(exc2.body, dict):
                                failed_gen2 = exc2.body.get('error', {}).get('failed_generation')
                            else:
                                import re
                                m = re.search(r"'failed_generation':\s*'([^']+)'", err_msg2)
                                if m:
                                    failed_gen2 = m.group(1)
                        except Exception:
                            pass
                    if failed_gen2:
                        print(f"[Chatbot] Fallback tool use failed. Intercepted failed_generation: {failed_gen2}")
                        content = failed_gen2
                        tool_calls = None
                    else:
                        raise
            else:
                raise
                
        print('[Chatbot] Got response from Groq API')
        
        # Detect simulated/text-formatted function calls in content (e.g. from 8B model or as a fallback)
        text_tool_name, text_tool_args = None, None
        if not tool_calls:
            text_tool_name, text_tool_args = parse_text_tool_call(content)
            
        if tool_calls or text_tool_name:
            import json
            print(f'[Chatbot] LLM requested tool execution (native={bool(tool_calls)}, text={bool(text_tool_name)})')
            
            # If it was a text tool call, build mock tool calls list
            if text_tool_name:
                class MockFunction:
                    def __init__(self, name, arguments):
                        self.name = name
                        self.arguments = json.dumps(arguments)
                class MockToolCall:
                    def __init__(self, name, arguments):
                        self.id = "call_mock_" + name
                        self.type = "function"
                        self.function = MockFunction(name, arguments)
                tool_calls = [MockToolCall(text_tool_name, text_tool_args)]
                
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{
                        "id": tool_calls[0].id,
                        "type": "function",
                        "function": {
                            "name": text_tool_name,
                            "arguments": tool_calls[0].function.arguments
                        }
                    }]
                })
            else:
                messages.append(response_message)
            
            # Execute each tool and append the result
            for tool_call in tool_calls:
                tool_name = tool_call.function.name
                try:
                    tool_args = json.loads(tool_call.function.arguments) if isinstance(tool_call.function.arguments, str) else tool_call.function.arguments
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
            
            # Call Groq again to synthesize final response
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
            content = content.strip()
            
        if not content:
            raise RuntimeError('Groq returned an empty response.')
        print(f'[Chatbot] Response length: {len(content)} characters')
        return content
    
    except Exception as exc:
        print(f'[Chatbot] Error: {exc}')
        import traceback
        traceback.print_exc()
        raise RuntimeError(f'Chatbot request failed: {str(exc)}') from exc
