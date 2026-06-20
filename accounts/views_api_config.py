"""
Views for API Configuration management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated, BasePermission
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from django.core.cache import cache
import openai

from .models_api_config import APIConfiguration
from .serializers_api_config import APIConfigurationSerializer, APIConfigurationUpdateSerializer


class IsERPAdminUser(BasePermission):
    """
    Custom permission to check if the request user is authenticated
    as an ERP Admin using their bearer token.
    """
    def has_permission(self, request, view):
        from user_management.views import get_request_user
        user = get_request_user(request)
        if not user:
            raise NotAuthenticated()
        
        role_name = user.role.name if user.role else ''
        if role_name in ['Inventory Manager', 'Sales Manager']:
            raise PermissionDenied("Inventory and Sales Managers do not have permission to manage API configurations.")
            
        is_admin = user.role and (user.role.level == 'ADMIN' or 'admin' in user.role.name.lower())
        if not is_admin:
            raise PermissionDenied("Only Administrators have permission to manage API configurations.")
            
        return True


class IsERPAuthenticated(BasePermission):
    """
    Custom permission to check if the request user is authenticated
    using their bearer token.
    """
    def has_permission(self, request, view):
        from user_management.views import get_request_user
        user = get_request_user(request)
        if not user:
            raise NotAuthenticated()
            
        role_name = user.role.name if user.role else ''
        if role_name in ['Inventory Manager', 'Sales Manager']:
            raise PermissionDenied("Inventory and Sales Managers do not have access to this resource.")
            
        return True


class APIConfigurationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing API Configurations (OpenAI API keys)
    Only admin users can access these endpoints
    """
    queryset = APIConfiguration.objects.all()
    permission_classes = [IsERPAdminUser]
    
    def get_serializer_class(self):
        """Use update serializer for partial_update and update actions"""
        if self.action in ['update', 'partial_update']:
            return APIConfigurationUpdateSerializer
        return APIConfigurationSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new API configuration"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Clear cache when new config is added
        cache.delete('active_api_config')
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update API configuration"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Clear cache when config is updated
        cache.delete('active_api_config')
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete API configuration"""
        instance = self.get_object()
        self.perform_destroy(instance)
        
        # Clear cache when config is deleted
        cache.delete('active_api_config')
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'], permission_classes=[IsERPAdminUser])
    def test_connection(self, request):
        """
        Test if the API key is valid by making a simple API call
        POST /api/accounts/api-configuration/test_connection/
        """
        try:
            config_id = request.data.get('id')
            provider = request.data.get('provider')
            
            if config_id:
                api_config = APIConfiguration.objects.filter(id=config_id).first()
            elif provider:
                api_config = APIConfiguration.objects.filter(provider=provider, is_active=True).first()
            else:
                api_config = APIConfiguration.objects.filter(is_active=True).first()
            
            if not api_config:
                return Response(
                    {'error': 'No active API configuration found to test'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            provider_type = api_config.provider
            
            if provider_type == 'openai':
                import openai
                try:
                    client = openai.OpenAI(api_key=api_config.api_key)
                    response = client.models.list()
                    is_valid = len(response.data) > 0
                except openai.AuthenticationError:
                    return Response(
                        {'error': 'Invalid OpenAI API key. Authentication failed.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif provider_type == 'groq':
                from groq import Groq, AuthenticationError as GroqAuthError
                try:
                    client = Groq(api_key=api_config.api_key)
                    response = client.models.list()
                    is_valid = len(response.data) > 0
                except GroqAuthError:
                    return Response(
                        {'error': 'Invalid Groq API key. Authentication failed.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {'error': f'Unsupported provider: {provider_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                'status': 'success',
                'message': 'API connection successful',
                'provider': api_config.get_provider_display(),
                'models_available': is_valid
            })
            
        except Exception as e:
            return Response(
                {'error': f'Connection test failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsERPAuthenticated])
    def active_config(self, request):
        """
        Get the currently active API configuration (without the full API key)
        GET /api/accounts/api-configuration/active_config/
        """
        api_config = APIConfiguration.objects.filter(is_active=True).first()
        
        if api_config:
            serializer = self.get_serializer(api_config)
            return Response(serializer.data)
            
        # Fall back to checking environment variables via get_active_api_key
        from .api_config_utils import get_active_api_key
        
        groq_key = get_active_api_key('groq')
        if groq_key:
            return Response({
                'provider': 'groq',
                'provider_display': 'Groq (Environment)',
                'is_active': True,
                'api_key_masked': '********' + (groq_key[-4:] if len(groq_key) > 4 else '')
            })
            
        openai_key = get_active_api_key('openai')
        if openai_key:
            return Response({
                'provider': 'openai',
                'provider_display': 'OpenAI (Environment)',
                'is_active': True,
                'api_key_masked': '********' + (openai_key[-4:] if len(openai_key) > 4 else '')
            })
        
        return Response(
            {'message': 'No active API configuration'},
            status=status.HTTP_404_NOT_FOUND
        )
