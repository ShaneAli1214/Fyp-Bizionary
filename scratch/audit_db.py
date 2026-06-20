import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'erp_system.settings'
django.setup()

from user_management.models import Role, Department, ERPUser

print('=== CURRENT ROLES IN DB ===')
for r in Role.objects.all().order_by('name'):
    user_count = ERPUser.objects.filter(role=r).count()
    print(f'  ID={r.id}  Level={r.level}  Users={user_count}  Name={r.name}')

print()
print('=== CURRENT DEPARTMENTS IN DB ===')
for d in Department.objects.all().order_by('name'):
    user_count = ERPUser.objects.filter(department=d).count()
    print(f'  ID={d.id}  Users={user_count}  Name={d.name}')

print()
print('=== ALL USERS ===')
for u in ERPUser.objects.select_related('role', 'department').all():
    role_name = u.role.name if u.role else 'None'
    dept_name = u.department.name if u.department else 'None'
    print(f'  ID={u.id}  username={u.username}  role={role_name}  dept={dept_name}')
