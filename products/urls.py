"""
Products App - URL Configuration
=================================

Product catalog and inventory management endpoints
"""

from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    # ==================== Product CRUD ====================
    path('', views.product_list, name='product-list'),
    path('bulk-upload/', views.bulk_upload_products, name='bulk-upload'),
    path('<int:pk>/', views.product_detail, name='product-detail'),

    # ==================== ERP Inventory Intelligence ====================
    path('inventory-kpis/', views.inventory_kpis, name='inventory-kpis'),
    path('reorder-suggestions/', views.reorder_suggestions, name='reorder-suggestions'),
    path('<int:pk>/ledger/', views.inventory_ledger, name='inventory-ledger'),
]

"""
API ENDPOINTS:
==============

Product Management:
- GET    /api/products/          # List all products
- POST   /api/products/          # Create new product
- GET    /api/products/<id>/     # Get specific product
- PUT    /api/products/<id>/     # Update product
- PATCH  /api/products/<id>/     # Partially update product
- DELETE /api/products/<id>/     # Delete product

Integration with main urls.py:

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/products/', include('products.urls', namespace='products')),
]
"""
