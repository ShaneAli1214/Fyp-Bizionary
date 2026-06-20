import sys
sys.path.insert(0, "c:/Users/Dell/Desktop/Fyp")
from product_catalog.generated_products import ALL_PRODUCTS

print("Total products in ALL_PRODUCTS:", len(ALL_PRODUCTS))
categories = {}
for p in ALL_PRODUCTS:
    cat = p.get('category')
    categories[cat] = categories.get(cat, 0) + 1

for cat, count in categories.items():
    print(f"Category: {cat}, Count: {count}")
