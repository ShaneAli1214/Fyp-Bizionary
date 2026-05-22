"""
Screen 5: User Management - URL Configuration
Complete API routing with 30+ endpoints for user provisioning and access control
"""

from django.urls import path
from . import views

app_name = 'user_management'

"""
============================================================================
SCREEN 5: USER MANAGEMENT API ENDPOINTS
============================================================================

BASE PATH: /api/user-management/

This module provides comprehensive user provisioning, access control, 
and security management for the ERP system.

============================================================================
KPI & ANALYTICS ENDPOINTS (7)
============================================================================

1. GET /api/user-management/kpis/
   Purpose: Get all user management KPIs
   Response: Total users, active now, admin count, pending invites, etc.
   Example: /api/user-management/kpis/

2. GET /api/user-management/users-by-role/
   Purpose: Get user distribution by role
   Response: List of roles with user counts
   Example: /api/user-management/users-by-role/

3. GET /api/user-management/users-by-department/
   Purpose: Get user distribution by department
   Response: List of departments with user counts
   Example: /api/user-management/users-by-department/

4. GET /api/user-management/permission-matrix/
   Purpose: Get permission matrix for all modules
   Response: Matrix showing CRUD permissions per module
   Example: /api/user-management/permission-matrix/

5. GET /api/user-management/recent-activity/
   Purpose: Get recent system activity
   Query Params: limit (default: 20)
   Response: List of activity logs
   Example: /api/user-management/recent-activity/?limit=50

6. GET /api/user-management/login-statistics/
   Purpose: Get user login statistics
   Response: Login stats including today's logins, never logged in, etc.
   Example: /api/user-management/login-statistics/

7. GET /api/user-management/department-summary/
   Purpose: Get department summaries with budgets and user count
   Response: Department info with user count and budget
   Example: /api/user-management/department-summary/

============================================================================
DEPARTMENT ENDPOINTS (4)
============================================================================

8. GET /api/user-management/departments/
   Purpose: Get all departments
   Response: List of all departments with user count

9. POST /api/user-management/departments/
   Purpose: Create new department
   Body: {"name": "...", "description": "...", "budget": "...", "head": "..."}
   Response: Created department object

10. GET /api/user-management/departments/<id>/
    Purpose: Get specific department details
    Response: Department details with user count

11. PUT /api/user-management/departments/<id>/
    Purpose: Update department
    Body: {"name": "...", "description": "...", "budget": "...", "head": "..."}
    Response: Updated department object

12. DELETE /api/user-management/departments/<id>/
    Purpose: Delete department
    Response: Success message

============================================================================
ROLE ENDPOINTS (4)
============================================================================

13. GET /api/user-management/roles/
    Purpose: Get all roles
    Response: List of all roles with user count

14. POST /api/user-management/roles/
    Purpose: Create new role
    Body: {"name": "...", "level": "...", "description": "..."}
    Response: Created role object

15. GET /api/user-management/roles/<id>/
    Purpose: Get specific role details
    Response: Role details with user count

16. PUT /api/user-management/roles/<id>/
    Purpose: Update role
    Body: {"name": "...", "level": "...", "description": "..."}
    Response: Updated role object

17. DELETE /api/user-management/roles/<id>/
    Purpose: Delete role
    Response: Success message

============================================================================
USER ENDPOINTS (5)
============================================================================

18. GET /api/user-management/users/
    Purpose: Get all users with optional filtering
    Query Params: status, role, department
    Response: List of users
    Example: /api/user-management/users/?status=ACTIVE&role=1&department=2

19. POST /api/user-management/users/
    Purpose: Create new user
    Body: {"username": "...", "email": "...", "password": "...", 
           "department": "...", "role": "..."}
    Response: Created user object

20. GET /api/user-management/users/<id>/
    Purpose: Get user details with permissions and activity
    Response: User details, permissions, and activity logs

21. PUT /api/user-management/users/<id>/
    Purpose: Update user
    Body: {"username": "...", "email": "...", "department": "...", ...}
    Response: Updated user object

22. DELETE /api/user-management/users/<id>/
    Purpose: Deactivate user (soft delete)
    Response: Success message

23. GET /api/user-management/users/<id>/permissions/
    Purpose: Get all permissions for a specific user
    Response: List of CRUD permissions per module

24. GET /api/user-management/users/<id>/activity/
    Purpose: Get activity logs for a specific user
    Query Params: limit (default: 20)
    Response: List of user activities
    Example: /api/user-management/users/1/activity/?limit=50

============================================================================
MODULE ENDPOINTS (4)
============================================================================

25. GET /api/user-management/modules/
    Purpose: Get all ERP modules
    Response: List of all modules

26. POST /api/user-management/modules/
    Purpose: Create new module
    Body: {"name": "...", "description": "...", "active": true}
    Response: Created module object

27. GET /api/user-management/modules/<id>/
    Purpose: Get specific module details
    Response: Module details

28. PUT /api/user-management/modules/<id>/
    Purpose: Update module
    Body: {"name": "...", "description": "...", "active": true}
    Response: Updated module object

29. DELETE /api/user-management/modules/<id>/
    Purpose: Delete module
    Response: Success message

============================================================================
PERMISSION ENDPOINTS (5)
============================================================================

30. GET /api/user-management/permissions/
    Purpose: Get all permissions with optional filtering
    Query Params: user, module
    Response: List of permissions
    Example: /api/user-management/permissions/?user=1&module=2

31. POST /api/user-management/permissions/
    Purpose: Assign permission to user
    Body: {"user": "...", "module": "...", "can_create": true, 
           "can_read": true, "can_update": true, "can_delete": true}
    Response: Permission object

32. GET /api/user-management/permissions/<id>/
    Purpose: Get specific permission details
    Response: Permission details

33. PUT /api/user-management/permissions/<id>/
    Purpose: Update permission
    Body: {"can_create": true, "can_read": true, ...}
    Response: Updated permission object

34. DELETE /api/user-management/permissions/<id>/
    Purpose: Revoke permission
    Response: Success message

============================================================================
USER INVITE ENDPOINTS (3)
============================================================================

35. GET /api/user-management/invites/
    Purpose: Get all user invitations
    Query Params: status (PENDING, ACCEPTED, EXPIRED)
    Response: List of invitations
    Example: /api/user-management/invites/?status=PENDING

36. POST /api/user-management/invites/
    Purpose: Send invitation to new user
    Body: {"email": "...", "department": "...", "role": "...", "inviter": "..."}
    Response: Invitation object with token

37. GET /api/user-management/invites/<id>/
    Purpose: Get invitation details
    Response: Invitation details including expiry time

38. DELETE /api/user-management/invites/<id>/
    Purpose: Cancel invitation
    Response: Success message

============================================================================
SECURITY ENDPOINTS (1)
============================================================================

39. GET /api/user-management/security-settings/
    Purpose: Get current security settings
    Response: Security policy configuration

40. PUT /api/user-management/security-settings/
    Purpose: Update security settings
    Body: {"min_password_length": 8, "session_timeout_minutes": 30, ...}
    Response: Updated security settings

============================================================================
INTEGRATION INSTRUCTIONS
============================================================================

To integrate user management into main erp_system/urls.py, add this line:

    path('api/user-management/', include('user_management.urls')),

In erp_system/urls.py, ensure urlpatterns includes:

    from django.contrib import admin
    from django.urls import path, include

    urlpatterns = [
        path('admin/', admin.site.urls),
        path('api/accounts/', include('accounts.urls')),
        path('api/dashboard/', include('dashboard.urls')),
        path('api/invoices/', include('invoices.urls')),
        path('api/products/', include('products.urls')),
        path('api/purchases/', include('purchases.urls')),
        path('api/sales/', include('sales.urls')),
        path('api/screen-2/', include('screen_2_sales_items.urls')),
        path('api/user-management/', include('user_management.urls')),  # Add this
    ]

============================================================================
"""

