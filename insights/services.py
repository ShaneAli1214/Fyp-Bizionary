from datetime import datetime, timedelta
from math import ceil
from django.utils import timezone
from django.db import connection, reset_queries
from django.db.models import Count, Avg, Sum
import openai
from django.conf import settings
from accounts.api_config_utils import get_active_api_key
from .models import InsightCache, CustomerReview

try:
    from sales.models import Sale
    from products.models import Product
except ImportError:
    Sale = None
    Product = None


def _get_openai_client():
    """
    Get OpenAI API key with the following priority:
    1. Database configuration (if active)
    2. Django settings
    """
    api_key = get_active_api_key('openai') or settings.OPENAI_API_KEY or ''
    return api_key if api_key else None


def get_main_recommendation_opt_in():
    """Check if user has consented to push live recommendation to main AI tab."""
    cache = InsightCache.objects.filter(insight_type='general').first()
    if not cache or not isinstance(cache.data, dict):
        return False
    return bool(cache.data.get('push_live_recommendation_to_main', False))


def get_custom_main_recommendation_text():
    """Get optional user-customized recommendation text for main AI tab."""
    cache = InsightCache.objects.filter(insight_type='general').first()
    if not cache or not isinstance(cache.data, dict):
        return ''
    return str(cache.data.get('custom_main_recommendation_text', '') or '').strip()


def set_main_recommendation_opt_in(enabled):
    """Persist user consent for pushing live recommendation to the main AI tab."""
    cache, _ = InsightCache.objects.get_or_create(
        insight_type='general',
        defaults={'data': {}, 'ai_analysis': 'settings'},
    )
    current_data = cache.data if isinstance(cache.data, dict) else {}
    current_data['push_live_recommendation_to_main'] = bool(enabled)
    cache.data = current_data
    cache.ai_analysis = 'settings'
    cache.save(update_fields=['data', 'ai_analysis', 'updated_at'])
    return bool(enabled)


def set_custom_main_recommendation_text(custom_text):
    """Persist optional custom recommendation text used with live sales context."""
    cache, _ = InsightCache.objects.get_or_create(
        insight_type='general',
        defaults={'data': {}, 'ai_analysis': 'settings'},
    )
    current_data = cache.data if isinstance(cache.data, dict) else {}
    current_data['custom_main_recommendation_text'] = str(custom_text or '').strip()
    cache.data = current_data
    cache.ai_analysis = 'settings'
    cache.save(update_fields=['data', 'ai_analysis', 'updated_at'])
    return current_data['custom_main_recommendation_text']


def get_sales_data():
    """Fetch recent sales data - always fresh from DB"""
    if not Sale:
        return []
    
    # Force fresh database query
    reset_queries()
    thirty_days_ago = timezone.now() - timedelta(days=30)
    sales = list(Sale.objects.filter(sale_date__gte=thirty_days_ago).values(
        'product', 'quantity_sold', 'total_price', 'unit_price', 'sale_date'
    ))
    return sales


def get_product_performance():
    """Analyze product performance: hot sellers, cold sellers, restocking needs - always fresh"""
    if not Sale or not Product:
        return {
            'hot_products': [],
            'cold_products': [],
            'restocking_needed': [],
        }
    
    reset_queries()
    products = list(Product.objects.all())
    product_stats = []
    
    for product in products:
        sales_count = Sale.objects.filter(product=product).count()
        sales_list = list(Sale.objects.filter(product=product).values('total_price'))
        total_revenue = sum(float(s.get('total_price') or 0) for s in sales_list)
        
        stock_level = getattr(product, 'stock_quantity', 0)
        reorder_level = getattr(product, 'reorder_level', 10)
        
        # Stock status based on 100-unit threshold
        status = 'adequate'
        if stock_level < 100:
            status = 'low'
        elif stock_level > 300:
            status = 'overstocked'
        
        trend = 'stable'
        if sales_count > 5:
            trend = 'hot'
        elif sales_count < 2:
            trend = 'cold'
        
        product_stats.append({
            'product_id': product.id,
            'product_name': product.name or f'Product {product.id}',
            'category': getattr(product, 'category', 'Uncategorized'),
            'total_sales': sales_count,
            'total_revenue': total_revenue,
            'stock_level': stock_level,
            'reorder_level': reorder_level,
            'status': status,
            'trend': trend,
        })
    
    # Sort and categorize
    sorted_by_sales = sorted(product_stats, key=lambda x: x['total_sales'], reverse=True)
    
    return {
        'hot_products': sorted_by_sales[:5],
        'cold_products': sorted_by_sales[-5:] if len(sorted_by_sales) > 5 else [],
        'restocking_needed': [p for p in product_stats if p['status'] == 'low'][:10],
    }


