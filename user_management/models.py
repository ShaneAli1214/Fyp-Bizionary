"""
Screen 5: User Management - Models
User provisioning, authentication, and access control
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import EmailValidator
from decimal import Decimal


class Department(models.Model):
    """
    Department model for organizational structure
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Department name (e.g., Engineering, Operations)"
    )
    description = models.TextField(blank=True, null=True)
    head = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_mgmt_department'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name


class Role(models.Model):
    """
    Role model for defining user permissions and access levels
    """
    ROLE_LEVEL_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('MANAGER', 'Manager'),
        ('SUPERVISOR', 'Supervisor'),
        ('ANALYST', 'Analyst'),
        ('STAFF', 'Staff'),
        ('VIEWER', 'Viewer'),
    ]

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Role name (e.g., Admin, Manager)"
    )
    level = models.CharField(
        max_length=50,
        choices=ROLE_LEVEL_CHOICES,
        default='STAFF'
    )
    description = models.TextField(blank=True, null=True)
    permissions_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_mgmt_role'
        ordering = ['name']
        indexes = [
            models.Index(fields=['level']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_level_display()})"


class ERPUser(models.Model):
    """
    ERP User model extending Django's User model for extended functionality
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('SUSPENDED', 'Suspended'),
        ('PENDING', 'Pending Activation'),
    ]

    # Basic Info
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True, validators=[EmailValidator()])
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    password = models.CharField(max_length=255)
    
    # Organization Info
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='users'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name='users'
    )
    
    # Account Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    is_active = models.BooleanField(default=True)
    
    # Security
    two_factor_enabled = models.BooleanField(default=False)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    password_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Activity Tracking
    last_login = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(null=True, blank=True)
    login_count = models.IntegerField(default=0)
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_mgmt_erpuser'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
            models.Index(fields=['status']),
            models.Index(fields=['department']),
            models.Index(fields=['role']),
            models.Index(fields=['-last_login']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class Module(models.Model):
    """
    Module model representing different ERP modules
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Module name (e.g., Sales & CRM, Inventory)"
    )
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_mgmt_module'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name


class Permission(models.Model):
    """
    Permission model for granular access control
    """
    user = models.ForeignKey(
        ERPUser,
        on_delete=models.CASCADE,
        related_name='permissions'
    )
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name='permissions'
    )
    
    # CRUD Permissions
    can_create = models.BooleanField(default=False)
    can_read = models.BooleanField(default=True)
    can_update = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_mgmt_permission'
        unique_together = ['user', 'module']
        ordering = ['module__name']
        indexes = [
            models.Index(fields=['user', 'module']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.module.name}"


class ActivityLog(models.Model):
    """
    Activity Log model for tracking user actions
    """
    ACTION_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('PERMISSION_CHANGE', 'Permission Changed'),
        ('ROLE_CHANGE', 'Role Changed'),
        ('PASSWORD_CHANGE', 'Password Changed'),
        ('2FA_ENABLE', '2FA Enabled'),
        ('2FA_DISABLE', '2FA Disabled'),
        ('EXPORT', 'Data Export'),
        ('IMPORT', 'Data Import'),
        ('OTHER', 'Other'),
    ]

    user = models.ForeignKey(
        ERPUser,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        default='OTHER'
    )
    module = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        default='SUCCESS',
        choices=[('SUCCESS', 'Success'), ('FAILURE', 'Failure')]
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_mgmt_activitylog'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['-timestamp']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action} ({self.timestamp})"


class UserInvite(models.Model):
    """
    User Invite model for pending user invitations
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('EXPIRED', 'Expired'),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    invitation_token = models.CharField(max_length=255, unique=True)
    invited_by = models.ForeignKey(
        ERPUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invites_sent'
    )
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_mgmt_userinvite'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['status']),
            models.Index(fields=['-expires_at']),
        ]

    def __str__(self):
        return f"Invite: {self.email} ({self.status})"


class SecuritySetting(models.Model):
    """
    Security Settings for user account security policies
    """
    user = models.OneToOneField(
        ERPUser,
        on_delete=models.CASCADE,
        related_name='security_setting'
    )
    
    # Password Policy
    password_min_length = models.IntegerField(default=8)
    password_expires_days = models.IntegerField(default=90)
    password_history_count = models.IntegerField(default=5)
    require_special_characters = models.BooleanField(default=True)
    
    # 2FA
    two_factor_required = models.BooleanField(default=False)
    two_factor_method = models.CharField(
        max_length=50,
        choices=[('TOTP', 'TOTP'), ('SMS', 'SMS'), ('EMAIL', 'Email')],
        blank=True,
        null=True
    )
    
    # Session
    session_timeout_minutes = models.IntegerField(default=15)
    max_concurrent_sessions = models.IntegerField(default=3)
    
    # IP Whitelist
    restrict_to_ip = models.BooleanField(default=False)
    whitelisted_ips = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_mgmt_securitysetting'
        verbose_name = 'Security Setting'
        verbose_name_plural = 'Security Settings'

    def __str__(self):
        return f"Security Settings: {self.user.username}"
