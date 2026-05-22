import os
from decimal import Decimal

from groq import Groq
from django.conf import settings
from django.db.models import Sum

from sales.models import Sale


def _get_groq_api_key():
    return os.environ.get('GROQ_API_KEY', getattr(settings, 'GROQ_API_KEY', ''))


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


def build_chat_messages(user_message, history=None):
    project_context = """
SYSTEM CONTEXT - Bizionary ERP System

PROJECT OVERVIEW:
- Name: Bizionary Business Management ERP
- Stack: Django backend, React frontend, SQLite database
- Goal: A full ERP for sales, products, purchases, invoices, finance, analytics, and user management

ANSWER RULES:
- Keep answers short, simple, and direct
- Use the exact Bizionary section or API endpoint when relevant
- If the user asks for a total, KPI, revenue, count, or summary, answer with the specific dashboard/section name
- If a question is about a module, mention the matching module and endpoint
- If something is not available, say that clearly and briefly

FRONTEND SECTIONS:
- Dashboard
- Sales & Items Management
- Products
- Purchases
- Invoices
- Accounts & Finance
- Insights
- User Management
- Chatbot
- Settings

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
                'Provide clear, helpful, and accurate answers. Use 1 to 3 short sentences unless the user asks for more detail. '
                'If a question is outside your knowledge, say so honestly.'
            ),
        }
    ]

    if history:
        messages.extend(history)

    messages.append({'role': 'user', 'content': user_message})
    return messages


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
        print(f'[Chatbot] Using model: {model}')
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=300,
        )
        print('[Chatbot] Got response from Groq API')
        
        content = response.choices[0].message.content.strip()
        if not content:
            raise RuntimeError('Groq returned an empty response.')
        print(f'[Chatbot] Response length: {len(content)} characters')
        return content
    
    except Exception as exc:
        print(f'[Chatbot] Error: {exc}')
        import traceback
        traceback.print_exc()
        raise RuntimeError(f'Chatbot request failed: {str(exc)}') from exc
