"""
Invoices App - URL Configuration
=================================

Invoice management endpoints for tracking client payments
"""

from django.urls import path
from . import views

app_name = 'invoices'

urlpatterns = [
    # ==================== Invoice CRUD ====================
    path('', views.invoice_list, name='invoice-list'),
    path('<int:pk>/', views.invoice_detail, name='invoice-detail'),
]

"""
API ENDPOINTS:
==============

Invoice Management:
- GET    /api/invoices/          # List all invoices
- POST   /api/invoices/          # Create new invoice
- GET    /api/invoices/<id>/     # Get specific invoice
- PUT    /api/invoices/<id>/     # Update invoice
- DELETE /api/invoices/<id>/     # Delete invoice

Integration with main urls.py:

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/invoices/', include('invoices.urls', namespace='invoices')),
]
"""
