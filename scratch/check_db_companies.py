import os
import sys
import django

sys.path.insert(0, "c:/Users/Dell/Desktop/Fyp")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from purchases.models import SupplierCompany, OrderedSlip, Purchase

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

print("=== Checking SupplierCompany objects ===")
suppliers = SupplierCompany.objects.filter(name__in=names_to_remove)
print(f"Found {suppliers.count()} matching SupplierCompany records.")
for s in suppliers[:10]:
    print(f"- {s.name} (ID: {s.id})")

print("\n=== Checking OrderedSlip objects ===")
slips = OrderedSlip.objects.filter(company_name__in=names_to_remove)
print(f"Found {slips.count()} matching OrderedSlip records.")
for slip in slips[:10]:
    print(f"- Slip #{slip.id} for {slip.company_name} (product: {slip.product.name})")

print("\n=== Checking Purchase objects ===")
purchases = Purchase.objects.filter(company_name__in=names_to_remove)
print(f"Found {purchases.count()} matching Purchase records.")
for p in purchases[:10]:
    print(f"- Purchase #{p.id} for {p.company_name} (product: {p.product.name})")