def generate_ai_insights(sales_data, product_performance):
    """Generate AI insights using OpenAI"""
    try:
        api_key = _get_openai_client()
        if not api_key:
            return "AI insights unavailable: OpenAI API key not configured. Please set it in the Admin Panel under Settings > API Configuration."
        
        openai.api_key = api_key
        
        total_sales = len(sales_data)
        total_revenue = sum(float(s.get('sale_price', 0) or 0) * s.get('quantity', 1) for s in sales_data)
        
        hot_products_summary = '\n'.join([
            f"- {p['product_name']}: {p['total_sales']} sales, ₨{p['total_revenue']:,.2f} revenue"
            for p in product_performance.get('hot_products', [])[:3]
        ])
        
        restocking_summary = '\n'.join([
            f"- {p['product_name']}: {p['stock_level']} units (Reorder Level: {p['reorder_level']})"
            for p in product_performance.get('restocking_needed', [])[:3]
        ])
        
        prompt = f"""Based on the following sales and inventory data, provide actionable business insights and recommendations:

SALES SUMMARY:
- Total Sales (30 days): {total_sales}
- Total Revenue: ₨{total_revenue:,.2f}
- Average Order Value: ₨{total_revenue / max(total_sales, 1):,.2f}

HOT SELLING PRODUCTS:
{hot_products_summary or 'No sales data available'}

PRODUCTS NEEDING RESTOCKING:
{restocking_summary or 'No restocking needed'}

Please provide 3-4 concise, actionable insights and recommendations for improving sales and inventory management. Focus on what actions should be taken immediately."""
        
        response = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a business intelligence expert providing actionable insights for e-commerce and inventory management.'
                },
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.7,
            max_tokens=300,
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        return f"Unable to generate AI insights at this moment. Error: {str(e)}"


def get_sales_trend():
    """Get daily sales trend for the last 30 days - always fresh"""
    if not Sale:
        return []
    
    reset_queries()
    thirty_days_ago = timezone.now() - timedelta(days=30)
    daily_sales = {}
    
    sales = list(Sale.objects.filter(sale_date__gte=thirty_days_ago).values('sale_date', 'quantity_sold'))
    for sale in sales:
        date_key = sale['sale_date'].strftime('%Y-%m-%d') if hasattr(sale['sale_date'], 'strftime') else str(sale['sale_date'])
        daily_sales[date_key] = daily_sales.get(date_key, 0) + (sale.get('quantity_sold') or 1)
    
    return [
        {'date': date, 'sales': count}
        for date, count in sorted(daily_sales.items())
    ]


def get_insights_payload():
    """Build the base insights payload from database data."""
    sales_data = get_sales_data()
    product_performance = get_product_performance()
    sales_trend = get_sales_trend()

    total_revenue = sum(
        float(s.get('total_price', 0) or 0)
        for s in sales_data
    )
    total_sales = len(sales_data)
    average_order_value = total_revenue / max(total_sales, 1)

    return {
        'sales_data': sales_data,
        'product_performance': product_performance,
        'sales_trend': sales_trend,
        'total_revenue': total_revenue,
        'total_sales': total_sales,
        'average_order_value': average_order_value,
        'hot_products': product_performance.get('hot_products', []),
        'cold_products': product_performance.get('cold_products', []),
        'restocking_needed': product_performance.get('restocking_needed', []),
    }


