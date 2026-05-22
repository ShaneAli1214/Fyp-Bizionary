from django.urls import path
from .views import (
    get_insights,
    get_live_insights,
    get_pricing_optimization,
    get_high_demand_items,
    get_inventory_warnings,
    recommendations_list_create,
    get_live_nlp_report,
    customer_reviews_list_create,
    get_smart_reorder_engine,
)

urlpatterns = [
    path('', get_insights, name='insights'),
    path('live/', get_live_insights, name='insights-live'),
    path('pricing/', get_pricing_optimization, name='pricing-optimization'),
    path('demand-alerts/', get_high_demand_items, name='demand-alerts'),
    path('stock-warnings/', get_inventory_warnings, name='stock-warnings'),
    path('recommendations/', recommendations_list_create, name='insights-recommendations'),
    path('nlp-report/live/', get_live_nlp_report, name='insights-nlp-report-live'),
    path('customer-reviews/', customer_reviews_list_create, name='insights-customer-reviews'),
    path('smart-reorder/', get_smart_reorder_engine, name='insights-smart-reorder'),
]
