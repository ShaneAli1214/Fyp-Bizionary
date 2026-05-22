"""
Views for API Configuration management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.core.cache import cache
import openai

from .models_api_config import APIConfiguration
from .serializers_api_config import APIConfigurationSerializer, APIConfigurationUpdateSerializer


class APIConfigurationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing API Configurations (OpenAI API keys)
    Only admin users can access these endpoints
    """
    queryset = APIConfiguration.objects.all()
    permission_classes = [IsAdminUser]
    
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
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def test_connection(self, request):
        """
        Test if the API key is valid by making a simple API call
        POST /api/accounts/api-configuration/test_connection/
        """
        try:
            api_config = APIConfiguration.objects.filter(is_active=True).first()
            
            if not api_config:
                return Response(
                    {'error': 'No active API configuration found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Test the API key with a simple request
            client = openai.OpenAI(api_key=api_config.api_key)
            response = client.models.list()
            
            return Response({
                'status': 'success',
                'message': 'API connection successful',
                'provider': api_config.get_provider_display(),
                'models_available': len(response.data) > 0
            })
        
        except openai.AuthenticationError:
            return Response(
                {'error': 'Invalid API key. Authentication failed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Connection test failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def active_config(self, request):
        """
        Get the currently active API configuration (without the full API key)
        GET /api/accounts/api-configuration/active_config/
        """
        api_config = APIConfiguration.objects.filter(is_active=True).first()
        
        if not api_config:
            return Response(
                {'message': 'No active API configuration'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(api_config)
        return Response(serializer.data)
