from django.db import models


class APIConfiguration(models.Model):
    """Store API Keys and configurations"""
    
    OPENAI_PROVIDER = 'openai'
    PROVIDERS = [
        (OPENAI_PROVIDER, 'OpenAI'),
    ]
    
    provider = models.CharField(max_length=50, choices=PROVIDERS, unique=True)
    api_key = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'API Configuration'
        verbose_name_plural = 'API Configurations'
    
    def __str__(self):
        return f"{self.get_provider_display()} - {'Active' if self.is_active else 'Inactive'}"
