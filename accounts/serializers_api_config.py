"""
Serializers for API Configuration management
"""
from rest_framework import serializers
from .models_api_config import APIConfiguration


class APIConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for APIConfiguration model"""
    
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    # Show only last 4 characters of API key in response for security
    api_key_masked = serializers.SerializerMethodField()
    
    class Meta:
        model = APIConfiguration
        fields = ['id', 'provider', 'provider_display', 'api_key', 'api_key_masked', 
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'api_key_masked', 'provider_display']
        extra_kwargs = {
            'api_key': {'write_only': True}  # Never return full API key in response
        }
    
    def get_api_key_masked(self, obj):
        """Return masked API key showing only last 4 characters"""
        if obj.api_key and len(obj.api_key) > 4:
            return f"{'*' * (len(obj.api_key) - 4)}{obj.api_key[-4:]}"
        return "****"
    
    def validate_api_key(self, value):
        """Validate API key format"""
        if not value or len(value) < 10:
            raise serializers.ValidationError("API key is too short. Please check your OpenAI API key.")
        if not value.startswith('sk-'):
            raise serializers.ValidationError("Invalid OpenAI API key format. Should start with 'sk-'")
        return value


class APIConfigurationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating API Configuration (provider is read-only)"""
    
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    api_key_masked = serializers.SerializerMethodField()
    
    class Meta:
        model = APIConfiguration
        fields = ['id', 'provider', 'provider_display', 'api_key', 'api_key_masked', 'is_active', 'updated_at']
        read_only_fields = ['id', 'provider', 'provider_display', 'api_key_masked', 'updated_at']
        extra_kwargs = {
            'api_key': {'write_only': True}
        }
    
    def get_api_key_masked(self, obj):
        """Return masked API key showing only last 4 characters"""
        if obj.api_key and len(obj.api_key) > 4:
            return f"{'*' * (len(obj.api_key) - 4)}{obj.api_key[-4:]}"
        return "****"
    
    def validate_api_key(self, value):
        """Validate API key format"""
        if not value or len(value) < 10:
            raise serializers.ValidationError("API key is too short. Please check your OpenAI API key.")
        if not value.startswith('sk-'):
            raise serializers.ValidationError("Invalid OpenAI API key format. Should start with 'sk-'")
        return value
