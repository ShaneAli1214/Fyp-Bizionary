import os
import sys
import django

# Add project root directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Bootstrap Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from user_management.models import ERPUser, Role, Department

users_data = [
    {
        'username': 'admin',
        'email': 'admin@bizionary.com',
        'role_name': 'Admin',
        'dept_name': 'Administration',
        'first_name': 'System',
        'last_name': 'Administrator',
    },
    {
        'username': 'accountant',
        'email': 'accountant@bizionary.com',
        'role_name': 'Accountant',
        'dept_name': 'Finance Dept',
        'first_name': 'Finance',
        'last_name': 'Accountant',
    },
    {
        'username': 'inventory',
        'email': 'inventory@bizionary.com',
        'role_name': 'Inventory Manager',
        'dept_name': 'Inventory Dept',
        'first_name': 'Inventory',
        'last_name': 'Manager',
    },
    {
        'username': 'sales',
        'email': 'sales@bizionary.com',
        'role_name': 'Sales Manager',
        'dept_name': 'Sales Dept',
        'first_name': 'Sales',
        'last_name': 'Manager',
    }
]

password = 'Bizionary123!'

print("Starting user credentials update...")

for ud in users_data:
    try:
        user = ERPUser.objects.filter(username=ud['username']).first()
        if not user:
            user = ERPUser.objects.filter(email=ud['email']).first()
        
        if not user:
            print(f"Creating new user {ud['username']}...")
            user = ERPUser(username=ud['username'], email=ud['email'])
        
        user.first_name = ud['first_name']
        user.last_name = ud['last_name']
        
        # Assign role (create if doesn't exist)
        role_level = 'ADMIN' if ud['role_name'] == 'Admin' else 'MANAGER'
        role, _ = Role.objects.get_or_create(
            name=ud['role_name'],
            defaults={
                'level': role_level,
                'description': f"{ud['role_name']} default role"
            }
        )
        user.role = role
            
        # Assign department (create if doesn't exist)
        dept, _ = Department.objects.get_or_create(
            name=ud['dept_name'],
            defaults={'description': f"{ud['dept_name']} default department"}
        )
        user.department = dept
        
        user.set_password(password)
        user.status = 'ACTIVE'
        user.is_active = True
        user.requires_password_change = False
        user.two_factor_enabled = False
        user.save()
        print(f"Successfully updated user {user.username} (email: {user.email})")
    except Exception as e:
        print(f"Error processing {ud['username']}: {str(e)}")

print("Finished updating user credentials.")
