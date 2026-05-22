"""
ERP System Main URL Configuration
==================================

Root URL patterns for the entire application
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # Dashboard API endpoints
    path('api/dashboard/', include('dashboard.urls')),
    
    # Screen 2: Sales & Items Management APIs
    path('api/screen2/', include('screen_2_sales_items.urls')),
    
    # Screen 4: Accounts & Finance APIs
    path('api/accounts/', include('accounts.urls', namespace='accounts')),
    
    # Screen 5: User Management APIs
    path('api/user-management/', include('user_management.urls', namespace='user_management')),
    path('api/chatbot/', include('chatbot.urls')),
    path('api/insights/', include('insights.urls')),
    
    # Other Module APIs
    path('api/invoices/', include('invoices.urls')),
    path('api/products/', include('products.urls')),
    path('api/purchases/', include('purchases.urls')),
    path('api/sales/', include('sales.urls')),
]
