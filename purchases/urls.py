"""
Purchases App - URL Configuration
==================================

Purchase order and vendor management endpoints
"""

from django.urls import path
from . import views

app_name = 'purchases'

urlpatterns = [
    # ==================== Purchase CRUD ====================
    path('', views.purchase_list, name='purchase-list'),
    path('<int:pk>/', views.purchase_detail, name='purchase-detail'),
    path('companies/', views.company_list_create, name='company-list-create'),
    path('companies/<int:pk>/', views.company_detail_delete, name='company-detail-delete'),
    path('ordered-slips/', views.ordered_slip_list, name='ordered-slip-list'),
    path('ordered-slips/<int:pk>/', views.ordered_slip_detail, name='ordered-slip-detail'),
    path('ordered-slips/<int:pk>/mark-partial/', views.ordered_slip_mark_partial, name='ordered-slip-mark-partial'),
    path('ordered-slips/<int:pk>/mark-complete/', views.ordered_slip_mark_complete, name='ordered-slip-mark-complete'),
]

"""
API ENDPOINTS:
==============

Purchase Management:
- GET    /api/purchases/          # List all purchases
- POST   /api/purchases/          # Create new purchase
- GET    /api/purchases/<id>/     # Get specific purchase
- PUT    /api/purchases/<id>/     # Update purchase
- DELETE /api/purchases/<id>/     # Delete purchase

Ordered Slip Management:
- GET    /api/purchases/ordered-slips/                 # List all ordered slips
- POST   /api/purchases/ordered-slips/                 # Create ordered slip
- GET    /api/purchases/ordered-slips/<id>/            # Get ordered slip
- PATCH  /api/purchases/ordered-slips/<id>/            # Update ordered slip details
- POST   /api/purchases/ordered-slips/<id>/mark-partial/  # Mark partial receipt
- POST   /api/purchases/ordered-slips/<id>/mark-complete/ # Mark fully received

Integration with main urls.py:

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/purchases/', include('purchases.urls', namespace='purchases')),
]
"""