urlpatterns = [
    # ========================================================================
    # KPI & Analytics Endpoints
    # ========================================================================
    path('kpis/', views.user_management_kpi_view, name='user-management-kpis'),
    path('users-by-role/', views.users_by_role_view, name='users-by-role'),
    path('users-by-department/', views.users_by_department_view, name='users-by-department'),
    path('permission-matrix/', views.permission_matrix_view, name='permission-matrix'),
    path('recent-activity/', views.recent_activity_view, name='recent-activity'),
    path('login-statistics/', views.user_login_statistics_view, name='login-statistics'),
    path('department-summary/', views.department_summary_view, name='department-summary'),

    # ========================================================================
    # Department Endpoints
    # ========================================================================
    path('departments/', views.department_list_view, name='department-list'),
    path('departments/<int:pk>/', views.department_detail_view, name='department-detail'),

    # ========================================================================
    # Role Endpoints
    # ========================================================================
    path('roles/', views.role_list_view, name='role-list'),
    path('roles/<int:pk>/', views.role_detail_view, name='role-detail'),

    # ========================================================================
    # User Endpoints
    # ========================================================================
    path('users/', views.user_list_view, name='user-list'),
    path('users/<int:pk>/', views.user_detail_view, name='user-detail'),
    path('users/<int:user_id>/permissions/', views.user_permissions_view, name='user-permissions'),
    path('users/<int:user_id>/activity/', views.user_activity_view, name='user-activity'),

    # ========================================================================
    # Module Endpoints
    # ========================================================================
    path('modules/', views.module_list_view, name='module-list'),
    path('modules/<int:pk>/', views.module_detail_view, name='module-detail'),

    # ========================================================================
    # Permission Endpoints
    # ========================================================================
    path('permissions/', views.permission_list_view, name='permission-list'),
    path('permissions/<int:pk>/', views.permission_detail_view, name='permission-detail'),

    # ========================================================================
    # User Invite Endpoints
    # ========================================================================
    path('invites/', views.user_invite_list_view, name='invite-list'),
    path('invites/<int:pk>/', views.user_invite_detail_view, name='invite-detail'),

    # ========================================================================
    # Security Settings Endpoint
    # ========================================================================
    path('security-settings/', views.security_settings_view, name='security-settings'),
]
