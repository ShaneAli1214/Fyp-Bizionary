"""
Screen 5: User Management - Service Layer
Business logic for user analytics and management
"""

from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta
from .models import ERPUser, Department, Role, Permission, ActivityLog, UserInvite, Module


class UserManagementService:
    """
    Service class containing all business logic for user management
    """

    @staticmethod
    def total_users():
        """
        Get total number of users
        Returns: Int
        """
        return ERPUser.objects.filter(status='ACTIVE').count()

    @staticmethod
    def active_users_now(minutes=15):
        """
        Get users active in the last N minutes
        Args:
            minutes: Time window in minutes (default: 15)
        Returns: Int
        """
        time_threshold = timezone.now() - timedelta(minutes=minutes)
        return ERPUser.objects.filter(
            last_activity__gte=time_threshold,
            status='ACTIVE'
        ).count()

    @staticmethod
    def users_by_role():
        """
        Get count of users grouped by role
        Returns: List of dicts with role and count
        """
        role_counts = ERPUser.objects.filter(
            status='ACTIVE'
        ).values('role__name').annotate(
            count=Count('id')
        ).order_by('-count')

        return [
            {
                'role': item['role__name'],
                'count': item['count']
            }
            for item in role_counts
        ]

    @staticmethod
    def users_by_department():
        """
        Get count of users grouped by department
        Returns: List of dicts with department and count
        """
        dept_counts = ERPUser.objects.filter(
            status='ACTIVE'
        ).values('department__name').annotate(
            count=Count('id')
        ).order_by('-count')

        return [
            {
                'department': item['department__name'],
                'count': item['count']
            }
            for item in dept_counts
        ]

    @staticmethod
    def admin_roles_count():
        """
        Get count of users with admin roles
        Returns: Int
        """
        return ERPUser.objects.filter(
            role__level='ADMIN',
            status='ACTIVE'
        ).count()

    @staticmethod
    def pending_invites_count():
        """
        Get count of pending invitations
        Returns: Int
        """
        return UserInvite.objects.filter(status='PENDING').count()

    @staticmethod
    def inactive_users_count():
        """
        Get count of inactive users
        Returns: Int
        """
        return ERPUser.objects.filter(status='INACTIVE').count()

    @staticmethod
    def suspended_users_count():
        """
        Get count of suspended users
        Returns: Int
        """
        return ERPUser.objects.filter(status='SUSPENDED').count()

    @staticmethod
    def users_with_2fa_enabled():
        """
        Get count of users with 2FA enabled
        Returns: Int
        """
        return ERPUser.objects.filter(
            two_factor_enabled=True,
            status='ACTIVE'
        ).count()

    @staticmethod
    def permission_matrix():
        """
        Get permission matrix for all modules and roles
        Returns: List of dicts with module and permissions count
        """
        modules = Module.objects.all()
        matrix = []

        for module in modules:
            create_count = Permission.objects.filter(
                module=module,
                can_create=True
            ).count()
            read_count = Permission.objects.filter(
                module=module,
                can_read=True
            ).count()
            update_count = Permission.objects.filter(
                module=module,
                can_update=True
            ).count()
            delete_count = Permission.objects.filter(
                module=module,
                can_delete=True
            ).count()

            matrix.append({
                'module': module.name,
                'create': create_count,
                'read': read_count,
                'update': update_count,
                'delete': delete_count,
                'total_permissions': create_count + read_count + update_count + delete_count
            })

        return matrix

    @staticmethod
    def recent_activity_logs(limit=20):
        """
        Get recent activity logs
        Args:
            limit: Number of logs to return (default: 20)
        Returns: QuerySet of ActivityLog objects
        """
        return ActivityLog.objects.select_related('user').order_by('-timestamp')[:limit]

    @staticmethod
    def user_login_statistics():
        """
        Get user login statistics
        Returns: Dict with login stats
        """
        active_users = ERPUser.objects.filter(status='ACTIVE')
        
        # Users who logged in today
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        logged_in_today = active_users.filter(last_login__gte=today_start).count()
        
        # Users who never logged in
        never_logged_in = active_users.filter(last_login__isnull=True).count()
        
        # Average login count
        avg_logins = active_users.aggregate(
            avg=Count('login_count')
        )['avg'] or 0

        return {
            'total_active': active_users.count(),
            'logged_in_today': logged_in_today,
            'never_logged_in': never_logged_in,
            'average_login_count': avg_logins,
            'unique_logins_today': logged_in_today
        }

    @staticmethod
    def kpi_summary():
        """
        Get all KPIs in one call
        Returns: Dict with all KPI values
        """
        return {
            'total_users': UserManagementService.total_users(),
            'active_now': UserManagementService.active_users_now(),
            'admin_roles': UserManagementService.admin_roles_count(),
            'pending_invites': UserManagementService.pending_invites_count(),
            'inactive_users': UserManagementService.inactive_users_count(),
            'suspended_users': UserManagementService.suspended_users_count(),
            'users_with_2fa': UserManagementService.users_with_2fa_enabled(),
        }

    @staticmethod
    def get_user_details(user_id):
        """
        Get complete details of a specific user
        Args:
            user_id: User ID or username
        Returns: User object with related data
        """
        try:
            return ERPUser.objects.prefetch_related(
                'permissions',
                'activity_logs'
            ).get(
                Q(id=user_id) | Q(username=user_id)
            )
        except ERPUser.DoesNotExist:
            return None

    @staticmethod
    def get_user_permissions(user_id):
        """
        Get all permissions for a specific user
        Args:
            user_id: User ID
        Returns: List of dicts with module and CRUD permissions
        """
        permissions = Permission.objects.filter(
            user_id=user_id
        ).select_related('module')

        return [
            {
                'module': perm.module.name,
                'can_create': perm.can_create,
                'can_read': perm.can_read,
                'can_update': perm.can_update,
                'can_delete': perm.can_delete,
            }
            for perm in permissions
        ]

    @staticmethod
    def get_user_activity(user_id, limit=20):
        """
        Get activity history for a specific user
        Args:
            user_id: User ID
            limit: Number of logs to return
        Returns: List of activity logs
        """
        return ActivityLog.objects.filter(
            user_id=user_id
        ).order_by('-timestamp')[:limit]

    @staticmethod
    def department_summary():
        """
        Get summary statistics for each department
        Returns: List of dicts with department info
        """
        departments = Department.objects.all()
        summary = []

        for dept in departments:
            user_count = ERPUser.objects.filter(
                department=dept,
                status='ACTIVE'
            ).count()
            
            summary.append({
                'name': dept.name,
                'user_count': user_count,
                'budget': float(dept.budget),
                'head': dept.head or 'Unassigned'
            })

        return summary