def build_live_insights_message(insights_payload):
    """Build a live insights summary message from database metrics."""
    if insights_payload['total_sales'] == 0:
        return 'No recent sales data available yet. Start recording sales to populate live insights.'

    top_hot = ', '.join([p['product_name'] for p in insights_payload['hot_products'][:3]])
    restock_count = len(insights_payload['restocking_needed'])

    return (
        f"Live update: {insights_payload['total_sales']} sales generated "
        f"₨{insights_payload['total_revenue']:.0f} revenue in the last 30 days. "
        f"Top products: {top_hot or 'N/A'}. "
        f"{restock_count} product(s) need restocking right now."
    )


def get_pricing_suggestions():
    """Get pricing optimization suggestions based on demand and margins"""
    if not Sale or not Product:
        return []
    
    reset_queries()
    suggestions = []
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    products = list(Product.objects.all())
    for product in products:
        # Get sales in last 30 days
        recent_sales = list(Sale.objects.filter(
            product=product,
            sale_date__gte=thirty_days_ago
        ).values('unit_price', 'quantity_sold', 'total_price'))
        
        if not recent_sales:
            continue
            
        sales_count = len(recent_sales)
        total_units = sum(int(s.get('quantity_sold') or 0) for s in recent_sales)
        avg_price = sum(float(s['unit_price']) for s in recent_sales) / len(recent_sales) if recent_sales else 0

        # Surface a pricing signal after every sale.
        if sales_count >= 1:
            current_unit_price = float(product.unit_price or avg_price)

            if sales_count >= 10:
                change_factor = 1.10
                action = 'INCREASE'
                reason = f'Hot selling ({sales_count} orders in 30 days) - increase price by 10%'
            elif sales_count >= 4:
                change_factor = 1.05
                action = 'INCREASE'
                reason = f'Steady demand ({sales_count} orders in 30 days) - increase price by 5%'
            else:
                change_factor = 0.95
                action = 'DISCOUNT'
                reason = f'Low demand ({sales_count} orders in 30 days) - offer 5% discount'

            suggested_price = current_unit_price * change_factor
            revenue_delta = (suggested_price - current_unit_price) * max(total_units, 1)

            suggestions.append({
                'product_id': product.id,
                'product_name': product.name,
                'current_price': round(current_unit_price, 2),
                'suggested_price': round(suggested_price, 2),
                'sales_in_30_days': sales_count,
                'units_in_30_days': total_units,
                'price_action': action,
                'potential_revenue_increase': round(revenue_delta, 2),
                'reason': reason,
            })
    
    return sorted(suggestions, key=lambda x: x['potential_revenue_increase'], reverse=True)[:15]


def get_demand_alerts():
    """Get high-demand items (spike in sales or consistent high sales)"""
    if not Sale or not Product:
        return []
    
    reset_queries()
    alerts = []
    thirty_days_ago = timezone.now() - timedelta(days=30)
    seven_days_ago = timezone.now() - timedelta(days=7)
    
    products = list(Product.objects.all())
    for product in products:
        sales_30d = Sale.objects.filter(
            product=product,
            sale_date__gte=thirty_days_ago
        ).count()
        sales_7d = Sale.objects.filter(
            product=product,
            sale_date__gte=seven_days_ago
        ).count()
        
        # Create a demand signal as soon as sales start.
        if sales_30d >= 1:
            velocity = (sales_7d / max(sales_30d, 1)) * 100
            if sales_30d >= 10:
                alert_type = 'HOT_SELLING'
                recommendation = 'Hot selling - restock urgently and consider premium pricing'
            elif sales_30d >= 5:
                alert_type = 'TRENDING'
                recommendation = 'Demand is rising - prepare additional stock'
            else:
                alert_type = 'EMERGING'
                recommendation = 'New demand detected - monitor daily and run targeted promotion'

            alerts.append({
                'product_id': product.id,
                'product_name': product.name,
                'sales_30d': sales_30d,
                'sales_7d': sales_7d,
                'sales_velocity_percent': round(velocity, 1),
                'alert_type': alert_type,
                'recommendation': recommendation,
            })
    
    return sorted(alerts, key=lambda x: x['sales_30d'], reverse=True)[:20]


