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
    GET: Get all users with optional filters
    POST: Create new user
    Query params: status, role, department
    """
    if request.method == 'GET':
        users = ERPUser.objects.all()

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

        serializer = ERPUserSerializer(users, many=True)
        return Response({
            'success': True,
            'count': users.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = ERPUserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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
    PUT: Update user
    DELETE: Deactivate user
    """
    user = get_object_or_404(ERPUser, pk=pk)

    if request.method == 'GET':
        serializer = ERPUserDetailSerializer(user)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        serializer = ERPUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
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
        # Soft delete - mark as inactive
        user.status = 'INACTIVE'
        user.save()
        return Response({
            'success': True,
            'message': 'User deactivated successfully'
        }, status=status.HTTP_204_NO_CONTENT)


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
