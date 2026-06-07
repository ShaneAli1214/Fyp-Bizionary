"""
ERP System Main URL Configuration
==================================

Root URL patterns for the entire application
"""

from django.contrib import admin
from django.urls import path, include
from user_management import views as user_mgmt_views

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
    
    # Direct endpoint mappings for clean REST APIs (prompt compatibility)
    path('api/users', user_mgmt_views.user_list_view, name='direct-user-list-no-slash'),
    path('api/users/', user_mgmt_views.user_list_view, name='direct-user-list'),
    path('api/users/<int:pk>', user_mgmt_views.user_detail_view, name='direct-user-detail-no-slash'),
    path('api/users/<int:pk>/', user_mgmt_views.user_detail_view, name='direct-user-detail'),
    path('api/users/<int:pk>/status', user_mgmt_views.toggle_status_view, name='direct-user-toggle-status-no-slash'),
    path('api/users/<int:pk>/status/', user_mgmt_views.toggle_status_view, name='direct-user-toggle-status'),
    path('api/users/<int:pk>/reset-password', user_mgmt_views.reset_password_view, name='direct-user-reset-password-no-slash'),
    path('api/users/<int:pk>/reset-password/', user_mgmt_views.reset_password_view, name='direct-user-reset-password'),
    path('api/users/change-password', user_mgmt_views.change_password_view, name='direct-change-password-no-slash'),
    path('api/users/change-password/', user_mgmt_views.change_password_view, name='direct-change-password'),
    path('api/users/update-profile', user_mgmt_views.update_profile_view, name='direct-update-profile-no-slash'),
    path('api/users/update-profile/', user_mgmt_views.update_profile_view, name='direct-update-profile'),
    path('api/audit-logs', user_mgmt_views.audit_log_list_view, name='direct-audit-log-list-no-slash'),
    path('api/audit-logs/', user_mgmt_views.audit_log_list_view, name='direct-audit-log-list'),
    path('api/auth/login', user_mgmt_views.login_view, name='direct-login-no-slash'),
    path('api/auth/login/', user_mgmt_views.login_view, name='direct-login'),
    
    path('api/chatbot/', include('chatbot.urls')),
    path('api/insights/', include('insights.urls')),
    
    # Other Module APIs
    path('api/invoices/', include('invoices.urls')),
    path('api/products/', include('products.urls')),
    path('api/purchases/', include('purchases.urls')),
    path('api/sales/', include('sales.urls')),
]
