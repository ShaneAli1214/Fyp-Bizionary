"""
URL Configuration for Screen 2: Sales & Items Management

This module includes URLs from both apps:
- items_management: Product CRUD, inventory management
- sales_analytics: KPIs, performance metrics, analytics
"""
from django.urls import path, include

app_name = 'screen_2'

urlpatterns = [
    # Items Management API
    path('items/', include('screen_2_sales_items.items_management.urls')),
    
    # Sales Analytics API
    path('analytics/', include('screen_2_sales_items.sales_analytics.urls')),
]

"""
INTEGRATION WITH PROJECT URLs:
================================

In your main project urls.py (erp_system/urls.py), include:

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/screen2/', include('screen_2_sales_items.urls', namespace='screen_2')),
]

API ENDPOINTS OVERVIEW:
========================

Items Management (Base: /api/screen2/items/):
- GET    /api/screen2/items/products/                      # List all products
- POST   /api/screen2/items/products/                      # Create new product
- GET    /api/screen2/items/products/<id>/                 # Get specific product
- PUT    /api/screen2/items/products/<id>/                 # Update product
- DELETE /api/screen2/items/products/<id>/                 # Delete product
- GET    /api/screen2/items/products/<id>/history/         # Get stock history
- GET    /api/screen2/items/categories/                    # List all categories
- POST   /api/screen2/items/products/bulk-update/          # Bulk update stock
- GET    /api/screen2/items/products/search/suggestions/   # Search suggestions

Sales Analytics (Base: /api/screen2/analytics/):
- GET /api/screen2/analytics/kpis/                         # Sales KPIs
- GET /api/screen2/analytics/monthly-performance/          # Monthly performance
- GET /api/screen2/analytics/category-breakdown/           # Category breakdown
- GET /api/screen2/analytics/top-products/                 # Top products
- GET /api/screen2/analytics/trends/                       # Sales trends
- GET /api/screen2/analytics/targets/                      # Sales targets
"""
