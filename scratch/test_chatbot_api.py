import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from chatbot.services import generate_chatbot_response, _get_groq_api_key
from accounts.models_api_config import APIConfiguration

def run_tests():
    print("--- Checking API Key Resolution ---")
    api_key = _get_groq_api_key()
    print(f"Resolved key from settings/env/db: '{api_key[:10] if api_key else 'None'}...'")

    print("\n--- Testing Local Question (Revenue Query) ---")
    try:
        # This question should be answered locally by querying SQLite without hitting the Groq API
        response = generate_chatbot_response("What is our current revenue?")
        print("Success! Response:")
        print(response)
    except Exception as e:
        print("Failed local query:", str(e))

    print("\n--- Testing API Question (Requires Groq Key) ---")
    try:
        # This question requires the Groq API key and will either succeed or fail with key error
        response = generate_chatbot_response("Hello, tell me about yourself.")
        print("Success! Response:")
        print(response)
    except RuntimeError as e:
        print("Got expected error if Groq key is missing:")
        print(f"Error message: {str(e)}")
    except Exception as e:
        print("Got unexpected error:", str(e))

if __name__ == '__main__':
    run_tests()
