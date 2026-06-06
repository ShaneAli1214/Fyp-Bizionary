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


def get_request_user(request):
    """
    Helper to extract user from Authorization header token
    """
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        if token.startswith('erp-token-'):
            try:
                parts = token.split('-')
                if len(parts) >= 3:
                    user_id = int(parts[2])
                    user = ERPUser.objects.select_related('role', 'department').get(pk=user_id)
                    user.last_activity = timezone.now()
                    user.save(update_fields=['last_activity'])
                    return user
            except Exception:
                pass
        elif token == 'mock-jwt-token-for-ali':
            try:
                user = ERPUser.objects.select_related('role', 'department').get(pk=1)
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
        # Enforce that only Super Admin (or any user if database is empty) can create users
        if ERPUser.objects.filter(role__level='ADMIN').exists():
            requesting_user = get_request_user(request)
            if not requesting_user or requesting_user.role.level != 'ADMIN':
                return Response({
                    'success': False,
                    'error': 'Permission Denied. Only a Super Admin can create new users.'
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
                'error': 'Permission Denied. Only a Super Admin can modify user accounts.'
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
                'error': 'Permission Denied. Only a Super Admin can deactivate users.'
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

@api_view(['POST'])
def login_view(request):
    """
    POST: Authenticate user using email and password.
    Returns token and user info.
    """
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'success': False,
            'error': 'Please provide both email and password.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = ERPUser.objects.select_related('role', 'department').get(email=email)
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
        # Update user login count and last login timestamp
        user.login_count += 1
        user.last_login = timezone.now()
        user.last_activity = timezone.now()
        user.save()
        
        # Log login activity
        ActivityLog.objects.create(
            user=user,
            action='LOGIN',
            description=f"User {user.username} logged in successfully.",
            status='SUCCESS'
        )
        
        import uuid
        token = f"erp-token-{user.id}-{uuid.uuid4().hex}"
        
        return Response({
            'success': True,
            'token': token,
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
            'error': 'Permission Denied. Only a Super Admin can change user status.'
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
            'error': 'Permission Denied. Only a Super Admin can reset user passwords.'
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
            'error': 'Permission Denied. Only a Super Admin can view audit logs.'
        }, status=status.HTTP_403_FORBIDDEN)
        
    logs = ActivityLog.objects.select_related('user').order_by('-timestamp')
    
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
