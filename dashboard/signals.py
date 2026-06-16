from django.db.models.signals import post_save, post_delete
from django.core.cache import cache

def clear_dashboard_cache(*args, **kwargs):
    cache.delete('dashboard_kpis_all')

# Models whose changes affect the dashboard KPI counts or sums
models_to_watch = [
    'products.Product',
    'sales.Sale',
    'purchases.Purchase',
    'purchases.OrderedSlip',
    'accounts.Expense',
    'invoices.Invoice',
    'accounts.InvoicePayment',
]

for model_str in models_to_watch:
    try:
        post_save.connect(clear_dashboard_cache, sender=model_str)
        post_delete.connect(clear_dashboard_cache, sender=model_str)
    except Exception:
        pass
