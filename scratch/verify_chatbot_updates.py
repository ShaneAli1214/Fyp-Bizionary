import os
import sys
import django
import json

# Setup Django Environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from chatbot.services import execute_tool, build_chat_messages, compress_history
from products.models import Product
from sales.models import Sale
from accounts.models import Expense

def test_fuzzy_matching():
    print("\n=== Testing Fuzzy Matching ===")
    
    # Try searching for a product name with typos, e.g. "Basmatii" instead of "Basmati Rice"
    # Ensure there is a product to match first
    product = Product.objects.first()
    if not product:
        print("Creating dummy product Basmati Rice for fuzzy testing...")
        product = Product.objects.create(
            name="Basmati Rice",
            sku="BASMATI-001",
            category="Grocery",
            stock_quantity=50,
            cost_price=100.00,
            unit_price=120.00,
            status="ACTIVE"
        )
    
    print(f"Database contains product: {product.name} ({product.sku})")
    
    # Test fuzzy matching via search_products tool
    result_json = execute_tool("search_products", {"query": "Basmatii"})
    print("Fuzzy Search Query: 'Basmatii'")
    print("Tool Output:", result_json)
    
    # Test fuzzy matching via create_sale
    result_json_sale = execute_tool("create_sale", {"product_name_or_sku": "basmati-002", "quantity": 1})
    print("Fuzzy Create Sale Query: 'basmati-002' (close to BASMATI-001)")
    print("Tool Output:", result_json_sale)

def test_conversational_state_building():
    print("\n=== Testing Conversational State & System Prompt ===")
    
    # Test system prompt rules are present in built messages
    messages = build_chat_messages("I want to create a sale", history=[])
    system_msg = messages[0]['content']
    
    print("Checking CONVERSATIONAL SALE RECORDING RULES in system prompt...")
    if "CONVERSATIONAL SALE RECORDING RULES" in system_msg:
        print("[SUCCESS] Found confirmation guidelines in system prompt.")
    else:
        print("[FAIL] Confirmation guidelines missing in system prompt.")
        
    print("Checking ANSWER RULES FOR REPORTS AND EXPORTS...")
    if "ANSWER RULES FOR REPORTS AND EXPORTS" in system_msg:
        print("[SUCCESS] Found report generation rules in system prompt.")
    else:
        print("[FAIL] Report generation rules missing in system prompt.")

def test_report_generation_tool():
    print("\n=== Testing Report Generation Tool ===")
    
    result_json = execute_tool("generate_report", {"report_type": "sales"})
    print("Generated Report Tool Result (sales):")
    print(result_json)
    
    result_json_invalid = execute_tool("generate_report", {"report_type": "unsupported"})
    print("Invalid Report Tool Result:")
    print(result_json_invalid)

def test_memory_compression():
    print("\n=== Testing Memory Compression ===")
    
    # Create artificial long conversation history (>10 turns)
    long_history = []
    for i in range(6):
        long_history.append({'role': 'user', 'content': f'Hello assistant, turn {i}'})
        long_history.append({'role': 'assistant', 'content': f'Hello user, response {i}'})
        
    print(f"Initial history size: {len(long_history)} messages.")
    
    # Compress history (Groq call might require active API key, we handle gracefully)
    compressed = compress_history(long_history)
    print(f"Compressed history size: {len(compressed)} messages.")
    print("Compressed Messages Structure:")
    for msg in compressed:
        print(f"- {msg['role']}: {msg['content'][:60]}...")

if __name__ == "__main__":
    test_fuzzy_matching()
    test_conversational_state_building()
    test_report_generation_tool()
    test_memory_compression()
