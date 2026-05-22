from django.db import models
from django.contrib.auth.models import User


class InsightCache(models.Model):
    """Cache AI insights to avoid excessive API calls"""
    INSIGHT_TYPES = [
        ('general', 'General Insights'),
        ('products', 'Product Insights'),
        ('sales', 'Sales Insights'),
    ]
    
    insight_type = models.CharField(max_length=20, choices=INSIGHT_TYPES)
    data = models.JSONField()
    ai_analysis = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['insight_type', '-updated_at']),
        ]

    def __str__(self):
        return f"{self.get_insight_type_display()} - {self.created_at}"


class InsightRecommendation(models.Model):
    """User-saved recommendation from AI insights widget."""

    recommendation_text = models.TextField()
    context_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Recommendation #{self.id}"


class CustomerReview(models.Model):
    """Live customer reviews used in NLP reporting."""

    SENTIMENT_CHOICES = [
        ('positive', 'Positive'),
        ('neutral', 'Neutral'),
        ('negative', 'Negative'),
    ]

    sale = models.ForeignKey(
        'sales.Sale',
        on_delete=models.SET_NULL,
        related_name='customer_reviews',
        null=True,
        blank=True,
    )
    customer_name = models.CharField(max_length=255)
    review_text = models.TextField()
    rating = models.PositiveSmallIntegerField()
    sentiment_label = models.CharField(max_length=20, choices=SENTIMENT_CHOICES, default='neutral')
    sentiment_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['sentiment_label']),
            models.Index(fields=['rating']),
        ]

    def __str__(self):
        return f"Review #{self.id} - {self.customer_name} ({self.rating}/5)"
