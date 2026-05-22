"""
Screen 4: Accounts & Finance - URL Configuration
Namespaced URLs for accounts app APIs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_api_config import APIConfigurationViewSet

app_name = 'accounts'

# Router for API Configuration ViewSet
router = DefaultRouter()
router.register(r'api-configuration', APIConfigurationViewSet, basename='api-configuration')

urlpatterns = [
    # ==================== API Configuration ====================
    path('', include(router.urls)),
    
    # ==================== KPI Endpoints ====================
    path('kpis/', views.accounts_kpi_view, name='kpis'),
    
    # ==================== Analytics Endpoints ====================
    path('trend/', views.income_expense_trend_view, name='income-expense-trend'),
    path('recent-invoices/', views.recent_invoices_view, name='recent-invoices'),
    path('expense-categories/', views.expense_categories_view, name='expense-categories'),
    
    # ==================== Revenue CRUD ====================
    path('revenues/', views.revenue_list_create, name='revenue-list-create'),
    path('revenues/<int:pk>/', views.revenue_detail, name='revenue-detail'),
    
    # ==================== Expense CRUD ====================
    path('expenses/', views.expense_list_create, name='expense-list-create'),
    path('expenses/<int:pk>/', views.expense_detail, name='expense-detail'),
    
    # ==================== Invoice CRUD ====================
    path('invoices/', views.invoice_list_create, name='invoice-list-create'),
    path('invoices/<int:pk>/', views.invoice_detail, name='invoice-detail'),
]

"""
INTEGRATION WITH PROJECT URLs:
================================

In your main project urls.py (erp_system/urls.py), include:

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls', namespace='accounts')),
]

API ENDPOINTS:
==============

Dashboard KPIs:
- GET /api/accounts/kpis/

Analytics:
- GET /api/accounts/trend/
- GET /api/accounts/recent-invoices/
- GET /api/accounts/expense-categories/

Revenue Management:
- GET /api/accounts/revenues/          # List all revenues
- POST /api/accounts/revenues/         # Create new revenue
- GET /api/accounts/revenues/<id>/     # Get specific revenue
- PUT /api/accounts/revenues/<id>/     # Update revenue
- DELETE /api/accounts/revenues/<id>/  # Delete revenue

Expense Management:
- GET /api/accounts/expenses/          # List all expenses
- POST /api/accounts/expenses/         # Create new expense
- GET /api/accounts/expenses/<id>/     # Get specific expense
- PUT /api/accounts/expenses/<id>/     # Update expense
- DELETE /api/accounts/expenses/<id>/  # Delete expense

Invoice Management:
- GET /api/accounts/invoices/          # List all invoices
- POST /api/accounts/invoices/         # Create new invoice
- GET /api/accounts/invoices/<id>/     # Get specific invoice
- PUT /api/accounts/invoices/<id>/     # Update invoice
- DELETE /api/accounts/invoices/<id>/  # Delete invoice
"""
