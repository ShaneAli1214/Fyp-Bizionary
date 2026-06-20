import os
import sys
import django

sys.path.insert(0, "c:/Users/Dell/Desktop/Fyp")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from purchases.models import SupplierCompany, OrderedSlip, Purchase
from accounts.models import CashTransaction

names_to_remove = [
    "3M Pakistan", "Abbott Pakistan", "Acer Pakistan", "Amreli Steels", "Asus Pakistan",
    "Bata Pakistan", "Berger Paints", "Bosch Pakistan", "Casio Pakistan", "Castrol Pakistan",
    "DG Khan Cement", "Dalda Foods", "Dawlance", "Dawn Foods", "Dell Pakistan",
    "Exide Pakistan", "Falak Foods", "FrieslandCampina", "GSK Pakistan", "General Tyre",
    "Gul Ahmed", "HP Distributors", "Haier Pakistan", "Haleeb Foods", "Hamdard",
    "ICI Pakistan", "J (Junaid Jamshed)", "KNs Pakistan", "Khaadi", "LG Pakistan",
    "Lenovo Pakistan", "Lucky Cement", "Mehran Foods", "National Foods", "Nestle Pakistan",
    "Nishat Linen", "Oppo Distributors", "Orient Electronics", "P&G Pakistan", "PEL Pakistan",
    "Pakistan Cables", "Panda Stationers", "Philips Pakistan", "Realme Pakistan", "Reckitt Pakistan",
    "Sana Safinaz", "Servis", "Shan Foods", "Shell Pakistan", "Siemens Pakistan",
    "Sony Pakistan", "Stanley Tools", "Sunridge Foods", "TCL Pakistan", "Tapal Tea",
    "TechHub Pvt Ltd", "Unilever Pakistan", "Vivo Pakistan", "Xiaomi Pakistan", "iWorld Pakistan"
]

print("=== Executing Database Deletions ===")

# Delete SupplierCompany
sc_del_count, _ = SupplierCompany.objects.filter(name__in=names_to_remove).delete()
print(f"Deleted {sc_del_count} SupplierCompany records.")

# Delete OrderedSlip
os_del_count, _ = OrderedSlip.objects.filter(company_name__in=names_to_remove).delete()
print(f"Deleted {os_del_count} OrderedSlip records.")

# Delete Purchase
p_del_count, _ = Purchase.objects.filter(company_name__in=names_to_remove).delete()
print(f"Deleted {p_del_count} Purchase records.")

# Delete CashTransaction for purchases
ct_del_count, _ = CashTransaction.objects.filter(source_type='purchase').delete()
print(f"Deleted {ct_del_count} CashTransaction records of type 'purchase'.")

print("\nDatabase deletions completed successfully.")
