"""
Screen 5: User Management - Django Admin Configuration
Admin interface for user provisioning and access control
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    Department, Role, ERPUser, Module, Permission, 
    ActivityLog, UserInvite, SecuritySetting
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """
    Admin configuration for Department model
    """
    list_display = ('name', 'head_name', 'user_count', 'budget_display', 'created_at')
    list_filter = ('created_at', 'budget')
    search_fields = ('name', 'description', 'head')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description')
        }),
        ('Management', {
            'fields': ('head', 'budget')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at',)

    def head_name(self, obj):
        """Display department head name"""
        return obj.head or 'Unassigned'
    head_name.short_description = 'Head'

    def user_count(self, obj):
        """Display count of active users in department"""
        count = obj.users.filter(status='ACTIVE').count()
        return format_html(
            '<span style="background-color: #90EE90; padding: 3px 10px; border-radius: 3px;">{}</span>',
            count
        )
    user_count.short_description = 'Active Users'

    def budget_display(self, obj):
        """Display budget with currency formatting"""
        return f"Rs. {obj.budget:,.0f}"
    budget_display.short_description = 'Budget'


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """
    Admin configuration for Role model
    """
    list_display = ('name', 'level_badge', 'user_count', 'created_at')
    list_filter = ('level', 'created_at')
    search_fields = ('name', 'description')
    fieldsets = (
        ('Role Information', {
            'fields': ('name', 'level', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at',)

    def level_badge(self, obj):
        """Display role level as badge"""
        colors = {
            'ADMIN': '#FF6B6B',
            'MANAGER': '#4ECDC4',
            'SUPERVISOR': '#45B7D1',
            'ANALYST': '#96CEB4',
            'STAFF': '#FFEAA7',
            'VIEWER': '#DFE6E9'
        }
        color = colors.get(obj.level, '#999999')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, obj.level
        )
    level_badge.short_description = 'Level'

    def user_count(self, obj):
        """Display count of users with this role"""
        count = obj.users.filter(status='ACTIVE').count()
        return format_html(
            '<span style="background-color: #90EE90; padding: 3px 10px; border-radius: 3px;">{}</span>',
            count
        )
    user_count.short_description = 'Users'


class PermissionInline(admin.TabularInline):
    """
    Inline display of permissions for ERPUser
    """
    model = Permission
    extra = 0
    fields = ('module', 'can_create', 'can_read', 'can_update', 'can_delete')
    readonly_fields = ('created_at', 'updated_at')


class ActivityLogInline(admin.TabularInline):
    """
    Inline display of activity logs for ERPUser
    """
    model = ActivityLog
    extra = 0
    fields = ('action', 'description', 'ip_address', 'timestamp')
    readonly_fields = ('action', 'description', 'ip_address', 'timestamp')
    can_delete = False

    def has_add_permission(self, request):
        return False


@admin.register(ERPUser)
class ERPUserAdmin(admin.ModelAdmin):
    """
    Admin configuration for ERPUser model
    """
    list_display = (
        'username', 'email', 'department_name', 'role_name', 
        'status_badge', 'two_fa_status', 'last_login_display'
    )
    list_filter = ('status', 'two_factor_enabled', 'created_at', 'department', 'role')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    inlines = [PermissionInline, ActivityLogInline]
    fieldsets = (
        ('User Information', {
            'fields': ('username', 'email', 'first_name', 'last_name', 'password')
        }),
        ('Organization', {
            'fields': ('department', 'role', 'status')
        }),
        ('Security', {
            'fields': ('two_factor_enabled', 'is_active', 'password_changed_at'),
            'classes': ('collapse',)
        }),
        ('Activity', {
            'fields': ('last_login', 'last_activity', 'login_count'),
            'classes': ('collapse',),
            'description': 'View-only activity information'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = (
        'password_changed_at', 'last_login', 'last_activity',
        'login_count', 'created_at', 'updated_at'
    )

    def department_name(self, obj):
        """Display department name"""
        return obj.department.name if obj.department else 'Unassigned'
    department_name.short_description = 'Department'

    def role_name(self, obj):
        """Display role name"""
        return obj.role.name if obj.role else 'Unassigned'
    role_name.short_description = 'Role'

    def status_badge(self, obj):
        """Display status as colored badge"""
        colors = {
            'ACTIVE': '#51CF66',
            'INACTIVE': '#748C94',
            'SUSPENDED': '#FF6B6B'
        }
        color = colors.get(obj.status, '#999999')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, obj.status
        )
    status_badge.short_description = 'Status'

    def two_fa_status(self, obj):
        """Display 2FA status"""
        if obj.two_factor_enabled:
            return format_html(
                '<span style="background-color: #51CF66; color: white; padding: 3px 10px; border-radius: 3px;">✓ 2FA Enabled</span>'
            )
        return format_html(
            '<span style="background-color: #FF6B6B; color: white; padding: 3px 10px; border-radius: 3px;">✗ 2FA Disabled</span>'
        )
    two_fa_status.short_description = '2FA Status'

    def last_login_display(self, obj):
        """Display last login time"""
        if obj.last_login:
            return obj.last_login.strftime('%b %d, %Y %H:%M')
        return 'Never logged in'
    last_login_display.short_description = 'Last Login'


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    """
    Admin configuration for Module model
    """
    list_display = ('name', 'active_status', 'perm_count', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    fieldsets = (
        ('Module Information', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at',)

    def active_status(self, obj):
        """Display active status"""
        if obj.is_active:
            return format_html(
                '<span style="background-color: #51CF66; color: white; padding: 3px 10px; border-radius: 3px;">✓ Active</span>'
            )
        return format_html(
            '<span style="background-color: #748C94; color: white; padding: 3px 10px; border-radius: 3px;">✗ Inactive</span>'
        )
    active_status.short_description = 'Status'

    def perm_count(self, obj):
        """Display permission count"""
        count = obj.permissions.count()
        return format_html(
            '<span style="background-color: #4ECDC4; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            count
        )
    perm_count.short_description = 'Permissions'


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    """
    Admin configuration for Permission model
    """
    list_display = (
        'user_name', 'module_name', 'create_badge', 'read_badge',
        'update_badge', 'delete_badge', 'created_at'
    )
    list_filter = ('module', 'created_at', 'can_create', 'can_read', 'can_update', 'can_delete')
    search_fields = ('user__username', 'module__name')
    fieldsets = (
        ('Assignment', {
            'fields': ('user', 'module')
        }),
        ('CRUD Permissions', {
            'fields': ('can_create', 'can_read', 'can_update', 'can_delete'),
            'description': 'Select which operations the user can perform on this module'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at')

    def user_name(self, obj):
        """Display user name"""
        return obj.user.username
    user_name.short_description = 'User'

    def module_name(self, obj):
        """Display module name"""
        return obj.module.name
    module_name.short_description = 'Module'

    def create_badge(self, obj):
        """Display create permission as badge"""
        if obj.can_create:
            return format_html('<span style="color: green;">✓ Create</span>')
        return format_html('<span style="color: red;">✗</span>')
    create_badge.short_description = 'Create'

    def read_badge(self, obj):
        """Display read permission as badge"""
        if obj.can_read:
            return format_html('<span style="color: green;">✓ Read</span>')
        return format_html('<span style="color: red;">✗</span>')
    read_badge.short_description = 'Read'

    def update_badge(self, obj):
        """Display update permission as badge"""
        if obj.can_update:
            return format_html('<span style="color: green;">✓ Update</span>')
        return format_html('<span style="color: red;">✗</span>')
    update_badge.short_description = 'Update'

    def delete_badge(self, obj):
        """Display delete permission as badge"""
        if obj.can_delete:
            return format_html('<span style="color: green;">✓ Delete</span>')
        return format_html('<span style="color: red;">✗</span>')
    delete_badge.short_description = 'Delete'


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    """
    Admin configuration for ActivityLog model
    """
    list_display = ('user_name', 'action_badge', 'description', 'ip_address', 'timestamp')
    list_filter = ('action', 'timestamp', 'user')
    search_fields = ('user__username', 'description', 'ip_address')
    fieldsets = (
        ('Activity Information', {
            'fields': ('user', 'action', 'description')
        }),
        ('Network Information', {
            'fields': ('ip_address',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('timestamp',)
    can_delete = False

    def user_name(self, obj):
        """Display user name"""
        return obj.user.username
    user_name.short_description = 'User'

    def action_badge(self, obj):
        """Display action type as badge"""
        colors = {
            'LOGIN': '#51CF66',
            'LOGOUT': '#748C94',
            'CREATE': '#4ECDC4',
            'UPDATE': '#96CEB4',
            'DELETE': '#FF6B6B',
            'DOWNLOAD': '#FFD93D',
            'UPLOAD': '#6BCB77',
            'EDIT_PROFILE': '#4D96FF',
            'CHANGE_PASSWORD': '#FF6B9D',
            'ENABLE_2FA': '#00D2FC',
            'DISABLE_2FA': '#FFB627',
            'PERMISSION_CHANGE': '#FF7675',
            'OTHER': '#999999'
        }
        color = colors.get(obj.action, '#999999')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, obj.action
        )
    action_badge.short_description = 'Action'

    def has_add_permission(self, request):
        """Prevent manual addition of activity logs"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of activity logs"""
        return False


