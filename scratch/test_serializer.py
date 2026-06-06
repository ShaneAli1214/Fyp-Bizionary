import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from accounts.serializers_api_config import APIConfigurationSerializer

def test_serializer():
    # Test valid groq key
    data = {
        'provider': 'groq',
        'api_key': 'gsk_12345678901234567890',
        'is_active': True
    }
    serializer = APIConfigurationSerializer(data=data)
    valid = serializer.is_valid()
    print("Is valid with correct format:", valid)
    if not valid:
        print("Errors:", serializer.errors)

    # Test invalid groq key (too short)
    data_short = {
        'provider': 'groq',
        'api_key': 'gsk_short',
        'is_active': True
    }
    serializer_short = APIConfigurationSerializer(data=data_short)
    print("Is valid with short key:", serializer_short.is_valid())
    print("Errors for short key:", serializer_short.errors)

if __name__ == '__main__':
    test_serializer()
