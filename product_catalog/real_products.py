from decimal import Decimal

# Real Product Data - Electronics & Applications
ELECTRONICS_PRODUCTS = [
    # Large Home Appliances
    {"name": "Refrigerator (Manual Defrost)", "sku": "ELEC-001", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "unit_price": Decimal("21500.00"), "cost_price": Decimal("17000.00"), "stock_quantity": 15, "reorder_level": 3, "brand": "Apex", "supplier": "Global Home"},
    {"name": "Refrigerator (Auto Defrost) 4-Door", "sku": "ELEC-002", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "unit_price": Decimal("30000.00"), "cost_price": Decimal("25000.00"), "stock_quantity": 8, "reorder_level": 2, "brand": "Alpha", "supplier": "Crystal Store"},
    {"name": "Washing Machine (Full Auto)", "sku": "ELEC-003", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "unit_price": Decimal("22500.00"), "cost_price": Decimal("18000.00"), "stock_quantity": 12, "reorder_level": 2, "brand": "Apex", "supplier": "Global Home"},
    {"name": "Washing Machine (Semi Auto) 5KG", "sku": "ELEC-004", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "unit_price": Decimal("16500.00"), "cost_price": Decimal("13500.00"), "stock_quantity": 18, "reorder_level": 3, "brand": "Prime", "supplier": "Appliance Hub"},
    {"name": "Air Conditioner 1.5 Ton", "sku": "ELEC-005", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "unit_price": Decimal("45000.00"), "cost_price": Decimal("38000.00"), "stock_quantity": 10, "reorder_level": 2, "brand": "Cool Zone", "supplier": "AC World"},
    {"name": "Microwave Oven 25L", "sku": "ELEC-006", "category": "Electronics & Applications", "subcategory": "Large Home Appliances", "unit_price": Decimal("8500.00"), "cost_price": Decimal("6800.00"), "stock_quantity": 25, "reorder_level": 5, "brand": "Chef's Choice", "supplier": "Kitchen Pro"},
    
    # Laptops & Computers
    {"name": "Laptop i5 Core - 8GB RAM", "sku": "ELEC-101", "category": "Electronics & Applications", "subcategory": "Laptops & Computers", "unit_price": Decimal("55000.00"), "cost_price": Decimal("45000.00"), "stock_quantity": 25, "reorder_level": 5, "brand": "Dell", "supplier": "Tech Hub"},
    {"name": "Laptop i7 Core - 16GB RAM", "sku": "ELEC-102", "category": "Electronics & Applications", "subcategory": "Laptops & Computers", "unit_price": Decimal("85000.00"), "cost_price": Decimal("70000.00"), "stock_quantity": 15, "reorder_level": 3, "brand": "HP", "supplier": "Tech Hub"},
    {"name": "Desktop Computer i5 - 8GB", "sku": "ELEC-103", "category": "Electronics & Applications", "subcategory": "Laptops & Computers", "unit_price": Decimal("42000.00"), "cost_price": Decimal("35000.00"), "stock_quantity": 20, "reorder_level": 4, "brand": "Lenovo", "supplier": "Computer World"},
    {"name": "Monitor 24 inch Full HD", "sku": "ELEC-104", "category": "Electronics & Applications", "subcategory": "Laptops & Computers", "unit_price": Decimal("18000.00"), "cost_price": Decimal("14000.00"), "stock_quantity": 35, "reorder_level": 7, "brand": "LG", "supplier": "Display Center"},
]

# Real Product Data - Organic & Food Items
ORGANIC_FOOD_PRODUCTS = [
    # Organic Vegetables
    {"name": "Organic Tomato (Per KG)", "sku": "FOOD-001", "category": "Organic & Food Items", "subcategory": "Organic Vegetables", "unit_price": Decimal("85.00"), "cost_price": Decimal("65.00"), "stock_quantity": 200, "reorder_level": 30, "brand": "Farm Fresh", "supplier": "Fresh Farms"},
    {"name": "Organic Spinach (Per KG)", "sku": "FOOD-002", "category": "Organic & Food Items", "subcategory": "Organic Vegetables", "unit_price": Decimal("110.00"), "cost_price": Decimal("80.00"), "stock_quantity": 150, "reorder_level": 25, "brand": "Farm Fresh", "supplier": "Fresh Farms"},
    {"name": "Organic Carrot (Per KG)", "sku": "FOOD-003", "category": "Organic & Food Items", "subcategory": "Organic Vegetables", "unit_price": Decimal("75.00"), "cost_price": Decimal("55.00"), "stock_quantity": 180, "reorder_level": 30, "brand": "Garden Green", "supplier": "Vegetable World"},
    {"name": "Organic Onion (Per KG)", "sku": "FOOD-004", "category": "Organic & Food Items", "subcategory": "Organic Vegetables", "unit_price": Decimal("65.00"), "cost_price": Decimal("45.00"), "stock_quantity": 250, "reorder_level": 40, "brand": "Pure Organic", "supplier": "Vegetable World"},
    
    # Organic Fruits
    {"name": "Organic Apple Red (Per KG)", "sku": "FOOD-101", "category": "Organic & Food Items", "subcategory": "Organic Fruits", "unit_price": Decimal("160.00"), "cost_price": Decimal("120.00"), "stock_quantity": 100, "reorder_level": 15, "brand": "Nature's Best", "supplier": "Fruit World"},
    {"name": "Organic Banana (Per Dozen)", "sku": "FOOD-102", "category": "Organic & Food Items", "subcategory": "Organic Fruits", "unit_price": Decimal("85.00"), "cost_price": Decimal("65.00"), "stock_quantity": 120, "reorder_level": 20, "brand": "Fruit Fresh", "supplier": "Fruit World"},
    {"name": "Organic Orange (Per KG)", "sku": "FOOD-103", "category": "Organic & Food Items", "subcategory": "Organic Fruits", "unit_price": Decimal("140.00"), "cost_price": Decimal("100.00"), "stock_quantity": 90, "reorder_level": 15, "brand": "Citrus Gold", "supplier": "Fruit Traders"},
]

