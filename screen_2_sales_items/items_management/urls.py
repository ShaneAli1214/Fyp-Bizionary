"""
Screen 2 - Items Management URL Configuration
==============================================

Product CRUD, inventory management, and item operations
"""

from django.urls import path
from . import views

app_name = 'items_management'

urlpatterns = [
    # ==================== Product CRUD ====================
    path('products/', views.product_list_create, name='product-list-create'),
    path('products/<int:pk>/', views.product_detail, name='product-detail'),
    path('products/<int:pk>/history/', views.product_stock_history, name='product-history'),
    
    # ==================== Categories ====================
    path('categories/', views.categories_list, name='categories-list'),
    
    # ==================== Bulk Operations ====================
    path('products/bulk-update/', views.bulk_update_stock, name='bulk-update-stock'),
    
    # ==================== Search ====================
    path('products/search/suggestions/', views.product_search_suggestions, name='search-suggestions'),
]

"""
API ENDPOINTS:
==============

Product Management:
- GET    /api/screen2/items/products/               # List all products
- POST   /api/screen2/items/products/               # Create new product
- GET    /api/screen2/items/products/<id>/          # Get specific product
- PUT    /api/screen2/items/products/<id>/          # Update product
- DELETE /api/screen2/items/products/<id>/          # Delete product
- GET    /api/screen2/items/products/<id>/history/  # Get stock history

Category Management:
- GET /api/screen2/items/categories/                # List all categories

Bulk Operations:
- POST /api/screen2/items/products/bulk-update/     # Bulk update stock levels

Search:
- GET /api/screen2/items/products/search/suggestions/  # Search product suggestions
"""