def get_stock_warnings():
    """Get stock warning alerts for low inventory (< 100 units)"""
    if not Product:
        return []
    
    reset_queries()
    warnings = []
    products = list(Product.objects.all())
    
    for product in products:
        stock_level = getattr(product, 'stock_quantity', 0)
        reorder_level = getattr(product, 'reorder_level', 10)
        
        # Keep stock alerts dynamic by comparing against each product's reorder level.
        caution_level = max(reorder_level * 2, 20)
        warning_level = max(reorder_level, 10)

        if stock_level <= caution_level:
            if stock_level <= warning_level:
                urgency = 'CRITICAL'
            elif stock_level <= caution_level * 0.75:
                urgency = 'WARNING'
            else:
                urgency = 'CAUTION'

            warnings.append({
                'product_id': product.id,
                'product_name': product.name,
                'current_stock': stock_level,
                'reorder_level': reorder_level,
                'urgency': urgency,
                'recommended_order_qty': max(caution_level - stock_level, reorder_level * 2),
            })
    
    return sorted(warnings, key=lambda x: (x['urgency'] == 'CRITICAL', x['urgency'] == 'WARNING', x['current_stock']))


def build_live_recommendation(insights_payload, pricing_suggestions, demand_alerts, stock_warnings):
    """Create a recommendation that updates as sales and inventory data changes."""
    total_sales = insights_payload.get('total_sales', 0)
    total_revenue = insights_payload.get('total_revenue', 0)
    cold_products = insights_payload.get('cold_products', [])

    # Prefer discount actions for low-selling products when available.
    discount_candidate = next(
        (item for item in pricing_suggestions if item.get('price_action') == 'DISCOUNT'),
        None,
    )

    if discount_candidate:
        return (
            f"Run a 5% discount on {discount_candidate['product_name']} to improve demand. "
            f"Suggested price: {discount_candidate['suggested_price']} from {discount_candidate['current_price']}."
        )

    if cold_products:
        product = cold_products[0]
        return (
            f"{product['product_name']} is low-selling. Apply a 5-10% promotional discount and bundle offer this week."
        )

    if stock_warnings:
        top_stock = stock_warnings[0]
        return (
            f"Restock {top_stock['product_name']} first. "
            f"Current stock is {top_stock['current_stock']} ({top_stock['urgency']})."
        )

    if demand_alerts:
        top_demand = demand_alerts[0]
        return (
            f"{top_demand['product_name']} is {top_demand['alert_type'].lower().replace('_', ' ')}. "
            "Increase inventory coverage for the next 7 days."
        )

    if pricing_suggestions:
        top_price = pricing_suggestions[0]
        action = 'increase' if top_price.get('price_action') == 'INCREASE' else 'discount'
        return (
            f"{top_price['product_name']} should {action} price from "
            f"{top_price['current_price']} to {top_price['suggested_price']}."
        )

    if total_sales > 0:
        return (
            f"You recorded {total_sales} sales with revenue {round(total_revenue, 2)} in the last 30 days. "
            "Keep monitoring top-selling SKUs daily."
        )

    return "No sales yet. Start with a launch promotion and capture first-week demand signals."


def build_daily_ai_recommendation(insights_payload, pricing_suggestions, demand_alerts, stock_warnings):
    """Build one automatic recommendation that changes daily using live data."""
    # Use host local date so daily rotation matches the business day in local usage.
    today = datetime.now().date()
    day_key = today.day % 3

    # Rotate focus daily so recommendation naturally changes day-to-day.
    if day_key == 0 and stock_warnings:
        top_stock = stock_warnings[0]
        return (
            f"Daily AI Recommendation ({today}): Restock {top_stock['product_name']} today. "
            f"Current stock is {top_stock['current_stock']} ({top_stock['urgency']})."
        )

    if day_key == 1 and demand_alerts:
        top_demand = demand_alerts[0]
        return (
            f"Daily AI Recommendation ({today}): {top_demand['product_name']} is "
            f"{top_demand['alert_type'].lower().replace('_', ' ')}. Increase availability for the next 48 hours."
        )

    if pricing_suggestions:
        top_price = next(
            (item for item in pricing_suggestions if item.get('price_action') == 'DISCOUNT'),
            pricing_suggestions[0],
        )
        action = 'increase' if top_price.get('price_action') == 'INCREASE' else 'discount'
        return (
            f"Daily AI Recommendation ({today}): {action.title()} price for {top_price['product_name']} "
            f"from {top_price['current_price']} to {top_price['suggested_price']}."
        )

    # Fallback to live recommendation if no category-specific signal exists.
    base = build_live_recommendation(insights_payload, pricing_suggestions, demand_alerts, stock_warnings)
    return f"Daily AI Recommendation ({today}): {base}"


