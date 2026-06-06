import os
import django
from django.utils import timezone
from datetime import date

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from user_management.models import Department, Role, Module, ERPUser, Permission, ActivityLog

def seed_database():
    print("Starting database seeding for BIZIONARY User Management...")
    
    # 1. Seed Departments
    departments_data = [
        {"name": "Administration", "description": "General system administration and executive management.", "head": "Super Admin"},
        {"name": "HR", "description": "Human Resources, payroll and personnel operations.", "head": "HR Manager"},
        {"name": "Finance", "description": "Accounts, general ledger, income, expenses, and billing.", "head": "Accountant"},
        {"name": "Inventory", "description": "Stock management and supplier ordering.", "head": "Inventory Keeper"},
    ]
    
    dept_map = {}
    for d in departments_data:
        dept, created = Department.objects.get_or_create(
            name=d["name"],
            defaults={"description": d["description"], "head": d["head"]}
        )
        dept_map[d["name"]] = dept
        if created:
            print(f"Created Department: {dept.name}")
        else:
            print(f"Department exists: {dept.name}")
            
    # 2. Seed Roles
    roles_data = [
        {"name": "Super Admin", "level": "ADMIN", "description": "Unrestricted administrative access to all modules and configurations."},
        {"name": "HR Manager", "level": "MANAGER", "description": "Manage employee directories, invites, roles, and profiles."},
        {"name": "Accountant", "level": "MANAGER", "description": "Manage invoicing, income tracking, expense logs, and financial ledger."},
        {"name": "Inventory Keeper", "level": "STAFF", "description": "Manage products catalog, reorder levels, supplier shipments, and stock level details."},
    ]
    
    role_map = {}
    for r in roles_data:
        role, created = Role.objects.get_or_create(
            name=r["name"],
            defaults={"level": r["level"], "description": r["description"]}
        )
        role_map[r["name"]] = role
        if created:
            print(f"Created Role: {role.name}")
        else:
            print(f"Role exists: {role.name}")
            
    # 3. Seed Modules
    modules_data = [
        {"name": "User Management", "description": "User profile management and RBAC rules."},
        {"name": "Products", "description": "Products list, categories, and catalogs."},
        {"name": "Sales", "description": "Customer orders and invoicing."},
        {"name": "Purchases", "description": "Supplier orders and shipments."},
        {"name": "Accounts", "description": "General finance ledger, payroll and expenses."},
        {"name": "Dashboard", "description": "KPI analytics and charts."},
    ]
    
    module_objs = []
    for m in modules_data:
        module, created = Module.objects.get_or_create(
            name=m["name"],
            defaults={"description": m["description"], "is_active": True}
        )
        module_objs.append(module)
        if created:
            print(f"Created Module: {module.name}")
        else:
            print(f"Module exists: {module.name}")

    # 4. Seed Super Admin User
    admin_email = "admin@bizionary.com"
    admin_user, created = ERPUser.objects.get_or_create(
        email=admin_email,
        defaults={
            "username": "admin",
            "first_name": "Super",
            "last_name": "Admin",
            "password_hash": make_password("AdminPassword123"),
            "employee_id": "BZ-0001",
            "phone": "0300-1234567",
            "department": dept_map["Administration"],
            "role": role_map["Super Admin"],
            "designation": "Enterprise Architect",
            "status": "ACTIVE",
            "is_active": True,
            "date_of_joining": date.today()
        }
    )
    
    if created:
        print(f"Created Super Admin User: {admin_user.email} (Password: AdminPassword123)")
        
        # Log audit activity
        ActivityLog.objects.create(
            user=admin_user,
            action="CREATE",
            module="User Management",
            description="Initial system setup: Super Admin account created.",
            status="SUCCESS"
        )
    else:
        print(f"Super Admin User already exists: {admin_user.email}")

    # 5. Grant Full Permissions to Super Admin User
    for m in module_objs:
        perm, created_perm = Permission.objects.get_or_create(
            user=admin_user,
            module=m,
            defaults={
                "can_create": True,
                "can_read": True,
                "can_update": True,
                "can_delete": True
            }
        )
        if created_perm:
            print(f"Granted full permissions to Super Admin on Module: {m.name}")
            
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
