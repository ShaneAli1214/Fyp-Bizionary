"""
Dashboard URL Configuration
============================

All dashboard API endpoints for analytics and reporting
"""

from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    # Main KPIs endpoint - Returns all primary KPIs
    path('kpis/', views.dashboard_kpis, name='kpis'),
    
    # Monthly revenue breakdown
    path('monthly-revenue/', views.monthly_revenue, name='monthly-revenue'),
    
    # Top selling products
    path('top-products/', views.top_products, name='top-products'),
    
    # Low stock alerts
    path('low-stock-products/', views.low_stock_products, name='low-stock-products'),
    
    # Recent sales transactions
    path('recent-sales/', views.recent_sales, name='recent-sales'),
    
    # Outstanding company payables (new canonical route)
    path('outstanding-payables/', views.outstanding_payables, name='outstanding-payables'),

    # Outstanding invoices (legacy alias kept for backward compatibility)
    path('outstanding-invoices/', views.outstanding_invoices, name='outstanding-invoices'),
    
    # Sales performance over time
    path('sales-performance/', views.sales_performance, name='sales-performance'),
]

"""
API ENDPOINTS:
==============

Dashboard KPIs:
- GET /api/dashboard/kpis/                    # Get all primary KPIs

Analytics:
- GET /api/dashboard/monthly-revenue/          # Get monthly revenue breakdown
- GET /api/dashboard/top-products/             # Get top selling products
- GET /api/dashboard/low-stock-products/       # Get low stock alerts
- GET /api/dashboard/recent-sales/             # Get recent sales transactions
- GET /api/dashboard/outstanding-payables/     # Get outstanding company payables
- GET /api/dashboard/outstanding-invoices/     # Legacy alias (backward compatible)
- GET /api/dashboard/sales-performance/        # Get sales performance over time
"""
