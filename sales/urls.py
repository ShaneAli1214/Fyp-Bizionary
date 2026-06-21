"""
Sales App - URL Configuration
==============================

Sales transactions and order management endpoints
"""

from django.urls import path
from . import views

app_name = 'sales'

urlpatterns = [
    # ==================== Sales CRUD ====================
    path('', views.sale_list, name='sale-list'),
    path('<int:pk>/', views.sale_detail, name='sale-detail'),

    # ==================== Bulk Upload ====================
    # POST /api/sales/bulk-upload/   — JSON or CSV
    path('bulk-upload/', views.bulk_upload_sales, name='bulk-upload'),
    path('sync-excel/', views.sync_excel_sales, name='sync-excel'),

    # ==================== Sales Returns ====================
    path('returns/', views.sale_return_list, name='sale-return-list'),
    path('returns/<int:pk>/', views.sale_return_detail, name='sale-return-detail'),
]

"""
API ENDPOINTS:
==============

Sales Management:
- GET    /api/sales/          # List all sales
- POST   /api/sales/          # Create new sale
- GET    /api/sales/<id>/     # Get specific sale
- PUT    /api/sales/<id>/     # Update sale
- DELETE /api/sales/<id>/     # Delete sale

Integration with main urls.py:

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/sales/', include('sales.urls', namespace='sales')),
]
"""
