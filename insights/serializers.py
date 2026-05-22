from rest_framework import serializers

from sales.models import Sale

from .models import InsightRecommendation, CustomerReview
from .services import analyze_review_sentiment


class ProductPerformanceSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    category = serializers.CharField()
    total_sales = serializers.IntegerField()
    total_revenue = serializers.FloatField()
    stock_level = serializers.IntegerField()
    reorder_level = serializers.IntegerField()
    status = serializers.CharField()
    trend = serializers.CharField()


class SalesTrendSerializer(serializers.Serializer):
    date = serializers.CharField()
    sales = serializers.IntegerField()


class InsightsSerializer(serializers.Serializer):
    total_revenue = serializers.FloatField()
    total_sales = serializers.IntegerField()
    average_order_value = serializers.FloatField()
    hot_products = ProductPerformanceSerializer(many=True)
    cold_products = ProductPerformanceSerializer(many=True)
    restocking_needed = ProductPerformanceSerializer(many=True)
    sales_trend = SalesTrendSerializer(many=True)
    ai_insights = serializers.CharField()


class InsightRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsightRecommendation
        fields = ('id', 'recommendation_text', 'context_snapshot', 'created_at', 'updated_at')


class InsightRecommendationCreateSerializer(serializers.Serializer):
    recommendation_text = serializers.CharField(max_length=1000)


class CustomerReviewSerializer(serializers.ModelSerializer):
    sale_id = serializers.IntegerField(source='sale.id', read_only=True)

    class Meta:
        model = CustomerReview
        fields = (
            'id',
            'sale_id',
            'customer_name',
            'review_text',
            'rating',
            'sentiment_label',
            'sentiment_score',
            'created_at',
            'updated_at',
        )


class CustomerReviewCreateSerializer(serializers.Serializer):
    sale_id = serializers.IntegerField(required=False)
    customer_name = serializers.CharField(max_length=255)
    review_text = serializers.CharField(max_length=2000)
    rating = serializers.IntegerField(min_value=1, max_value=5)

    def validate_sale_id(self, value):
        if not Sale.objects.filter(pk=value).exists():
            raise serializers.ValidationError('Sale not found.')
        return value

    def create(self, validated_data):
        sale_id = validated_data.pop('sale_id', None)
        sale = Sale.objects.filter(pk=sale_id).first() if sale_id else None
        sentiment_label, sentiment_score = analyze_review_sentiment(
            validated_data.get('review_text', ''),
            validated_data.get('rating', 3),
        )

        return CustomerReview.objects.create(
            sale=sale,
            sentiment_label=sentiment_label,
            sentiment_score=sentiment_score,
            **validated_data,
        )


class NLPReportSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField()
    period_days = serializers.IntegerField()
    sales_summary = serializers.DictField()
    review_summary = serializers.DictField()
    key_findings = serializers.ListField(child=serializers.CharField())
    recommendation = serializers.CharField()
    recent_reviews = CustomerReviewSerializer(many=True)


class SmartReorderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    sku = serializers.CharField()
    current_stock = serializers.IntegerField()
    reorder_level = serializers.IntegerField()
    units_sold_period = serializers.IntegerField()
    sales_count_period = serializers.IntegerField()
    avg_daily_demand = serializers.FloatField()
    weighted_daily_demand = serializers.FloatField()
    demand_band = serializers.CharField()
    lead_time_days = serializers.IntegerField()
    coverage_days = serializers.IntegerField()
    target_stock = serializers.IntegerField()
    recommended_order_quantity = serializers.IntegerField()
    days_to_stockout = serializers.FloatField(allow_null=True)
    urgency = serializers.CharField()
    priority_score = serializers.FloatField()
    estimated_order_cost = serializers.FloatField()
    discontinue_recommendation = serializers.CharField()
    discontinue_reason = serializers.CharField()


class SmartReorderEngineSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField()
    period_days = serializers.IntegerField()
    lead_time_days = serializers.IntegerField()
    coverage_days = serializers.IntegerField()
    total_products_evaluated = serializers.IntegerField()
    total_products_to_reorder = serializers.IntegerField()
    total_discontinue_candidates = serializers.IntegerField()
    recommendations = SmartReorderItemSerializer(many=True)
    discontinue_candidates = SmartReorderItemSerializer(many=True)
    product_planning = SmartReorderItemSerializer(many=True)
