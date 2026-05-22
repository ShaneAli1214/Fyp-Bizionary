"""
Screen 5: User Management - Serializers
DRF serializers for API request/response handling
"""

from rest_framework import serializers
from .models import (
    Department, Role, ERPUser, Module, Permission, 
    ActivityLog, UserInvite, SecuritySetting
)


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Department model
    """
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'budget', 'head', 'created_at', 'user_count']
        read_only_fields = ['created_at']

    def get_user_count(self, obj):
        """Get count of active users in department"""
        return obj.users.filter(status='ACTIVE').count()


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for Role model
    """
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'level', 'description', 'created_at', 'user_count']
        read_only_fields = ['created_at']

    def get_user_count(self, obj):
        """Get count of users with this role"""
        return obj.users.filter(status='ACTIVE').count()


class ModuleSerializer(serializers.ModelSerializer):
    """
    Serializer for Module model
    """
    class Meta:
        model = Module
        fields = ['id', 'name', 'description', 'active', 'created_at']
        read_only_fields = ['created_at']


class PermissionSerializer(serializers.ModelSerializer):
    """
    Serializer for Permission model
    """
    module_name = serializers.CharField(source='module.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Permission
        fields = [
            'id', 'user', 'user_email', 'module', 'module_name',
            'can_create', 'can_read', 'can_update', 'can_delete',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """Validate permission assignment"""
        user = data.get('user')
        module = data.get('module')

        # Check if user is active
        if user and user.status != 'ACTIVE':
            raise serializers.ValidationError(
                "Cannot assign permissions to inactive users"
            )

        # Check if module is active
        if module and not module.active:
            raise serializers.ValidationError(
                "Cannot assign permissions for inactive modules"
            )

        return data


class ActivityLogSerializer(serializers.ModelSerializer):
    """
    Serializer for ActivityLog model
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'action', 
            'description', 'ip_address', 'timestamp'
        ]
        read_only_fields = ['timestamp']


class UserInviteSerializer(serializers.ModelSerializer):
    """
    Serializer for UserInvite model
    """
    inviter_name = serializers.CharField(source='inviter.username', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = UserInvite
        fields = [
            'id', 'email', 'inviter', 'inviter_name', 
            'department', 'department_name', 'role', 'role_name',
            'status', 'token', 'created_at', 'expires_at'
        ]
        read_only_fields = ['token', 'created_at', 'expires_at']

    def validate_email(self, value):
        """Validate email is not already registered"""
        if ERPUser.objects.filter(email=value, status='ACTIVE').exists():
            raise serializers.ValidationError(
                "This email is already registered"
            )
        return value


class SecuritySettingSerializer(serializers.ModelSerializer):
    """
    Serializer for SecuritySetting model
    """
    class Meta:
        model = SecuritySetting
        fields = [
            'id', 'min_password_length', 'require_special_characters',
            'policy_enforce_2fa', 'session_timeout_minutes', 'max_login_attempts',
            'updated_at'
        ]
        read_only_fields = ['updated_at']

    def validate_min_password_length(self, value):
        """Validate minimum password length"""
        if value < 6 or value > 128:
            raise serializers.ValidationError(
                "Minimum password length must be between 6 and 128"
            )
        return value

    def validate_session_timeout_minutes(self, value):
        """Validate session timeout"""
        if value < 5 or value > 1440:  # 5 minutes to 24 hours
            raise serializers.ValidationError(
                "Session timeout must be between 5 and 1440 minutes"
            )
        return value

    def validate_max_login_attempts(self, value):
        """Validate max login attempts"""
        if value < 3 or value > 20:
            raise serializers.ValidationError(
                "Max login attempts must be between 3 and 20"
            )
        return value


class ERPUserSerializer(serializers.ModelSerializer):
    """
    Main serializer for ERPUser model
    """
    department_name = serializers.CharField(source='department.name', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_level = serializers.CharField(source='role.level', read_only=True)
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = ERPUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'department', 'department_name', 'role', 'role_name', 'role_level',
            'status', 'is_active', 'two_factor_enabled', 'password_changed_date',
            'last_login', 'last_activity', 'login_count', 'permissions',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'password_changed_date', 'last_login', 'last_activity',
            'login_count', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        """Create new user with hashed password"""
        user = ERPUser.objects.create_user(**validated_data)
        return user

    def update(self, instance, validated_data):
        """Update user - handle password separately"""
        password = validated_data.pop('password', None)
        
        for key, value in validated_data.items():
            setattr(instance, key, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance

    def validate_username(self, value):
        """Validate username uniqueness"""
        user = self.instance
        if ERPUser.objects.filter(username=value).exclude(pk=user.pk if user else None).exists():
            raise serializers.ValidationError(
                "This username is already taken"
            )
        return value

    def validate_email(self, value):
        """Validate email uniqueness"""
        user = self.instance
        if ERPUser.objects.filter(email=value).exclude(pk=user.pk if user else None).exists():
            raise serializers.ValidationError(
                "This email is already registered"
            )
        return value

    def validate_password(self, value):
        """Validate password strength"""
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters long"
            )
        return value


class ERPUserDetailSerializer(ERPUserSerializer):
    """
    Detailed serializer for ERPUser with full relationships
    """
    activity_logs = ActivityLogSerializer(many=True, read_only=True)

    class Meta(ERPUserSerializer.Meta):
        fields = ERPUserSerializer.Meta.fields + ['activity_logs']
