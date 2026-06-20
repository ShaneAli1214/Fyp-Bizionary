# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

"""
seed_roles_departments.py
=========================
Bizionary ERP — Authoritative Role & Department Cleanup + Seed Script
Author  : Senior Django Backend Engineer
Version : 2.0 (Phase 3.0 Cleanup)
Run via : python manage.py shell < seed_roles_departments.py
      OR : python seed_roles_departments.py  (from project root)

Execution Plan
--------------
STEP 1 — Define the canonical keep-lists (roles and departments).
STEP 2 — Ensure every canonical record exists (create if missing).
STEP 3 — Safely re-assign users attached to roles/departments that are
          about to be deleted, before any deletion occurs.
STEP 4 — Delete all non-canonical roles and departments.
STEP 5 — Print a clean summary report.

SAFETY GUARANTEES
-----------------
- No user will ever have their role or department set to a deleted record.
- If a user's role is being removed and no direct canonical equivalent exists,
#   they are re-assigned to 'Admin' (fail-safe floor, not ceiling).
- All operations run in a single atomic transaction — if anything fails,
  the database is rolled back to its pre-script state.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from django.db import transaction
from user_management.models import Role, Department, ERPUser


# ═══════════════════════════════════════════════════════════════════════════════
# CANONICAL DEFINITIONS — Single source of truth
# ═══════════════════════════════════════════════════════════════════════════════

CANONICAL_ROLES = [
    {
        "name": "Admin",
        "level": "ADMIN",
        "description": "Unrestricted administrative access to all modules, users, and configurations.",
    },
    {
        "name": "Accountant",
        "level": "MANAGER",
        "description": "Full access to Accounts, Invoices, Revenue, Expenses, and financial reports.",
    },
    {
        "name": "Inventory Manager",
        "level": "MANAGER",
        "description": "Full inventory module access including stock adjustments and purchase approvals.",
    },
    {
        "name": "Sales Manager",
        "level": "MANAGER",
        "description": "Manages the full sales pipeline, targets, and team oversight.",
    },
]

CANONICAL_DEPARTMENTS = [
    {
        "name": "Administration",
        "description": "General system administration and executive management.",
        "head": "Admin",
    },
    {
        "name": "Finance Dept",
        "description": "Accounts, general ledger, income, expenses, and billing.",
        "head": "Accountant",
    },
    {
        "name": "Inventory Dept",
        "description": "Stock management, warehouse operations, and supplier ordering.",
        "head": "Inventory Manager",
    },
    {
        "name": "Sales Dept",
        "description": "Customer relationship management, sales orders, and revenue targets.",
        "head": "Sales Manager",
    },
    {
        "name": "QA Dept",
        "description": "Quality assurance and product testing.",
        "head": "Admin",
    },
    {
        "name": "General Dept",
        "description": "General corporate operations and miscellaneous support.",
        "head": "Admin",
    },
]

# Role name mapping: if a user's role is being deleted, which canonical role
# should they fall back to?  Key = name being deleted, Value = canonical name.
ROLE_REASSIGNMENT_MAP = {
    "Super Admin":      "Admin",
    "Finance Manager":  "Accountant",
    "Inventory Keeper": "Inventory Manager",
    "Sales Keeper":     "Sales Manager",
    "Staff Role":       "Inventory Manager",
    "Staff A":          "Inventory Manager",
    "Staff B":          "Inventory Manager",
    "HR Manager":       "Admin",
}

# Department name mapping for reassignment
DEPT_REASSIGNMENT_MAP = {
    "Finance":   "Finance Dept",
    "Inventory": "Inventory Dept",
    "Sales":     "Sales Dept",
    "HR":        "General Dept",
}



# ═══════════════════════════════════════════════════════════════════════════════
# -------------------------------------------------------------------------------
# MAIN CLEANUP FUNCTION
# -------------------------------------------------------------------------------

def run_cleanup():
    print("\n" + "=" * 62)
    print("  BIZIONARY ERP — Role & Department Cleanup Script v2.0")
    print("-" * 62)

    with transaction.atomic():

        # ---------------------------------------------------------------------
        # STEP 1 — Ensure all canonical roles exist
        # ---------------------------------------------------------------------
        print("\n[STEP 1] Ensuring canonical roles exist...")
        canonical_role_map = {}
        for r in CANONICAL_ROLES:
            role, created = Role.objects.get_or_create(
                name=r["name"],
                defaults={"level": r["level"], "description": r["description"]},
            )
            # Update level/description if the record already existed but was stale
            if not created:
                updated = False
                if role.level != r["level"]:
                    role.level = r["level"]
                    updated = True
                if role.description != r["description"]:
                    role.description = r["description"]
                    updated = True
                if updated:
                    role.save()
                    print(f"  [UPDT]  Role updated : {role.name}")
                else:
                    print(f"  [OK]    Role exists  : {role.name}")
            else:
                print(f"  [NEW]   Role created : {role.name}")
            canonical_role_map[role.name] = role

        # ---------------------------------------------------------------------
        # STEP 2 — Ensure all canonical departments exist
        # ---------------------------------------------------------------------
        print("\n[STEP 2] Ensuring canonical departments exist...")
        canonical_dept_map = {}
        for d in CANONICAL_DEPARTMENTS:
            dept, created = Department.objects.get_or_create(
                name=d["name"],
                defaults={"description": d["description"], "head": d["head"]},
            )
            if not created:
                print(f"  [OK]    Dept exists  : {dept.name}")
            else:
                print(f"  [NEW]   Dept created : {dept.name}")
            canonical_dept_map[dept.name] = dept

        # ---------------------------------------------------------------------
        # STEP 3A — Identify roles to delete
        # ---------------------------------------------------------------------
        canonical_role_names = {r["name"] for r in CANONICAL_ROLES}
        roles_to_delete = Role.objects.exclude(name__in=canonical_role_names)

        print(f"\n[STEP 3] Roles to delete: {[r.name for r in roles_to_delete]}")

        for stale_role in roles_to_delete:
            affected_users = ERPUser.objects.filter(role=stale_role)
            count = affected_users.count()

            if count > 0:
                # Find the reassignment target
                fallback_name = ROLE_REASSIGNMENT_MAP.get(stale_role.name, "Admin")
                fallback_role = canonical_role_map.get(fallback_name)

                if not fallback_role:
                    # Ultimate safety net
                    fallback_role = canonical_role_map["Admin"]

                affected_users.update(role=fallback_role)
                print(f"  [MOVE]  {count} user(s): '{stale_role.name}' -> '{fallback_role.name}'")

        # Now safe to delete
        deleted_count, _ = roles_to_delete.delete()
        print(f"  [DEL]   Deleted {deleted_count} stale role record(s).")

        # ---------------------------------------------------------------------
        # STEP 3B — Identify departments to delete
        # ---------------------------------------------------------------------
        canonical_dept_names = {d["name"] for d in CANONICAL_DEPARTMENTS}
        depts_to_delete = Department.objects.exclude(name__in=canonical_dept_names)

        print(f"\n[STEP 4] Departments to delete: {[d.name for d in depts_to_delete]}")

        for stale_dept in depts_to_delete:
            affected_users = ERPUser.objects.filter(department=stale_dept)
            count = affected_users.count()

            if count > 0:
                fallback_name = DEPT_REASSIGNMENT_MAP.get(stale_dept.name, "Administration")
                fallback_dept = canonical_dept_map.get(fallback_name)

                if not fallback_dept:
                    fallback_dept = canonical_dept_map["Administration"]

                affected_users.update(department=fallback_dept)
                print(f"  [MOVE]  {count} user(s): dept '{stale_dept.name}' -> '{fallback_dept.name}'")

        deleted_dept_count, _ = depts_to_delete.delete()
        print(f"  [DEL]   Deleted {deleted_dept_count} stale department record(s).")

        # ---------------------------------------------------------------------
        # STEP 5 — Final verification report
        # ---------------------------------------------------------------------
        print("\n" + "-" * 62)
        print("[STEP 5] FINAL STATE VERIFICATION")
        print("-" * 62)

        print("\n  ROLES IN DATABASE:")
        for r in Role.objects.all().order_by('name'):
            user_count = ERPUser.objects.filter(role=r).count()
            print(f"    id={r.id:<3} | {r.level:<10} | users={user_count} | {r.name}")

        print("\n  DEPARTMENTS IN DATABASE:")
        for d in Department.objects.all().order_by('name'):
            user_count = ERPUser.objects.filter(department=d).count()
            print(f"    id={d.id:<3} | users={user_count} | {d.name}")

        print("\n  USER ASSIGNMENTS (post-cleanup):")
        for u in ERPUser.objects.select_related('role', 'department').all():
            role_name = u.role.name if u.role else 'UNASSIGNED'
            dept_name = u.department.name if u.department else 'UNASSIGNED'
            print(f"    {u.username:<30} | role={role_name:<20} | dept={dept_name}")

    print("\n" + "=" * 62)
    print("  Cleanup completed successfully. Transaction committed.")
    print("=" * 62 + "\n")


if __name__ == "__main__":
    run_cleanup()
