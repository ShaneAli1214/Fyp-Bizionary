import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from chatbot.services import generate_chatbot_response

def test_chart_queries():
    queries = [
        "Show a chart of revenue vs expenses",
        "Give me a visual bar chart of low stock products",
        "Show the expense category breakdown as a chart"
    ]
    
    for q in queries:
        print(f"\n===========================================")
        print(f"QUERY: {q}")
        print(f"===========================================")
        try:
            response = generate_chatbot_response(q)
            print("Response content:")
            print(response)
        except Exception as e:
            print("Error:", str(e))

if __name__ == '__main__':
    test_chart_queries()