# Real Product Data - Grains & Pulses
GRAINS_PULSES_PRODUCTS = [
    # Basmati Rice
    {"name": "Basmati Rice (Per KG)", "sku": "GRAIN-001", "category": "Grains & Pulses", "subcategory": "Basmati Rice", "unit_price": Decimal("120.00"), "cost_price": Decimal("95.00"), "stock_quantity": 500, "reorder_level": 100, "brand": "Golden", "supplier": "Rice Mill"},
    {"name": "Basmati Extra Long (Per KG)", "sku": "GRAIN-002", "category": "Grains & Pulses", "subcategory": "Basmati Rice", "unit_price": Decimal("150.00"), "cost_price": Decimal("120.00"), "stock_quantity": 300, "reorder_level": 60, "brand": "Premium Gold", "supplier": "Rice Export"},
    
    # Pulses
    {"name": "Moong Dal (Per KG)", "sku": "GRAIN-101", "category": "Grains & Pulses", "subcategory": "Pulses", "unit_price": Decimal("110.00"), "cost_price": Decimal("85.00"), "stock_quantity": 300, "reorder_level": 50, "brand": "Pure", "supplier": "Dal House"},
    {"name": "Masoor Dal (Per KG)", "sku": "GRAIN-102", "category": "Grains & Pulses", "subcategory": "Pulses", "unit_price": Decimal("95.00"), "cost_price": Decimal("75.00"), "stock_quantity": 250, "reorder_level": 40, "brand": "Quality", "supplier": "Dal House"},
    {"name": "Chickpeas (Per KG)", "sku": "GRAIN-103", "category": "Grains & Pulses", "subcategory": "Pulses", "unit_price": Decimal("105.00"), "cost_price": Decimal("80.00"), "stock_quantity": 200, "reorder_level": 35, "brand": "Select", "supplier": "Pulse Traders"},
]

# Real Product Data - Hides & Trimmings
HIDES_TRIMMINGS_PRODUCTS = [
    # Leather Hides
    {"name": "Full Grain Leather Hide", "sku": "HIDE-001", "category": "Hides & Trimmings", "subcategory": "Leather Hides", "unit_price": Decimal("3500.00"), "cost_price": Decimal("2500.00"), "stock_quantity": 45, "reorder_level": 8, "brand": "Premium", "supplier": "Leather Works"},
    {"name": "Split Leather Hide", "sku": "HIDE-002", "category": "Hides & Trimmings", "subcategory": "Leather Hides", "unit_price": Decimal("2200.00"), "cost_price": Decimal("1600.00"), "stock_quantity": 60, "reorder_level": 10, "brand": "Standard", "supplier": "Leather Works"},
]

# Real Product Data - Chemicals & Industrial
CHEMICALS_INDUSTRIAL_PRODUCTS = [
    # Industrial Chemicals
    {"name": "Sulphuric Acid 98% (Per Liter)", "sku": "CHEM-001", "category": "Chemicals & Industrial", "subcategory": "Industrial Chemicals", "unit_price": Decimal("600.00"), "cost_price": Decimal("450.00"), "stock_quantity": 100, "reorder_level": 20, "brand": "Industrial", "supplier": "Chem Works"},
    {"name": "Hydrochloric Acid 37% (Per Liter)", "sku": "CHEM-002", "category": "Chemicals & Industrial", "subcategory": "Industrial Chemicals", "unit_price": Decimal("550.00"), "cost_price": Decimal("400.00"), "stock_quantity": 80, "reorder_level": 15, "brand": "Industrial", "supplier": "Chem Works"},
    {"name": "Sodium Hydroxide (Per KG)", "sku": "CHEM-003", "category": "Chemicals & Industrial", "subcategory": "Industrial Chemicals", "unit_price": Decimal("450.00"), "cost_price": Decimal("350.00"), "stock_quantity": 120, "reorder_level": 25, "brand": "Industrial", "supplier": "Chemical Supply"},
]

# All real products combined
ALL_REAL_PRODUCTS = ELECTRONICS_PRODUCTS + ORGANIC_FOOD_PRODUCTS + GRAINS_PULSES_PRODUCTS + HIDES_TRIMMINGS_PRODUCTS + CHEMICALS_INDUSTRIAL_PRODUCTS