def analyze_review_sentiment(review_text, rating):
    """Infer sentiment from review text and star rating."""
    positive_words = {
        'good', 'great', 'excellent', 'amazing', 'fast', 'helpful', 'best',
        'love', 'satisfied', 'awesome', 'perfect', 'quality', 'recommended',
    }
    negative_words = {
        'bad', 'poor', 'late', 'slow', 'worse', 'worst', 'broken', 'issue',
        'problem', 'refund', 'disappointed', 'low', 'delay', 'damaged',
    }

    words = str(review_text or '').lower().split()
    positive_hits = sum(1 for word in words if word.strip('.,!?') in positive_words)
    negative_hits = sum(1 for word in words if word.strip('.,!?') in negative_words)

    # Blend lexical signal with rating so scores remain useful for short reviews.
    lexical_score = positive_hits - negative_hits
    rating_score = float(rating or 3) - 3.0
    score = round((lexical_score * 0.3) + (rating_score * 0.7), 2)

    if score > 0.4:
        return 'positive', score
    if score < -0.4:
        return 'negative', score
    return 'neutral', score


def get_customer_reviews_snapshot(days=30):
    """Return live customer review analytics for NLP reporting."""
    since = timezone.now() - timedelta(days=days)
    reviews_qs = CustomerReview.objects.filter(created_at__gte=since)

    counts = reviews_qs.values('sentiment_label').annotate(total=Count('id'))
    sentiment_counts = {'positive': 0, 'neutral': 0, 'negative': 0}
    for row in counts:
        sentiment = row.get('sentiment_label')
        if sentiment in sentiment_counts:
            sentiment_counts[sentiment] = row.get('total', 0)

    total_reviews = reviews_qs.count()
    avg_rating = reviews_qs.aggregate(value=Avg('rating')).get('value') or 0.0

    return {
        'total_reviews': total_reviews,
        'average_rating': round(float(avg_rating), 2),
        'positive_reviews': sentiment_counts['positive'],
        'neutral_reviews': sentiment_counts['neutral'],
        'negative_reviews': sentiment_counts['negative'],
        'positive_ratio': round(
            (sentiment_counts['positive'] / total_reviews) * 100 if total_reviews else 0.0,
            1,
        ),
        'negative_ratio': round(
            (sentiment_counts['negative'] / total_reviews) * 100 if total_reviews else 0.0,
            1,
        ),
    }


def build_live_nlp_report(period_days=30):
    """Build NLP report payload from live sales and review data."""
    payload = get_insights_payload()
    review_summary = get_customer_reviews_snapshot(days=period_days)
    recent_reviews = list(CustomerReview.objects.all()[:10])

    key_findings = []
    total_sales = payload.get('total_sales', 0)
    total_revenue = round(payload.get('total_revenue', 0.0), 2)
    avg_order_value = round(payload.get('average_order_value', 0.0), 2)

    key_findings.append(
        f"Live sales snapshot: {total_sales} sale(s), revenue Rs {total_revenue}, average order value Rs {avg_order_value}."
    )

    if review_summary['total_reviews']:
        key_findings.append(
            f"Customer voice: {review_summary['total_reviews']} review(s), average rating {review_summary['average_rating']}/5, "
            f"positive sentiment {review_summary['positive_ratio']}%."
        )
    else:
        key_findings.append('No customer reviews submitted yet. Collect feedback after each sale.')

    if review_summary['negative_reviews'] > review_summary['positive_reviews']:
        recommendation = (
            'Negative feedback is leading. Prioritize service recovery calls and offer targeted discount vouchers to dissatisfied customers.'
        )
    elif payload.get('restocking_needed'):
        top_restock = payload['restocking_needed'][0]['product_name']
        recommendation = (
            f"Demand exists but stock is constrained. Restock {top_restock} immediately to protect customer experience."
        )
    else:
        recommendation = (
            'Customer sentiment is stable. Continue weekly follow-ups and upsell top-selling products to highly satisfied customers.'
        )

    return {
        'generated_at': timezone.localtime(),
        'period_days': int(period_days),
        'sales_summary': {
            'total_sales': total_sales,
            'total_revenue': total_revenue,
            'average_order_value': avg_order_value,
            'hot_products': payload.get('hot_products', [])[:5],
            'restocking_needed': payload.get('restocking_needed', [])[:5],
        },
        'review_summary': review_summary,
        'key_findings': key_findings,
        'recommendation': recommendation,
        'recent_reviews': recent_reviews,
    }


