import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from user_management.models import ERPUser
from django.contrib.auth.models import User

print("Total ERPUser count:", ERPUser.objects.count())
for user in ERPUser.objects.all():
    print(f"  Username: {user.username}, Role: {user.role if hasattr(user, 'role') else 'N/A'}, Department: {user.department if hasattr(user, 'department') else 'N/A'}, Full Name: {user.get_full_name()}")