@admin.register(UserInvite)
class UserInviteAdmin(admin.ModelAdmin):
    """
    Admin configuration for UserInvite model
    """
    list_display = (
        'email', 'inviter_name', 'department_name', 'role_name',
        'status_badge', 'expired_status', 'created_at'
    )
    list_filter = ('status', 'created_at', 'expires_at', 'department', 'role')
    search_fields = ('email', 'invited_by__username', 'department__name')
    fieldsets = (
        ('Invitation Details', {
            'fields': ('email', 'first_name', 'last_name', 'invited_by', 'invitation_token')
        }),
        ('Assignment', {
            'fields': ('department', 'role')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Dates', {
            'fields': ('accepted_at', 'created_at', 'expires_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('invitation_token', 'created_at', 'expires_at', 'updated_at')

    def inviter_name(self, obj):
        """Display inviter name"""
        return obj.invited_by.username if obj.invited_by else 'System'
    inviter_name.short_description = 'Invited By'

    def department_name(self, obj):
        """Display department name"""
        return obj.department.name if obj.department else 'Unassigned'
    department_name.short_description = 'Department'

    def role_name(self, obj):
        """Display role name"""
        return obj.role.name if obj.role else 'Unassigned'
    role_name.short_description = 'Role'

    def status_badge(self, obj):
        """Display status as badge"""
        colors = {
            'PENDING': '#FFD93D',
            'ACCEPTED': '#51CF66',
            'EXPIRED': '#FF6B6B'
        }
        color = colors.get(obj.status, '#999999')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, obj.status
        )
    status_badge.short_description = 'Status'

    def expired_status(self, obj):
        """Display expiry status"""
        from django.utils import timezone
        if obj.expires_at < timezone.now():
            return format_html(
                '<span style="background-color: #FF6B6B; color: white; padding: 3px 10px; border-radius: 3px;">Expired</span>'
            )
        return format_html(
            '<span style="background-color: #51CF66; color: white; padding: 3px 10px; border-radius: 3px;">Valid</span>'
        )
    expired_status.short_description = 'Expiry'


@admin.register(SecuritySetting)
class SecuritySettingAdmin(admin.ModelAdmin):
    """
    Admin configuration for SecuritySetting model
    """
    list_display = (
        'user_name', 'password_min_length', 'require_special_characters',
        'two_factor_required', 'session_timeout_display', 'updated_at'
    )
    list_filter = (
        'require_special_characters', 'two_factor_required', 
        'restrict_to_ip', 'updated_at'
    )
    search_fields = ('user__username', 'user__email')
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Password Policy', {
            'fields': (
                'password_min_length', 'password_expires_days',
                'password_history_count', 'require_special_characters'
            ),
            'description': 'Configure password requirements for this user'
        }),
        ('Two-Factor Authentication', {
            'fields': ('two_factor_required', 'two_factor_method'),
            'classes': ('collapse',)
        }),
        ('Session Management', {
            'fields': ('session_timeout_minutes', 'max_concurrent_sessions'),
            'description': 'Configure how long users can stay logged in'
        }),
        ('IP Whitelist', {
            'fields': ('restrict_to_ip', 'whitelisted_ips'),
            'classes': ('collapse',)
        }),
        ('Last Updated', {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('updated_at',)

    def user_name(self, obj):
        """Display user name"""
        return obj.user.username
    user_name.short_description = 'User'

    def session_timeout_display(self, obj):
        """Display session timeout in hours and minutes"""
        hours = obj.session_timeout_minutes // 60
        minutes = obj.session_timeout_minutes % 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    session_timeout_display.short_description = 'Session Timeout'

    def has_delete_permission(self, request):
        """Prevent deletion of security settings"""
        return False
