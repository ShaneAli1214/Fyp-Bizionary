"""
Script to parse real product data from spreadsheet and create organized Python data files
This extracts categories, subcategories, products, and pricing information
"""

from decimal import Decimal
from collections import defaultdict

# Real data extracted from your spreadsheet
REAL_DATA = [
    # Electronics & Applications
    {"product_id": "PL-101", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "name": "Refrigerator (Manual Defrost)", "sku": "APPL1", "unit": "1 Unit", "cost_price": 17000.00, "sale_price": 21500.00, "stock": 15, "supplier": "Global Home", "brand": "Apex", "status": "Active"},
    {"product_id": "PL-102", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "name": "Refrigerator (Auto Defrost) 4-Door", "sku": "APPL2", "unit": "1 Unit", "cost_price": 25000.00, "sale_price": 30000.00, "stock": 8, "supplier": "Crystal Store", "brand": "Alpha", "status": "Active"},
    {"product_id": "PL-103", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "name": "Washing Machine (Full Auto)", "sku": "APPL3", "unit": "1 Unit", "cost_price": 18000.00, "sale_price": 22500.00, "stock": 12, "supplier": "Global Home", "brand": "Apex", "status": "Active"},
    {"product_id": "PL-104", "category": "Electronics & Applications", "subcategory": "Laptops & Computers", "name": "Laptop i5 Core - 8GB RAM", "sku": "LPTOP1", "unit": "1 Unit", "cost_price": 45000.00, "sale_price": 55000.00, "stock": 25, "supplier": "Tech Hub", "brand": "Dell", "status": "Active"},
    
    # Organic & Food Items
    {"product_id": "PL-201", "category": "Organic & Food Items", "subcategory": "Organic Vegetables", "name": "Organic Tomato (Per KG)", "sku": "ORGV1", "unit": "1 KG", "cost_price": 65.00, "sale_price": 85.00, "stock": 200, "supplier": "Fresh Farms", "brand": "Farm Fresh", "status": "Active"},
    {"product_id": "PL-202", "category": "Organic & Food Items", "subcategory": "Organic Vegetables", "name": "Organic Spinach (Per KG)", "sku": "ORGV2", "unit": "1 KG", "cost_price": 80.00, "sale_price": 110.00, "stock": 150, "supplier": "Fresh Farms", "brand": "Farm Fresh", "status": "Active"},
    {"product_id": "PL-203", "category": "Organic & Food Items", "subcategory": "Organic Fruits", "name": "Organic Apple Red (Per KG)", "sku": "ORGF1", "unit": "1 KG", "cost_price": 120.00, "sale_price": 160.00, "stock": 100, "supplier": "Fruit World", "brand": "Nature's Best", "status": "Active"},
    
    # Grains & Pulses
    {"product_id": "PL-301", "category": "Grains & Pulses", "subcategory": "Basmati Rice", "name": "Basmati Rice (Per KG)", "sku": "RICE1", "unit": "1 KG", "cost_price": 95.00, "sale_price": 120.00, "stock": 500, "supplier": "Rice Mill", "brand": "Golden", "status": "Active"},
    {"product_id": "PL-302", "category": "Grains & Pulses", "subcategory": "Pulses", "name": "Moong Dal (Per KG)", "sku": "PULSE1", "unit": "1 KG", "cost_price": 85.00, "sale_price": 110.00, "stock": 300, "supplier": "Dal House", "brand": "Pure", "status": "Active"},
    
    # Hides & Trimmings
    {"product_id": "PL-401", "category": "Hides & Trimmings", "subcategory": "Leather Hides", "name": "Full Grain Leather Hide", "sku": "HIDE1", "unit": "1 Piece", "cost_price": 2500.00, "sale_price": 3500.00, "stock": 45, "supplier": "Leather Works", "brand": "Premium", "status": "Active"},
    
    # Chemicals & Industrial
    {"product_id": "PL-501", "category": "Chemicals & Industrial", "subcategory": "Industrial Chemicals", "name": "Sulphuric Acid 98% (Per Liter)", "sku": "CHEM1", "unit": "1 Liter", "cost_price": 450.00, "sale_price": 600.00, "stock": 100, "supplier": "Chem Works", "brand": "Industrial", "status": "Active"},
]

# Group data by category
def organize_data_by_category():
    categories = defaultdict(lambda: defaultdict(list))
    
    for item in REAL_DATA:
        category = item['category']
        subcategory = item['subcategory']
        categories[category][subcategory].append(item)
    
    return categories

# Create category list
CATEGORIES = [
    {
        "name": "Electronics & Applications",
        "code": "ELEC",
        "description": "Large home appliances, laptops, and electronics"
    },
    {
        "name": "Organic & Food Items",
        "code": "FOOD",
        "description": "Organic vegetables, fruits, and food products"
    },
    {
        "name": "Grains & Pulses",
        "code": "GRAIN",
        "description": "Rice, pulses, and grain products"
    },
    {
        "name": "Hides & Trimmings",
        "code": "HIDE",
        "description": "Leather hides and leather trimmings"
    },
    {
        "name": "Chemicals & Industrial",
        "code": "CHEM",
        "description": "Industrial chemicals and chemical products"
    }
]

# Create subcategory list
SUBCATEGORIES = [
    {"name": "Large Home Appliances", "category": "Electronics & Applications"},
    {"name": "Laptops & Computers", "category": "Electronics & Applications"},
    {"name": "Organic Vegetables", "category": "Organic & Food Items"},
    {"name": "Organic Fruits", "category": "Organic & Food Items"},
    {"name": "Basmati Rice", "category": "Grains & Pulses"},
    {"name": "Pulses", "category": "Grains & Pulses"},
    {"name": "Leather Hides", "category": "Hides & Trimmings"},
    {"name": "Industrial Chemicals", "category": "Chemicals & Industrial"},
]

if __name__ == "__main__":
    print("Real Data Structure:")
    organized = organize_data_by_category()
    for cat, subcats in organized.items():
        print(f"\n{cat}:")
        for subcat, products in subcats.items():
            print(f"  {subcat}: {len(products)} products")
