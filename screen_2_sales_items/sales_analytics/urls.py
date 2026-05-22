"""
Screen 2 - Sales Analytics URL Configuration
=============================================

Sales KPIs, performance metrics, and analytics endpoints
"""

from django.urls import path
from . import views

app_name = 'sales_analytics'

urlpatterns = [
    # ==================== KPI Endpoints ====================
    path('kpis/', views.sales_kpis, name='sales-kpis'),
    
    # ==================== Analytics Endpoints ====================
    path('monthly-performance/', views.monthly_performance, name='monthly-performance'),
    path('category-breakdown/', views.category_breakdown, name='category-breakdown'),
    path('top-products/', views.top_products, name='top-products'),
    path('trends/', views.sales_trends, name='sales-trends'),
    
    # ==================== Sales Targets ====================
    path('targets/', views.sales_targets, name='sales-targets'),
]

"""
API ENDPOINTS:
==============

Dashboard KPIs:
- GET /api/screen2/analytics/kpis/                  # Get all sales KPIs

Analytics:
- GET /api/screen2/analytics/monthly-performance/    # Get monthly performance data
- GET /api/screen2/analytics/category-breakdown/     # Get sales by category
- GET /api/screen2/analytics/top-products/           # Get top selling products
- GET /api/screen2/analytics/trends/                 # Get sales trends over time

Sales Targets:
- GET /api/screen2/analytics/targets/                # Get sales targets and progress
"""