def get_smart_reorder_recommendations(period_days=30, lead_time_days=7, coverage_days=14):
    """Build smart reorder recommendations from live sales and inventory data."""
    if not Product:
        return {
            'generated_at': timezone.localtime(),
            'period_days': int(period_days),
            'lead_time_days': int(lead_time_days),
            'coverage_days': int(coverage_days),
            'total_products_evaluated': 0,
            'total_products_to_reorder': 0,
            'total_discontinue_candidates': 0,
            'recommendations': [],
            'discontinue_candidates': [],
            'product_planning': [],
        }

    period_days = max(1, min(int(period_days), 365))
    lead_time_days = max(1, min(int(lead_time_days), 90))
    coverage_days = max(1, min(int(coverage_days), 180))

    reset_queries()
    now = timezone.now()
    since = now - timedelta(days=period_days)
    recent_window_days = min(7, period_days)
    recent_since = now - timedelta(days=recent_window_days)

    sales_units = {}
    sales_counts = {}
    if Sale:
        aggregate_30d = Sale.objects.filter(sale_date__gte=since).values('product').annotate(
            total_units=Sum('quantity_sold'),
            sales_count=Count('id'),
        )
        for row in aggregate_30d:
            product_id = row.get('product')
            sales_units[product_id] = int(row.get('total_units') or 0)
            sales_counts[product_id] = int(row.get('sales_count') or 0)

        aggregate_recent = Sale.objects.filter(sale_date__gte=recent_since).values('product').annotate(
            total_units=Sum('quantity_sold'),
        )
        recent_units = {row.get('product'): int(row.get('total_units') or 0) for row in aggregate_recent}
    else:
        recent_units = {}

    recommendations = []
    discontinue_candidates = []
    product_planning = []
    products = list(Product.objects.all())

    for product in products:
        product_id = product.id
        current_stock = int(getattr(product, 'stock_quantity', 0) or 0)
        reorder_level = int(getattr(product, 'reorder_level', 0) or 0)
        unit_price = float(getattr(product, 'unit_price', 0) or 0)

        units_sold_period = int(sales_units.get(product_id, 0))
        sales_count_period = int(sales_counts.get(product_id, 0))
        units_sold_recent = int(recent_units.get(product_id, 0))

        avg_daily_demand = units_sold_period / float(period_days)
        recent_daily_demand = units_sold_recent / float(recent_window_days)
        weighted_daily_demand = max(0.0, (avg_daily_demand * 0.6) + (recent_daily_demand * 0.4))

        safety_stock = max(reorder_level, int(ceil(weighted_daily_demand * 3)))
        target_stock = int(ceil(weighted_daily_demand * (lead_time_days + coverage_days))) + safety_stock

        if weighted_daily_demand == 0:
            target_stock = max(target_stock, reorder_level)

        reorder_quantity = max(0, target_stock - current_stock)
        days_to_stockout = (current_stock / weighted_daily_demand) if weighted_daily_demand > 0 else None

        if weighted_daily_demand >= 2:
            demand_band = 'HIGH'
        elif weighted_daily_demand >= 0.75:
            demand_band = 'MEDIUM'
        elif weighted_daily_demand >= 0.15:
            demand_band = 'LOW'
        else:
            demand_band = 'NO_DEMAND'

        discontinue_recommendation = 'KEEP'
        discontinue_reason = 'Demand profile is healthy for current stock position.'

        overstock_multiple = (current_stock / max(reorder_level, 1)) if reorder_level > 0 else float(current_stock)
        stale_inventory = units_sold_period == 0 and current_stock > max(reorder_level * 2, 10)
        very_low_movement = units_sold_period <= 1 and current_stock > max(reorder_level * 2, 15)
        weak_demand_overstock = weighted_daily_demand < 0.15 and overstock_multiple >= 3

        if stale_inventory:
            discontinue_recommendation = 'DISCONTINUE'
            discontinue_reason = 'No unit sold in selected period while inventory remains high.'
        elif weak_demand_overstock or very_low_movement:
            discontinue_recommendation = 'PHASE_DOWN'
            discontinue_reason = 'Very low demand relative to inventory. Stop fresh purchasing and clear stock first.'

        urgency = 'NONE'
        urgency_weight = 0

        if reorder_quantity > 0:
            if current_stock <= 0 or (days_to_stockout is not None and days_to_stockout <= lead_time_days):
                urgency = 'CRITICAL'
                urgency_weight = 3
            elif current_stock <= reorder_level or (days_to_stockout is not None and days_to_stockout <= (lead_time_days + 3)):
                urgency = 'WARNING'
                urgency_weight = 2
            else:
                urgency = 'PLANNED'
                urgency_weight = 1

        priority_score = round((reorder_quantity * 0.5) + (weighted_daily_demand * 8) + (urgency_weight * 25), 2)
        estimated_cost = round(reorder_quantity * unit_price, 2)

        row = {
            'product_id': product_id,
            'product_name': product.name,
            'sku': product.sku,
            'current_stock': current_stock,
            'reorder_level': reorder_level,
            'units_sold_period': units_sold_period,
            'sales_count_period': sales_count_period,
            'avg_daily_demand': round(avg_daily_demand, 2),
            'weighted_daily_demand': round(weighted_daily_demand, 2),
            'demand_band': demand_band,
            'lead_time_days': lead_time_days,
            'coverage_days': coverage_days,
            'target_stock': target_stock,
            'recommended_order_quantity': reorder_quantity,
            'days_to_stockout': round(days_to_stockout, 1) if days_to_stockout is not None else None,
            'urgency': urgency,
            'priority_score': priority_score,
            'estimated_order_cost': estimated_cost,
            'discontinue_recommendation': discontinue_recommendation,
            'discontinue_reason': discontinue_reason,
        }

        product_planning.append(row)

        if reorder_quantity > 0:
            recommendations.append(row)

        if discontinue_recommendation in {'DISCONTINUE', 'PHASE_DOWN'}:
            discontinue_candidates.append(row)

    recommendations = sorted(
        recommendations,
        key=lambda row: (
            row['urgency'] == 'CRITICAL',
            row['urgency'] == 'WARNING',
            row['priority_score'],
        ),
        reverse=True,
    )

    discontinue_candidates = sorted(
        discontinue_candidates,
        key=lambda row: (
            row['discontinue_recommendation'] == 'DISCONTINUE',
            row['demand_band'] == 'NO_DEMAND',
            row['current_stock'],
        ),
        reverse=True,
    )

    product_planning = sorted(
        product_planning,
        key=lambda row: (
            row['recommended_order_quantity'] > 0,
            row['urgency'] == 'CRITICAL',
            row['priority_score'],
        ),
        reverse=True,
    )

    return {
        'generated_at': timezone.localtime(),
        'period_days': period_days,
        'lead_time_days': lead_time_days,
        'coverage_days': coverage_days,
        'total_products_evaluated': len(products),
        'total_products_to_reorder': len(recommendations),
        'total_discontinue_candidates': len(discontinue_candidates),
        'recommendations': recommendations[:25],
        'discontinue_candidates': discontinue_candidates[:25],
        'product_planning': product_planning,
    }
