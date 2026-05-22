from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.views.decorators.http import condition
from django.http import HttpResponse
from datetime import datetime

from .serializers import InsightsSerializer
from .models import InsightRecommendation, CustomerReview
from .serializers import (
    InsightRecommendationSerializer,
    InsightRecommendationCreateSerializer,
    CustomerReviewSerializer,
    CustomerReviewCreateSerializer,
    NLPReportSerializer,
    SmartReorderEngineSerializer,
)
from .services import (
    get_insights_payload,
    generate_ai_insights,
    build_live_insights_message,
    get_pricing_suggestions,
    get_demand_alerts,
    get_stock_warnings,
    build_live_recommendation,
    build_daily_ai_recommendation,
    build_live_nlp_report,
    get_smart_reorder_recommendations,
)


def add_no_cache_headers(response):
    """Add headers to prevent HTTP caching"""
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    response['Last-Modified'] = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S GMT')
    return response


def _resolve_ai_message(payload):
    """Return automatic daily AI recommendation based on live data."""
    pricing = get_pricing_suggestions()
    demand = get_demand_alerts()
    stock = get_stock_warnings()
    return build_daily_ai_recommendation(payload, pricing, demand, stock)


@api_view(['GET'])
def get_insights(request):
    """Get comprehensive AI insights about sales, products, and inventory"""
    try:
        payload = get_insights_payload()
        # Main tab recommendation is consent-driven and live.
        ai_insights = _resolve_ai_message(payload)
        
        insights_data = {
            'total_revenue': payload['total_revenue'],
            'total_sales': payload['total_sales'],
            'average_order_value': payload['average_order_value'],
            'hot_products': payload['hot_products'],
            'cold_products': payload['cold_products'],
            'restocking_needed': payload['restocking_needed'],
            'sales_trend': payload['sales_trend'],
            'ai_insights': ai_insights,
        }

        serializer = InsightsSerializer(insights_data)
        response = Response({
            'success': True,
            'data': serializer.data,
            'timestamp': timezone.localtime().isoformat(),
        }, status=status.HTTP_200_OK)
        return add_no_cache_headers(response)

    except Exception as exc:
        response = Response({
            'success': False,
            'error': str(exc),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_no_cache_headers(response)


@api_view(['GET'])
def get_live_insights(request):
    """Get live database insights without calling OpenAI."""
    try:
        payload = get_insights_payload()
        insights_data = {
            'total_revenue': payload['total_revenue'],
            'total_sales': payload['total_sales'],
            'average_order_value': payload['average_order_value'],
            'hot_products': payload['hot_products'],
            'cold_products': payload['cold_products'],
            'restocking_needed': payload['restocking_needed'],
            'sales_trend': payload['sales_trend'],
            'ai_insights': _resolve_ai_message(payload),
        }

        serializer = InsightsSerializer(insights_data)
        response = Response({
            'success': True,
            'data': serializer.data,
            'timestamp': timezone.localtime().isoformat(),
        }, status=status.HTTP_200_OK)
        return add_no_cache_headers(response)

    except Exception as exc:
        response = Response({
            'success': False,
            'error': str(exc),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_no_cache_headers(response)


@api_view(['GET'])
def get_pricing_optimization(request):
    """Get pricing optimization suggestions based on demand and margins"""
    try:
        suggestions = get_pricing_suggestions()
        response = Response({
            'success': True,
            'data': suggestions,
            'count': len(suggestions),
            'timestamp': timezone.localtime().isoformat(),
        }, status=status.HTTP_200_OK)
        return add_no_cache_headers(response)
    except Exception as exc:
        response = Response({
            'success': False,
            'error': str(exc),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_no_cache_headers(response)


@api_view(['GET'])
def get_high_demand_items(request):
    """Get high-demand items alerts"""
    try:
        alerts = get_demand_alerts()
        response = Response({
            'success': True,
            'data': alerts,
            'count': len(alerts),
            'timestamp': timezone.localtime().isoformat(),
        }, status=status.HTTP_200_OK)
        return add_no_cache_headers(response)
    except Exception as exc:
        response = Response({
            'success': False,
            'error': str(exc),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_no_cache_headers(response)


@api_view(['GET'])
def get_inventory_warnings(request):
    """Get inventory/stock warning alerts"""
    try:
        warnings = get_stock_warnings()
        response = Response({
            'success': True,
            'data': warnings,
            'count': len(warnings),
            'timestamp': timezone.localtime().isoformat(),
        }, status=status.HTTP_200_OK)
        return add_no_cache_headers(response)
    except Exception as exc:
        response = Response({
            'success': False,
            'error': str(exc),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_no_cache_headers(response)


@api_view(['GET', 'POST'])
def recommendations_list_create(request):
    """List saved recommendations and allow saving new recommendations."""
    if request.method == 'POST':
        serializer = InsightRecommendationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            response = Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            return add_no_cache_headers(response)

        payload = get_insights_payload()
        pricing = get_pricing_suggestions()
        demand = get_demand_alerts()
        stock = get_stock_warnings()

        record = InsightRecommendation.objects.create(
            recommendation_text=serializer.validated_data['recommendation_text'],
            context_snapshot={
                'total_sales': payload.get('total_sales', 0),
                'total_revenue': payload.get('total_revenue', 0),
                'pricing_suggestions_count': len(pricing),
                'demand_alerts_count': len(demand),
                'stock_warnings_count': len(stock),
                'live_recommendation': build_live_recommendation(payload, pricing, demand, stock),
            },
        )

        response = Response(
            {'success': True, 'data': InsightRecommendationSerializer(record).data},
            status=status.HTTP_201_CREATED,
        )
        return add_no_cache_headers(response)

    payload = get_insights_payload()
    pricing = get_pricing_suggestions()
    demand = get_demand_alerts()
    stock = get_stock_warnings()
    recommendations = InsightRecommendation.objects.all()[:10]

    response = Response(
        {
            'success': True,
            'live_recommendation': build_live_recommendation(payload, pricing, demand, stock),
            'data': InsightRecommendationSerializer(recommendations, many=True).data,
            'timestamp': timezone.localtime().isoformat(),
        },
        status=status.HTTP_200_OK,
    )
    return add_no_cache_headers(response)


@api_view(['GET'])
def get_live_nlp_report(request):
    """Get NLP report that blends live sales and live customer reviews."""
    try:
        period_days = int(request.query_params.get('days', 30))
        period_days = max(1, min(period_days, 365))

        report_payload = build_live_nlp_report(period_days=period_days)
        serializer = NLPReportSerializer(report_payload)

        response = Response(
            {
                'success': True,
                'data': serializer.data,
                'timestamp': timezone.localtime().isoformat(),
            },
            status=status.HTTP_200_OK,
        )
        return add_no_cache_headers(response)
    except Exception as exc:
        response = Response({'success': False, 'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_no_cache_headers(response)


@api_view(['GET', 'POST'])
def customer_reviews_list_create(request):
    """List live customer reviews or create a new one."""
    if request.method == 'POST':
        serializer = CustomerReviewCreateSerializer(data=request.data)
        if not serializer.is_valid():
            response = Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            return add_no_cache_headers(response)

        record = serializer.save()
        response = Response(
            {'success': True, 'data': CustomerReviewSerializer(record).data},
            status=status.HTTP_201_CREATED,
        )
        return add_no_cache_headers(response)

    limit = int(request.query_params.get('limit', 20))
    limit = max(1, min(limit, 100))
    reviews = CustomerReview.objects.all()[:limit]
    response = Response(
        {
            'success': True,
            'count': len(reviews),
            'data': CustomerReviewSerializer(reviews, many=True).data,
            'timestamp': timezone.localtime().isoformat(),
        },
        status=status.HTTP_200_OK,
    )
    return add_no_cache_headers(response)


@api_view(['GET'])
def get_smart_reorder_engine(request):
    """Get smart reorder recommendations from live sales and stock data."""
    try:
        period_days = int(request.query_params.get('days', 30))
        lead_time_days = int(request.query_params.get('lead_time_days', 7))
        coverage_days = int(request.query_params.get('coverage_days', 14))

        payload = get_smart_reorder_recommendations(
            period_days=period_days,
            lead_time_days=lead_time_days,
            coverage_days=coverage_days,
        )
        serializer = SmartReorderEngineSerializer(payload)

        response = Response(
            {
                'success': True,
                'data': serializer.data,
                'timestamp': timezone.localtime().isoformat(),
            },
            status=status.HTTP_200_OK,
        )
        return add_no_cache_headers(response)
    except Exception as exc:
        response = Response({'success': False, 'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_no_cache_headers(response)
