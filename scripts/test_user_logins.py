import os
import sys
import django
import json

# Add project root directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Bootstrap Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.conf import settings
# Add testserver to ALLOWED_HOSTS for test client compatibility
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.test import Client

def run_tests():
    c = Client()
    users_to_test = [
        {'username': 'admin', 'email': 'admin@bizionary.com'},
        {'username': 'accountant', 'email': 'accountant@bizionary.com'},
        {'username': 'inventory', 'email': 'inventory@bizionary.com'},
        {'username': 'sales', 'email': 'sales@bizionary.com'},
    ]
    password = 'Bizionary123!'
    endpoint = '/api/user-management/auth/login/'
    
    print("=" * 60)
    print("RUNNING LOGIN API AUTHENTICATION TESTS")
    print("=" * 60)
    
    all_success = True
    
    for user_info in users_to_test:
        username = user_info['username']
        email = user_info['email']
        
        # Test 1: Authenticating using email
        print(f"Testing {username} via email login ({email})...")
        payload = {'email': email, 'password': password}
        response = c.post(endpoint, data=json.dumps(payload), content_type='application/json')
        
        if response.status_code == 200:
            res_data = response.json()
            is_success = res_data.get('success')
            pwd_change = res_data.get('password_change_required', False)
            tfa_required = res_data.get('two_factor_required', False)
            token = res_data.get('token')
            
            if is_success and not pwd_change and not tfa_required and token:
                print(f"  [SUCCESS] Email Login Success! Token generated.")
            else:
                print(f"  [FAIL] Email Login Failed state checks: success={is_success}, pwd_change={pwd_change}, 2fa={tfa_required}")
                all_success = False
        else:
            print(f"  [FAIL] Email Login failed with HTTP status code {response.status_code}. Response: {response.content}")
            all_success = False
            
        # Test 2: Authenticating using username
        print(f"Testing {username} via username login ({username})...")
        payload = {'email': username, 'password': password}
        response = c.post(endpoint, data=json.dumps(payload), content_type='application/json')
        
        if response.status_code == 200:
            res_data = response.json()
            is_success = res_data.get('success')
            pwd_change = res_data.get('password_change_required', False)
            tfa_required = res_data.get('two_factor_required', False)
            token = res_data.get('token')
            
            if is_success and not pwd_change and not tfa_required and token:
                print(f"  [SUCCESS] Username Login Success! Token generated.")
            else:
                print(f"  [FAIL] Username Login Failed state checks: success={is_success}, pwd_change={pwd_change}, 2fa={tfa_required}")
                all_success = False
        else:
            print(f"  [FAIL] Username Login failed with HTTP status code {response.status_code}. Response: {response.content}")
            all_success = False
            
        print("-" * 60)
        
    if all_success:
        print("ALL LOGIN TESTS PASSED SUCCESSFULLY! No errors/redirects detected.")
        sys.exit(0)
    else:
        print("SOME LOGIN TESTS FAILED.")
        sys.exit(1)

if __name__ == '__main__':
    run_tests()
