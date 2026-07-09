"""
Screen 5: User Management - API Views
REST API endpoints for user management
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.pagination import PageNumberPagination
from .models import (
    Department, Role, ERPUser, Module, Permission, 
    ActivityLog, UserInvite, SecuritySetting
)
from .serializers import (
    DepartmentSerializer, RoleSerializer, ERPUserSerializer,
    ERPUserDetailSerializer, ModuleSerializer, PermissionSerializer,
    ActivityLogSerializer, UserInviteSerializer, SecuritySettingSerializer
)
from .services import UserManagementService
from .jwt_utils import verify_jwt


def get_request_user(request):
    """
    Helper to extract user from Authorization header token (JWT)
    """
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        
        # 1. Check for standard developer mock token
        if token == 'mock-jwt-token-for-ali':
            try:
                user = ERPUser.objects.select_related('role', 'department').get(pk=1)
                if not user.is_active or user.status != 'ACTIVE':
                    return None
                if user.requires_password_change:
                    return None
                user.last_activity = timezone.now()
                user.save(update_fields=['last_activity'])
                return user
            except Exception:
                pass
        
        # 2. Check for standard JWT token
        payload = verify_jwt(token)
        if payload:
            try:
                user_id = payload.get('user_id')
                user = ERPUser.objects.select_related('role', 'department').get(pk=user_id)
                if not user.is_active or user.status != 'ACTIVE':
                    return None
                
                # Check password change required status
                is_password_change_route = request.path.endswith('/users/change-password/')
                token_scope = payload.get('scope')
                
                if user.requires_password_change:
                    # If password change is required, the token MUST have the 'password_change_required' scope
                    # and the route MUST be the change-password endpoint.
                    if token_scope != 'password_change_required' or not is_password_change_route:
                        return None
                else:
                    # If password change is NOT required, a token with 'password_change_required' scope is invalid
                    if token_scope == 'password_change_required':
                        return None

                # Check backend session status if present in payload
                jti = payload.get('jti')
                # Only check session table if it's not a password change flow token (which has no session row yet)
                if jti and token_scope != 'password_change_required':
                    from .models import UserSession
                    session_exists = UserSession.objects.filter(session_key=jti, is_active=True).exists()
                    if not session_exists:
                        return None
                
                # Attach token payload to request for downstream views to inspect
                request.token_payload = payload
                
                user.last_activity = timezone.now()
                user.save(update_fields=['last_activity'])
                return user
            except Exception:
                pass

        # 3. Fallback for legacy tokens (during transition)
        if token.startswith('erp-token-'):
            try:
                parts = token.split('-')
                if len(parts) >= 3:
                    user_id = int(parts[2])
                    user = ERPUser.objects.select_related('role', 'department').get(pk=user_id)
                    if not user.is_active or user.status != 'ACTIVE':
                        return None
                    if user.requires_password_change:
                        return None
                    user.last_activity = timezone.now()
                    user.save(update_fields=['last_activity'])
                    return user
            except Exception:
                pass
    return None


# ============================================================================
# KPI and Analytics Endpoints
# ============================================================================

@api_view(['GET'])
def user_management_kpi_view(request):
    """
    GET: Get all user management KPIs
    Returns: Total users, active now, admin count, pending invites, etc.
    """
    try:
        kpis = UserManagementService.kpi_summary()
        return Response({
            'success': True,
            'data': kpis
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def users_by_role_view(request):
    """
    GET: Get user count distribution by role
    Returns: List of roles with user counts
    """
    try:
        role_distribution = UserManagementService.users_by_role()
        return Response({
            'success': True,
            'data': role_distribution
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def users_by_department_view(request):
    """
    GET: Get user count distribution by department
    Returns: List of departments with user counts
    """
    try:
        dept_distribution = UserManagementService.users_by_department()
        return Response({
            'success': True,
            'data': dept_distribution
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def permission_matrix_view(request):
    """
    GET: Get permission matrix for all modules and roles
    Returns: Matrix showing CRUD permissions per module
    """
    try:
        matrix = UserManagementService.permission_matrix()
        return Response({
            'success': True,
            'data': matrix
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def recent_activity_view(request):
    """
    GET: Get recent activity logs
    Query params: limit (default: 20)
    Returns: List of activity logs
    """
    try:
        limit = request.query_params.get('limit', 20)
        activity_logs = UserManagementService.recent_activity_logs(limit=int(limit))
        serializer = ActivityLogSerializer(activity_logs, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def user_login_statistics_view(request):
    """
    GET: Get user login statistics
    Returns: Login stats including today's logins, never logged in, etc.
    """
    try:
        stats = UserManagementService.user_login_statistics()
        return Response({
            'success': True,
            'data': stats
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def department_summary_view(request):
    """
    GET: Get summary for all departments
    Returns: Department info with user count and budget
    """
    try:
        summary = UserManagementService.department_summary()
        return Response({
            'success': True,
            'data': summary
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Department CRUD Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
def department_list_view(request):
    """
    GET: Get all departments
    POST: Create new department
    """
    if request.method == 'GET':
        departments = Department.objects.all()
        serializer = DepartmentSerializer(departments, many=True)
        return Response({
            'success': True,
            'count': departments.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = DepartmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Department created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def department_detail_view(request, pk):
    """
    GET: Get department details
    PUT: Update department
    DELETE: Delete department
    """
    department = get_object_or_404(Department, pk=pk)

    if request.method == 'GET':
        serializer = DepartmentSerializer(department)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        serializer = DepartmentSerializer(department, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Department updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        department.delete()
        return Response({
            'success': True,
            'message': 'Department deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Role CRUD Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
def role_list_view(request):
    """
    GET: Get all roles
    POST: Create new role
    """
    if request.method == 'GET':
        roles = Role.objects.all()
        serializer = RoleSerializer(roles, many=True)
        return Response({
            'success': True,
            'count': roles.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = RoleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Role created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def role_detail_view(request, pk):
    """
    GET: Get role details
    PUT: Update role
    DELETE: Delete role
    """
    role = get_object_or_404(Role, pk=pk)

    if request.method == 'GET':
        serializer = RoleSerializer(role)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        serializer = RoleSerializer(role, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Role updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        role.delete()
        return Response({
            'success': True,
            'message': 'Role deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# User CRUD Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
def user_list_view(request):
    """
    GET: Get all users with optional filters, search, and pagination
    POST: Create new user (enforce admin role)
    """
    if request.method == 'GET':
        users = ERPUser.objects.select_related('role', 'department').all()

        # Apply search by name or email
        search_query = request.query_params.get('search')
        if search_query:
            users = users.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(username__icontains=search_query)
            )

        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            users = users.filter(status=status_filter)

        role_filter = request.query_params.get('role')
        if role_filter:
            users = users.filter(role_id=role_filter)

        dept_filter = request.query_params.get('department')
        if dept_filter:
            users = users.filter(department_id=dept_filter)

        # Server-side pagination
        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get('limit', request.query_params.get('page_size', 10)))
        
        try:
            paginated_users = paginator.paginate_queryset(users, request)
            serializer = ERPUserSerializer(paginated_users, many=True)
            return Response({
                'success': True,
                'count': users.count(),
                'total_pages': paginator.page.paginator.num_pages,
                'current_page': paginator.page.number,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception:
            serializer = ERPUserSerializer(users, many=True)
            return Response({
                'success': True,
                'count': users.count(),
                'total_pages': 1,
                'current_page': 1,
                'data': serializer.data
            }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        # Enforce that only Admin (or any user if database is empty) can create users
        if ERPUser.objects.filter(role__level='ADMIN').exists():
            requesting_user = get_request_user(request)
            if not requesting_user or requesting_user.role.level != 'ADMIN':
                return Response({
                    'success': False,
                    'error': 'Permission Denied. Only an Admin can create new users.'
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            requesting_user = None

        serializer = ERPUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Log audit activity
            creator_name = requesting_user.username if requesting_user else "System Setup"
            ActivityLog.objects.create(
                user=user if not requesting_user else requesting_user,
                action='CREATE',
                module='User Management',
                description=f"User {user.username} (Employee ID: {user.employee_id}) created by {creator_name}."
            )
            
            return Response({
                'success': True,
                'message': 'User created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def user_detail_view(request, pk):
    """
    GET: Get user details with permissions and activity
    PUT: Update user (enforce admin role)
    DELETE: Deactivate user (soft delete, enforce admin role)
    """
    user = get_object_or_404(ERPUser, pk=pk)

    if request.method == 'GET':
        serializer = ERPUserDetailSerializer(user)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        requesting_user = get_request_user(request)
        if not requesting_user or requesting_user.role.level != 'ADMIN':
            return Response({
                'success': False,
                'error': 'Permission Denied. Only an Admin can modify user accounts.'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = ERPUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Log audit activity
            ActivityLog.objects.create(
                user=requesting_user,
                action='UPDATE',
                module='User Management',
                description=f"Updated details of user {user.username}."
            )
            
            return Response({
                'success': True,
                'message': 'User updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        requesting_user = get_request_user(request)
        if not requesting_user or requesting_user.role.level != 'ADMIN':
            return Response({
                'success': False,
                'error': 'Permission Denied. Only an Admin can deactivate users.'
            }, status=status.HTTP_403_FORBIDDEN)

        user.status = 'INACTIVE'
        user.is_active = False
        user.save()
        
        # Log audit activity
        ActivityLog.objects.create(
            user=requesting_user,
            action='DELETE',
            module='User Management',
            description=f"Deactivated user {user.username}."
        )
        
        return Response({
            'success': True,
            'message': 'User deactivated successfully'
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
def user_permissions_view(request, user_id):
    """
    GET: Get all permissions for a specific user
    """
    try:
        permissions = UserManagementService.get_user_permissions(user_id)
        return Response({
            'success': True,
            'data': permissions
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def user_activity_view(request, user_id):
    """
    GET: Get activity logs for a specific user
    Query params: limit (default: 20)
    """
    try:
        limit = request.query_params.get('limit', 20)
        activity_logs = UserManagementService.get_user_activity(user_id, limit=int(limit))
        serializer = ActivityLogSerializer(activity_logs, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Module CRUD Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
def module_list_view(request):
    """
    GET: Get all modules
    POST: Create new module
    """
    if request.method == 'GET':
        modules = Module.objects.all()
        serializer = ModuleSerializer(modules, many=True)
        return Response({
            'success': True,
            'count': modules.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = ModuleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Module created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def module_detail_view(request, pk):
    """
    GET: Get module details
    PUT: Update module
    DELETE: Delete module
    """
    module = get_object_or_404(Module, pk=pk)

    if request.method == 'GET':
        serializer = ModuleSerializer(module)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        serializer = ModuleSerializer(module, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Module updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        module.delete()
        return Response({
            'success': True,
            'message': 'Module deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Permission Management Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
def permission_list_view(request):
    """
    GET: Get all permissions
    POST: Assign permission to user
    Query params: user, module
    """
    if request.method == 'GET':
        permissions = Permission.objects.all()

        user_filter = request.query_params.get('user')
        if user_filter:
            permissions = permissions.filter(user_id=user_filter)

        module_filter = request.query_params.get('module')
        if module_filter:
            permissions = permissions.filter(module_id=module_filter)

        serializer = PermissionSerializer(permissions, many=True)
        return Response({
            'success': True,
            'count': permissions.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = PermissionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Permission assigned successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def permission_detail_view(request, pk):
    """
    GET: Get permission details
    PUT: Update permission
    DELETE: Revoke permission
    """
    permission = get_object_or_404(Permission, pk=pk)

    if request.method == 'GET':
        serializer = PermissionSerializer(permission)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        serializer = PermissionSerializer(permission, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Permission updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        permission.delete()
        return Response({
            'success': True,
            'message': 'Permission revoked successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# User Invite Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
def user_invite_list_view(request):
    """
    GET: Get all user invitations
    POST: Create new user invitation
    Query params: status
    """
    if request.method == 'GET':
        invites = UserInvite.objects.all()

        status_filter = request.query_params.get('status')
        if status_filter:
            invites = invites.filter(status=status_filter)

        serializer = UserInviteSerializer(invites, many=True)
        return Response({
            'success': True,
            'count': invites.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = UserInviteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Invitation sent successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
def user_invite_detail_view(request, pk):
    """
    GET: Get invitation details
    DELETE: Cancel invitation
    """
    invite = get_object_or_404(UserInvite, pk=pk)

    if request.method == 'GET':
        serializer = UserInviteSerializer(invite)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'DELETE':
        invite.delete()
        return Response({
            'success': True,
            'message': 'Invitation cancelled successfully'
        }, status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Security Settings Endpoint
# ============================================================================

@api_view(['GET', 'PUT'])
def security_settings_view(request):
    """
    GET: Get current security settings
    PUT: Update security settings
    """
    setting = SecuritySetting.objects.first()

    if request.method == 'GET':
        serializer = SecuritySettingSerializer(setting)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        serializer = SecuritySettingSerializer(setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Security settings updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# Authentication View
# ============================================================================

# Helper functions for request client details
def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_client_device(request):
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    if 'Windows' in user_agent:
        device = 'Chrome on Windows' if 'Chrome' in user_agent else 'Firefox on Windows'
    elif 'iPhone' in user_agent or 'iPad' in user_agent:
        device = 'Safari on iOS'
    elif 'Android' in user_agent:
        device = 'Chrome on Android'
    elif 'Macintosh' in user_agent:
        device = 'Safari on macOS'
    else:
        device = 'Unknown Browser / Device'
    return device


@api_view(['POST'])
def login_view(request):
    """
    POST: Authenticate user using email and password.
    Returns access token, user info and sets refresh cookie.
    If 2FA is enabled, returns intermediate status.
    """
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'success': False,
            'error': 'Please provide both email and password.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        from django.db.models import Q
        user = ERPUser.objects.select_related('role', 'department').get(Q(email=email) | Q(username=email))
    except ERPUser.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Invalid email or password.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    if user.status == 'SUSPENDED':
        return Response({
            'success': False,
            'error': 'Your account has been suspended. Please contact support.'
        }, status=status.HTTP_403_FORBIDDEN)
        
    if user.status == 'INACTIVE':
        return Response({
            'success': False,
            'error': 'Your account is inactive. Please contact support.'
        }, status=status.HTTP_403_FORBIDDEN)
        
    if check_password(password, user.password_hash):
        # Update user login count and last login timestamp atomically
        from django.db.models import F
        user.login_count = F('login_count') + 1
        user.last_login = timezone.now()
        user.last_activity = timezone.now()
        user.save(update_fields=['login_count', 'last_login', 'last_activity'])
        user.refresh_from_db(fields=['login_count'])
        
        # Log login activity
        ActivityLog.objects.create(
            user=user,
            action='LOGIN',
            description=f"User {user.username} authenticated successfully.",
            status='SUCCESS'
        )
        
        # Intercept onboarding user needing forced password change
        if user.requires_password_change:
            from .jwt_utils import generate_jwt
            temp_token = generate_jwt({
                'user_id': user.id,
                'username': user.username,
                'scope': 'password_change_required'
            }, expires_in=600)  # 10 minutes short-lived token
            
            return Response({
                'success': True,
                'password_change_required': True,
                'token': temp_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role_name': user.role.name if user.role else 'No Role',
                    'role_level': user.role.level if user.role else 'STAFF',
                    'department_name': user.department.name if user.department else 'No Department',
                }
            }, status=status.HTTP_200_OK)
        
        # Check if 2FA is active
        if user.two_factor_enabled:
            # Generate intermediate MFA token (lasts 5 mins)
            from .jwt_utils import generate_jwt
            mfa_token = generate_jwt({
                'user_id': user.id,
                'action': 'mfa_verify'
            }, expires_in=300)
            
            return Response({
                'success': True,
                'two_factor_required': True,
                'mfa_token': mfa_token
            }, status=status.HTTP_200_OK)
            
        # Standard login flow
        from .jwt_utils import generate_auth_tokens
        device = get_client_device(request)
        ip = get_client_ip(request)
        
        access_token, refresh_token = generate_auth_tokens(
            user=user,
            device_name=device,
            ip_address=ip,
            location='Sheikhupura, PK'
        )
        
        response = Response({
            'success': True,
            'token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role_name': user.role.name if user.role else 'No Role',
                'role_level': user.role.level if user.role else 'STAFF',
                'department_name': user.department.name if user.department else 'No Department',
            }
        }, status=status.HTTP_200_OK)
        
        from django.conf import settings
        is_prod = not settings.DEBUG
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=is_prod,
            samesite='None' if is_prod else 'Lax',
            max_age=604800
        )
        return response
    else:
        # Log failed login activity
        ActivityLog.objects.create(
            user=user,
            action='LOGIN',
            description=f"Failed login attempt for user {user.username}.",
            status='FAILURE'
        )
        return Response({
            'success': False,
            'error': 'Invalid email or password.'
        }, status=status.HTTP_400_BAD_REQUEST)



# ============================================================================
# Status Toggle, Reset Password & Audit Log Endpoints
# ============================================================================

@api_view(['PATCH'])
def toggle_status_view(request, pk):
    """
    PATCH: Toggle status between Active, Inactive, Suspended
    """
    requesting_user = get_request_user(request)
    if not requesting_user or requesting_user.role.level != 'ADMIN':
        return Response({
            'success': False,
            'error': 'Permission Denied. Only an Admin can change user status.'
        }, status=status.HTTP_403_FORBIDDEN)
        
    user = get_object_or_404(ERPUser, pk=pk)
    new_status = request.data.get('status')
    if not new_status or new_status not in ['ACTIVE', 'INACTIVE', 'SUSPENDED']:
        return Response({
            'success': False,
            'error': 'Invalid status value. Must be ACTIVE, INACTIVE, or SUSPENDED.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    old_status = user.status
    user.status = new_status
    if new_status == 'INACTIVE' or new_status == 'SUSPENDED':
        user.is_active = False
    else:
        user.is_active = True
    user.save()
    
    # Log audit activity
    ActivityLog.objects.create(
        user=requesting_user,
        action='UPDATE',
        module='User Management',
        description=f"Changed status of user {user.username} from {old_status} to {new_status}."
    )
    
    return Response({
        'success': True,
        'message': f"User status updated to {new_status} successfully.",
        'data': ERPUserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def reset_password_view(request, pk):
    """
    POST: Reset user password (Admin-initiated)
    """
    requesting_user = get_request_user(request)
    if not requesting_user or requesting_user.role.level != 'ADMIN':
        return Response({
            'success': False,
            'error': 'Permission Denied. Only an Admin can reset user passwords.'
        }, status=status.HTTP_403_FORBIDDEN)
        
    user = get_object_or_404(ERPUser, pk=pk)
    new_password = request.data.get('password')
    
    if not new_password:
        import secrets
        new_password = secrets.token_urlsafe(10)
        auto_generated = True
    else:
        if len(new_password) < 8:
            return Response({
                'success': False,
                'error': 'Password must be at least 8 characters long.'
            }, status=status.HTTP_400_BAD_REQUEST)
        auto_generated = False
        
    user.password_hash = make_password(new_password)
    user.password_changed_at = timezone.now()
    user.save()
    
    # Log audit activity
    ActivityLog.objects.create(
        user=requesting_user,
        action='PASSWORD_CHANGE',
        module='User Management',
        description=f"Reset password for user {user.username}."
    )
    
    return Response({
        'success': True,
        'message': 'Password reset successfully.',
        'password': new_password if auto_generated else None,
        'auto_generated': auto_generated
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def audit_log_list_view(request):
    """
    GET: List all user management activity logs / audit logs
    """
    requesting_user = get_request_user(request)
    if not requesting_user or requesting_user.role.level != 'ADMIN':
        return Response({
            'success': False,
            'error': 'Permission Denied. Only an Admin can view audit logs.'
        }, status=status.HTTP_403_FORBIDDEN)
        
    logs = ActivityLog.objects.select_related('user').order_by('-timestamp')
    
    # Apply search query
    search_query = request.query_params.get('search')
    if search_query:
        logs = logs.filter(
            Q(user__username__icontains=search_query) |
            Q(user__email__icontains=search_query) |
            Q(description__icontains=search_query)
        )
        
    # Apply action category filter
    action_filter = request.query_params.get('action')
    if action_filter:
        logs = logs.filter(action=action_filter)
    
    # Optional pagination
    paginator = PageNumberPagination()
    paginator.page_size = int(request.query_params.get('limit', 20))
    
    try:
        paginated_logs = paginator.paginate_queryset(logs, request)
        serializer = ActivityLogSerializer(paginated_logs, many=True)
        return Response({
            'success': True,
            'count': logs.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception:
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({
            'success': True,
            'count': logs.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
def change_password_view(request):
    """
    POST: Authenticated user changing their own password.
    Request body: current_password, new_password
    """
    user = get_request_user(request)
    if not user:
        return Response({
            'success': False,
            'error': 'Authentication credentials were not provided.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    payload = getattr(request, 'token_payload', None)
    is_force_change = payload and payload.get('scope') == 'password_change_required'
    
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not is_force_change:
        if not current_password or not new_password:
            return Response({
                'success': False,
                'error': 'Please provide both current_password and new_password.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if not check_password(current_password, user.password_hash):
            return Response({
                'success': False,
                'error': 'Incorrect current password.'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        if not new_password:
            return Response({
                'success': False,
                'error': 'Please provide new_password.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    if len(new_password) < 8:
        return Response({
            'success': False,
            'error': 'New password must be at least 8 characters long.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    # Alphanumeric check
    import re
    if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$', new_password):
        return Response({
            'success': False,
            'error': 'Password must be alphanumeric (contain at least one letter and one number).'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    user.password_hash = make_password(new_password)
    user.password_changed_at = timezone.now()
    
    if is_force_change:
        user.requires_password_change = False
        
    user.save()
    
    # Invalidate active sessions to enforce fresh login after password reset
    from .models import UserSession
    UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
    
    # Log password change
    ActivityLog.objects.create(
        user=user,
        action='UPDATE',
        module='Account Settings',
        description=f"User {user.username} changed their password{' (forced onboarding reset)' if is_force_change else ''}."
    )
    
    return Response({
        'success': True,
        'message': 'Password changed successfully.'
    }, status=status.HTTP_200_OK)


@api_view(['PUT'])
def update_profile_view(request):
    """
    PUT: Authenticated user updating their own profile.
    Request body: first_name, last_name, email
    """
    user = get_request_user(request)
    if not user:
        return Response({
            'success': False,
            'error': 'Authentication credentials were not provided.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    email = request.data.get('email')
    
    if not first_name or not email:
        return Response({
            'success': False,
            'error': 'First name and email are required fields.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    # Check email uniqueness for other users
    if ERPUser.objects.filter(email=email).exclude(pk=user.pk).exists():
        return Response({
            'success': False,
            'error': 'A user with this email already exists.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    user.first_name = first_name.strip()
    if last_name is not None:
        user.last_name = last_name.strip()
    user.email = email.strip()
    user.save()
    
    # Log update activity
    ActivityLog.objects.create(
        user=user,
        action='UPDATE',
        module='Account Settings',
        description=f"User {user.username} updated their own profile information."
    )
    
    return Response({
        'success': True,
        'message': 'Profile updated successfully.',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role_name': user.role.name if user.role else 'No Role',
            'role_level': user.role.level if user.role else 'STAFF',
            'department_name': user.department.name if user.department else 'No Department',
        }
    }, status=status.HTTP_200_OK)


# ============================================================================
# Token Refresh & Sign Out Views
# ============================================================================

@api_view(['POST'])
def refresh_token_view(request):
    """
    POST: Refresh access token using HttpOnly refresh cookie.
    """
    refresh_token = request.COOKIES.get('refresh_token')
    if not refresh_token:
        return Response({
            'success': False,
            'error': 'Refresh token not found.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    from .jwt_utils import verify_jwt
    payload = verify_jwt(refresh_token)
    if not payload or payload.get('token_type') != 'refresh':
        return Response({
            'success': False,
            'error': 'Invalid or expired refresh token.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    jti = payload.get('jti')
    user_id = payload.get('user_id')
    
    from .models import UserSession
    try:
        session = UserSession.objects.get(session_key=jti, is_active=True)
    except UserSession.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Session has been revoked or is inactive.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    user = session.user
    if user.status != 'ACTIVE' or not user.is_active:
        return Response({
            'success': False,
            'error': 'User account is not active.'
        }, status=status.HTTP_403_FORBIDDEN)
        
    session.last_activity = timezone.now()
    session.save(update_fields=['last_activity'])
    
    from .jwt_utils import generate_jwt
    access_payload = {
        'user_id': user.id,
        'username': user.username,
        'jti': jti,
        'token_type': 'access'
    }
    access_token = generate_jwt(access_payload, expires_in=900)
    
    return Response({
        'success': True,
        'token': access_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role_name': user.role.name if user.role else 'No Role',
            'role_level': user.role.level if user.role else 'STAFF',
            'department_name': user.department.name if user.department else 'No Department',
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def logout_view(request):
    """
    POST: Revoke current session and clear refresh cookie.
    """
    refresh_token = request.COOKIES.get('refresh_token')
    if refresh_token:
        from .jwt_utils import verify_jwt
        payload = verify_jwt(refresh_token)
        if payload:
            jti = payload.get('jti')
            from .models import UserSession
            UserSession.objects.filter(session_key=jti).update(is_active=False)
            
            try:
                user = ERPUser.objects.get(pk=payload.get('user_id'))
                ActivityLog.objects.create(
                    user=user,
                    action='LOGOUT',
                    description=f"User {user.username} logged out.",
                    status='SUCCESS'
                )
            except Exception:
                pass
                
    response = Response({
        'success': True,
        'message': 'Logged out successfully.'
    }, status=status.HTTP_200_OK)
    
    from django.conf import settings
    is_prod = not settings.DEBUG
    response.delete_cookie(
        'refresh_token',
        samesite='None' if is_prod else 'Lax',
        secure=is_prod
    )
    return response


# ============================================================================
# Two-Factor Authentication (2FA) Views
# ============================================================================

@api_view(['GET', 'POST'])
def mfa_setup_view(request):
    """
    GET: Generate a new TOTP secret and provisioning URI.
    POST: Enable TOTP after verifying the first client code.
    """
    user = get_request_user(request)
    if not user:
        return Response({
            'success': False,
            'error': 'Authentication credentials were not provided.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    import pyotp
    
    if request.method == 'GET':
        temp_secret = pyotp.random_base32()
        provisioning_uri = pyotp.totp.TOTP(temp_secret).provisioning_uri(
            name=user.email,
            issuer_name="Bizionary ERP"
        )
        return Response({
            'success': True,
            'secret': temp_secret,
            'provisioning_uri': provisioning_uri
        }, status=status.HTTP_200_OK)
        
    elif request.method == 'POST':
        secret = request.data.get('secret')
        code = request.data.get('code')
        
        if not secret or not code:
            return Response({
                'success': False,
                'error': 'Secret key and verification code are required.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        totp = pyotp.TOTP(secret)
        if totp.verify(code):
            user.two_factor_secret = secret
            user.two_factor_enabled = True
            user.save(update_fields=['two_factor_secret', 'two_factor_enabled'])
            
            ActivityLog.objects.create(
                user=user,
                action='2FA_ENABLE',
                description="Enabled Two-Factor Authentication.",
                status='SUCCESS'
            )
            return Response({
                'success': True,
                'message': 'Two-factor authentication successfully enabled!'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': 'Invalid verification code. Please check and try again.'
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def mfa_disable_view(request):
    """
    POST: Disable two-factor authentication.
    """
    user = get_request_user(request)
    if not user:
        return Response({
            'success': False,
            'error': 'Authentication credentials were not provided.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    user.two_factor_enabled = False
    user.two_factor_secret = None
    user.save(update_fields=['two_factor_enabled', 'two_factor_secret'])
    
    ActivityLog.objects.create(
        user=user,
        action='2FA_DISABLE',
        description="Disabled Two-Factor Authentication.",
        status='SUCCESS'
    )
    return Response({
        'success': True,
        'message': 'Two-factor authentication disabled successfully.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def verify_2fa_login_view(request):
    """
    POST: Authenticate with a 2FA intermediate token and code.
    """
    mfa_token = request.data.get('mfa_token')
    code = request.data.get('code')
    
    if not mfa_token or not code:
        return Response({
            'success': False,
            'error': 'Please provide both mfa_token and verification code.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    from .jwt_utils import verify_jwt
    payload = verify_jwt(mfa_token)
    if not payload or payload.get('action') != 'mfa_verify':
        return Response({
            'success': False,
            'error': 'Invalid or expired MFA token.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    user_id = payload.get('user_id')
    user = get_object_or_404(ERPUser, pk=user_id)
    
    if user.status != 'ACTIVE' or not user.is_active:
        return Response({
            'success': False,
            'error': 'User account is not active.'
        }, status=status.HTTP_403_FORBIDDEN)
        
    if not user.two_factor_secret:
        return Response({
            'success': False,
            'error': 'MFA secret is not configured for this user.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    import pyotp
    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(code):
        from .jwt_utils import generate_auth_tokens
        device = get_client_device(request)
        ip = get_client_ip(request)
        
        access_token, refresh_token = generate_auth_tokens(
            user=user,
            device_name=device,
            ip_address=ip,
            location='Sheikhupura, PK'
        )
        
        response = Response({
            'success': True,
            'token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role_name': user.role.name if user.role else 'No Role',
                'role_level': user.role.level if user.role else 'STAFF',
                'department_name': user.department.name if user.department else 'No Department',
            }
        }, status=status.HTTP_200_OK)
        
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=604800
        )
        return response
    else:
        ActivityLog.objects.create(
            user=user,
            action='LOGIN',
            description=f"Failed 2FA verification code entry for user {user.username}.",
            status='FAILURE'
        )
        return Response({
            'success': False,
            'error': 'Invalid verification code.'
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# Device Session Management Views
# ============================================================================

@api_view(['GET'])
def sessions_list_view(request):
    """
    GET: List all active sessions for the current logged-in user.
    """
    user = get_request_user(request)
    if not user:
        return Response({
            'success': False,
            'error': 'Authentication credentials were not provided.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    auth_header = request.headers.get('Authorization')
    current_jti = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        from .jwt_utils import verify_jwt
        payload = verify_jwt(token)
        if payload:
            current_jti = payload.get('jti')
            
    from .models import UserSession
    active_sessions = UserSession.objects.filter(user=user, is_active=True).order_by('-last_activity')
    
    data = []
    for s in active_sessions:
        time_diff = timezone.now() - s.last_activity
        if time_diff.total_seconds() < 60:
            last_active_str = "Active Now"
        elif time_diff.total_seconds() < 3600:
            last_active_str = f"Last active {int(time_diff.total_seconds() // 60)} mins ago"
        else:
            last_active_str = f"Last active {int(time_diff.total_seconds() // 3600)} hrs ago"
            
        data.append({
            'id': s.id,
            'device': s.device,
            'ip': s.ip_address or 'Unknown IP',
            'location': s.location,
            'isCurrent': s.session_key == current_jti,
            'lastActive': last_active_str
        })
        
    return Response({
        'success': True,
        'data': data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def revoke_session_view(request, pk):
    """
    POST: Revoke a specific session by ID.
    """
    user = get_request_user(request)
    if not user:
        return Response({
            'success': False,
            'error': 'Authentication credentials were not provided.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    from .models import UserSession
    session = get_object_or_404(UserSession, pk=pk, user=user)
    session.is_active = False
    session.save(update_fields=['is_active'])
    
    return Response({
        'success': True,
        'message': 'Session revoked successfully.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def revoke_other_sessions_view(request):
    """
    POST: Revoke all other active sessions except the current one.
    """
    user = get_request_user(request)
    if not user:
        return Response({
            'success': False,
            'error': 'Authentication credentials were not provided.'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    auth_header = request.headers.get('Authorization')
    current_jti = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        from .jwt_utils import verify_jwt
        payload = verify_jwt(token)
        if payload:
            current_jti = payload.get('jti')
            
    if not current_jti:
        return Response({
            'success': False,
            'error': 'Could not identify current session.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    from .models import UserSession
    UserSession.objects.filter(user=user, is_active=True).exclude(session_key=current_jti).update(is_active=False)
    
    return Response({
        'success': True,
        'message': 'Logged out of all other active sessions successfully.'
    }, status=status.HTTP_200_OK)


# ============================================================================
# Self-Service Password Reset Views (Token & Email Flow)
# ============================================================================

@api_view(['POST'])
def forgot_password_view(request):
    """
    POST: Request a password reset link by email.
    """
    email = request.data.get('email')
    if not email:
        return Response({
            'success': False,
            'error': 'Please provide email.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = ERPUser.objects.get(email=email)
    except ERPUser.DoesNotExist:
        # Avoid user enumeration by returning generic success even if user not found
        return Response({
            'success': True,
            'message': 'Password reset link sent successfully.'
        }, status=status.HTTP_200_OK)
        
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_encode
    from django.utils.encoding import force_bytes
    from django.core.mail import send_mail
    from django.conf import settings
    
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    frontend_host = request.META.get('HTTP_ORIGIN', 'http://localhost:5173')
    reset_link = f"{frontend_host}/reset-password?uid={uid}&token={token}"
    
    subject = "Bizionary ERP Password Reset Request"
    message = f"Hello {user.first_name},\n\nYou requested a password reset for your Bizionary ERP account. Please click the link below to verify and reset your credentials:\n\n{reset_link}\n\nIf you did not request this, please ignore this email.\n\nBest,\nBizionary Operations"
    
    email_backend = getattr(settings, 'EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
    if not getattr(settings, 'EMAIL_HOST_PASSWORD', '') and 'console' not in email_backend:
        email_backend_path = 'django.core.mail.backends.console.EmailBackend'
    else:
        email_backend_path = email_backend
        
    from django.core.mail import get_connection
    connection = get_connection(backend=email_backend_path)
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            connection=connection
        )
        
        # Log event
        ActivityLog.objects.create(
            user=user,
            action='OTHER',
            description=f"User {user.username} requested a self-service password reset link.",
            status='SUCCESS'
        )
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Failed to send password reset email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    return Response({
        'success': True,
        'message': 'Password reset link sent successfully.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def reset_password_confirm_view(request):
    """
    POST: Complete self-service password reset using token.
    """
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    if not uid or not token or not new_password:
        return Response({
            'success': False,
            'error': 'UID, Token and New Password are required.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    if len(new_password) < 8:
        return Response({
            'success': False,
            'error': 'Password must be at least 8 characters long.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    import re
    if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$', new_password):
        return Response({
            'success': False,
            'error': 'Password must be alphanumeric (contain at least one letter and one number).'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    from django.utils.http import urlsafe_base64_decode
    from django.contrib.auth.tokens import default_token_generator
    
    try:
        uid_decoded = urlsafe_base64_decode(uid).decode()
        user = ERPUser.objects.get(pk=uid_decoded)
    except Exception:
        return Response({
            'success': False,
            'error': 'Invalid reset token or UID parameter.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    if default_token_generator.check_token(user, token):
        user.password_hash = make_password(new_password)
        user.password_changed_at = timezone.now()
        user.save(update_fields=['password', 'password_changed_at'])
        
        # Invalidate active sessions to enforce fresh login after password reset
        from .models import UserSession
        UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
        
        ActivityLog.objects.create(
            user=user,
            action='PASSWORD_CHANGE',
            description=f"User {user.username} reset their password via token email verification.",
            status='SUCCESS'
        )
        return Response({
            'success': True,
            'message': 'Password has been reset successfully.'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'success': False,
            'error': 'Invalid or expired reset token.'
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# Phase 3.0 — Audit Trail: Core Utility + Admin Read Endpoint
# ============================================================================

def log_action(request, action, description, module=None, status_result='SUCCESS'):
    """
    Centralized audit logging utility.
    Call this from any view after a significant action.

    Usage:
        from user_management.views import log_action
        log_action(request, 'CREATE', 'Product SKU-001 created.', module='Products')

    Args:
        request       : The DRF request object (used to extract user, IP, agent)
        action        : One of the ActivityLog.ACTION_CHOICES keys (e.g. 'CREATE', 'DELETE')
        description   : Human-readable description of what happened
        module        : The ERP module name string (e.g. 'Products', 'Sales', 'Accounts')
        status_result : 'SUCCESS' or 'FAILURE'
    """
    try:
        user = get_request_user(request)
        if not user:
            return  # Do not log unauthenticated ghost actions

        ip = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        ActivityLog.objects.create(
            user=user,
            action=action,
            module=module or '',
            description=description,
            ip_address=ip,
            user_agent=user_agent[:500] if user_agent else '',
            status=status_result,
        )
    except Exception:
        # Never let audit logging crash the calling view
        pass


@api_view(['GET'])
def audit_log_list_view(request):
    """
    GET /api/audit-logs/
    Returns paginated, filterable audit log entries. Admin-only.

    Query Parameters:
        user_id    — Filter by ERPUser primary key
        action     — Filter by action type (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, ...)
        module     — Filter by module name (case-insensitive contains)
        status     — Filter by status: SUCCESS | FAILURE
        from_date  — ISO 8601 date string (e.g. 2025-01-01). Inclusive start.
        to_date    — ISO 8601 date string (e.g. 2025-12-31). Inclusive end.
        search     — Free-text search across description and username
        page       — Page number (default: 1)
        page_size  — Records per page (default: 20, max: 100)
    """
    # ── 1. Admin-only access guard ──────────────────────────────────────────
    requesting_user = get_request_user(request)
    if not requesting_user:
        return Response({
            'success': False,
            'error': 'Authentication required.'
        }, status=status.HTTP_401_UNAUTHORIZED)

    if not requesting_user.role or requesting_user.role.level != 'ADMIN':
        return Response({
            'success': False,
            'error': 'Permission Denied. Only Administrators can access the audit log.'
        }, status=status.HTTP_403_FORBIDDEN)

    # ── 2. Base queryset ─────────────────────────────────────────────────────
    logs = ActivityLog.objects.select_related('user', 'user__role').order_by('-timestamp')

    # ── 3. Filters ───────────────────────────────────────────────────────────
    user_id = request.query_params.get('user_id')
    if user_id:
        logs = logs.filter(user_id=user_id)

    action_filter = request.query_params.get('action')
    if action_filter:
        logs = logs.filter(action=action_filter.upper())

    module_filter = request.query_params.get('module')
    if module_filter:
        logs = logs.filter(module__icontains=module_filter)

    status_filter = request.query_params.get('status')
    if status_filter:
        logs = logs.filter(status=status_filter.upper())

    search_query = request.query_params.get('search')
    if search_query:
        logs = logs.filter(
            Q(description__icontains=search_query) |
            Q(user__username__icontains=search_query) |
            Q(user__first_name__icontains=search_query) |
            Q(user__last_name__icontains=search_query)
        )

    from_date = request.query_params.get('from_date')
    if from_date:
        try:
            from django.utils.dateparse import parse_date
            parsed = parse_date(from_date)
            if parsed:
                logs = logs.filter(timestamp__date__gte=parsed)
        except (ValueError, TypeError):
            pass

    to_date = request.query_params.get('to_date')
    if to_date:
        try:
            from django.utils.dateparse import parse_date
            parsed = parse_date(to_date)
            if parsed:
                logs = logs.filter(timestamp__date__lte=parsed)
        except (ValueError, TypeError):
            pass

    # ── 4. Pagination ─────────────────────────────────────────────────────────
    try:
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
    except (ValueError, TypeError):
        page_size = 20

    paginator = PageNumberPagination()
    paginator.page_size = page_size

    try:
        paginated_logs = paginator.paginate_queryset(logs, request)
    except Exception:
        paginated_logs = list(logs[:page_size])

    # ── 5. Serialize ──────────────────────────────────────────────────────────
    serializer = ActivityLogSerializer(paginated_logs, many=True)

    total_count = logs.count()
    try:
        total_pages = paginator.page.paginator.num_pages
        current_page = paginator.page.number
    except Exception:
        total_pages = 1
        current_page = 1

    return Response({
        'success': True,
        'count': total_count,
        'total_pages': total_pages,
        'current_page': current_page,
        'page_size': page_size,
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def seed_view(request):
    """
    GET: Seed database with default data (products, sales, invoices, purchases, expenses)
    """
    logs = []
    logs.append("Starting database seeding...")
    
    import sys
    import os
    from django.conf import settings
    base_dir = str(settings.BASE_DIR)
    if base_dir not in sys.path:
        sys.path.insert(0, base_dir)

    original_exit = sys.exit
    def dummy_exit(code=0):
        if code != 0:
            raise Exception(f"Script called sys.exit with code {code}")
    sys.exit = dummy_exit
    
    try:
        # 1. Populate real products/sales/invoices
        try:
            import populate_real_data
            populate_real_data.main()
            logs.append("Successfully ran populate_real_data.")
        except Exception as e:
            logs.append(f"Error in populate_real_data: {str(e)}")

        # 2. Populate purchases and expenses
        try:
            import populate_purchases_and_expenses
            populate_purchases_and_expenses.main()
            logs.append("Successfully ran populate_purchases_and_expenses.")
        except Exception as e:
            logs.append(f"Error in populate_purchases_and_expenses: {str(e)}")

        # 3. Run erp bootstrap
        try:
            # reload in case it was imported before but needs to run again
            if 'scripts.erp_bootstrap' in sys.modules:
                del sys.modules['scripts.erp_bootstrap']
            import scripts.erp_bootstrap
            logs.append("Successfully ran erp_bootstrap.")
        except Exception as e:
            logs.append(f"Error in erp_bootstrap: {str(e)}")
            
    finally:
        sys.exit = original_exit
        
    from products.models import Product
    from sales.models import Sale
    from invoices.models import Invoice
    from purchases.models import Purchase
    from accounts.models import Expense
    
    stats = {
        'products': Product.objects.count(),
        'sales': Sale.objects.count(),
        'invoices': Invoice.objects.count(),
        'purchases': Purchase.objects.count(),
        'expenses': Expense.objects.count(),
    }
    
    return Response({
        'success': True,
        'logs': logs,
        'stats': stats
    }, status=status.HTTP_200_OK)
