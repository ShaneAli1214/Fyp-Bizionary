import os, django, json
os.environ['DJANGO_SETTINGS_MODULE'] = 'erp_system.settings'
django.setup()

from chatbot.services import execute_tool

# Test 1: fuzzy match 'Electronic'
result = execute_tool('get_sales_by_category', {'category': 'Electronic'})
data = json.loads(result)
print('--- Electronic Category Query ---')
print(json.dumps(data, indent=2))

# Test 2: All categories
result2 = execute_tool('get_sales_by_category', {})
data2 = json.loads(result2)
print('\n--- All Categories Summary ---')
for item in data2.get('data', []):
    print(f"  {item['category']}: qty={item['total_quantity_sold']}, revenue={item['total_revenue']}, txns={item['total_transactions']}")
