"""
Utility functions for API configuration management
"""
from django.core.cache import cache
from .models_api_config import APIConfiguration


def get_active_api_key(provider='openai'):
    """
    Get the active API key for a given provider
    Uses caching to avoid database queries on every call
    Falls back to environment variable if no database configuration exists
    """
    # Check cache first
    cache_key = f'api_key_{provider}'
    cached_key = cache.get(cache_key)
    
    if cached_key:
        return cached_key
    
    # Try to get from database
    try:
        api_config = APIConfiguration.objects.filter(
            provider=provider,
            is_active=True
        ).first()
        
        if api_config:
            # Cache for 1 hour (3600 seconds)
            cache.set(cache_key, api_config.api_key, 3600)
            return api_config.api_key
    except Exception:
        # Database might not be ready during migrations
        pass
    
    # Fallback to environment variable
    import os
    env_key = os.getenv('OPENAI_API_KEY')
    if env_key:
        # Cache the environment variable too
        cache.set(cache_key, env_key, 3600)
        return env_key
    
    return None


def validate_api_key_format(api_key, provider='openai'):
    """
    Validate if the API key format is correct
    """
    if not api_key:
        return False, "API key is empty"
    
    if provider == 'openai':
        if not api_key.startswith('sk-'):
            return False, "Invalid OpenAI API key format. Should start with 'sk-'"
        if len(api_key) < 20:
            return False, "API key seems too short"
        return True, "Valid OpenAI API key format"
    
    return False, f"Unknown provider: {provider}"


def clear_api_key_cache(provider='openai'):
    """
    Clear the API key cache for a given provider
    Useful after updating configuration
    """
    cache_key = f'api_key_{provider}'
    cache.delete(cache_key)
