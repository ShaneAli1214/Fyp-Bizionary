from decimal import Decimal

# Category Data
CATEGORIES_DATA = [
    {
        "name": "Electronics & Applications",
        "code": "ELEC",
        "description": "Large home appliances, laptops, and electronics equipment",
    },
    {
        "name": "Organic & Food Items",
        "code": "FOOD",
        "description": "Organic vegetables, fruits, and food products",
    },
    {
        "name": "Grains & Pulses",
        "code": "GRAIN",
        "description": "Rice, pulses, and grain products",
    },
    {
        "name": "Hides & Trimmings",
        "code": "HIDE",
        "description": "Leather hides and leather trimmings",
    },
    {
        "name": "Chemicals & Industrial",
        "code": "CHEM",
        "description": "Industrial chemicals and chemical products",
    }
]

# SubCategory Data
SUBCATEGORIES_DATA = [
    {"name": "Large Home Appliances", "category": "Electronics & Applications"},
    {"name": "Laptops & Computers", "category": "Electronics & Applications"},
    {"name": "Organic Vegetables", "category": "Organic & Food Items"},
    {"name": "Organic Fruits", "category": "Organic & Food Items"},
    {"name": "Basmati Rice", "category": "Grains & Pulses"},
    {"name": "Pulses", "category": "Grains & Pulses"},
    {"name": "Leather Hides", "category": "Hides & Trimmings"},
    {"name": "Industrial Chemicals", "category": "Chemicals & Industrial"},
]

# Brand Data
BRANDS_DATA = [
    {"name": "Apex", "country": "Pakistan"},
    {"name": "Alpha", "country": "Pakistan"},
    {"name": "Prime", "country": "Pakistan"},
    {"name": "Cool Zone", "country": "Pakistan"},
    {"name": "Chef's Choice", "country": "Pakistan"},
    {"name": "Dell", "country": "USA"},
    {"name": "HP", "country": "USA"},
    {"name": "Lenovo", "country": "China"},
    {"name": "LG", "country": "South Korea"},
    {"name": "Farm Fresh", "country": "Pakistan"},
    {"name": "Garden Green", "country": "Pakistan"},
    {"name": "Pure Organic", "country": "Pakistan"},
    {"name": "Nature's Best", "country": "Pakistan"},
    {"name": "Fruit Fresh", "country": "Pakistan"},
    {"name": "Citrus Gold", "country": "Pakistan"},
    {"name": "Golden", "country": "Pakistan"},
    {"name": "Premium Gold", "country": "Pakistan"},
    {"name": "Pure", "country": "Pakistan"},
    {"name": "Quality", "country": "Pakistan"},
    {"name": "Select", "country": "Pakistan"},
    {"name": "Premium", "country": "Pakistan"},
    {"name": "Standard", "country": "Pakistan"},
    {"name": "Industrial", "country": "Pakistan"},
]

# Supplier Data
SUPPLIERS_DATA = [
    {"name": "Global Home", "city": "Karachi", "country": "Pakistan", "phone": "021-2847293"},
    {"name": "Crystal Store", "city": "Lahore", "country": "Pakistan", "phone": "042-3532847"},
    {"name": "Tech Hub", "city": "Islamabad", "country": "Pakistan", "phone": "051-2928374"},
    {"name": "Appliance Hub", "city": "Karachi", "country": "Pakistan", "phone": "021-3847293"},
    {"name": "AC World", "city": "Lahore", "country": "Pakistan", "phone": "042-5839201"},
    {"name": "Kitchen Pro", "city": "Karachi", "country": "Pakistan", "phone": "021-2847201"},
    {"name": "Computer World", "city": "Islamabad", "country": "Pakistan", "phone": "051-2920847"},
    {"name": "Display Center", "city": "Lahore", "country": "Pakistan", "phone": "042-3847293"},
    {"name": "Fresh Farms", "city": "Peshawar", "country": "Pakistan", "phone": "091-2847293"},
    {"name": "Vegetable World", "city": "Multan", "country": "Pakistan", "phone": "061-4837293"},
    {"name": "Fruit World", "city": "Peshawar", "country": "Pakistan", "phone": "091-5627293"},
    {"name": "Fruit Traders", "city": "Quetta", "country": "Pakistan", "phone": "081-2847293"},
    {"name": "Rice Mill", "city": "Sialkot", "country": "Pakistan", "phone": "052-3847293"},
    {"name": "Rice Export", "city": "Faisalabad", "country": "Pakistan", "phone": "041-2947293"},
    {"name": "Dal House", "city": "Sargodha", "country": "Pakistan", "phone": "048-2847293"},
    {"name": "Pulse Traders", "city": "Jhang", "country": "Pakistan", "phone": "055-2847293"},
    {"name": "Leather Works", "city": "Kasur", "country": "Pakistan", "phone": "049-2847293"},
    {"name": "Chem Works", "city": "Gujranwala", "country": "Pakistan", "phone": "055-4847293"},
    {"name": "Chemical Supply", "city": "Sheikhupura", "country": "Pakistan", "phone": "056-2847293"},
]

# Sample Sales Data
SALES_DATA = [
    {
        "product_sku": "SMA54",
        "customer_name": "Ahmed Khan",
        "quantity_sold": 1,
        "unit_price": Decimal("21500.00"),
        "discount": Decimal("500.00"),
        "payment_method": "CARD",
        "payment_status": "PAID",
        "sale_date": "2026-05-15"
    },
    {
        "product_sku": "BSRC5",
        "customer_name": "Fatima Ahmed",
        "quantity_sold": 5,
        "unit_price": Decimal("85.00"),
        "discount": Decimal("0.00"),
        "payment_method": "CASH",
        "payment_status": "PAID",
        "sale_date": "2026-05-16"
    },
    {
        "product_sku": "BSRC25",
        "customer_name": "Muhammad Hassan",
        "quantity_sold": 10,
        "unit_price": Decimal("120.00"),
        "discount": Decimal("100.00"),
        "payment_method": "BANK_TRANSFER",
        "payment_status": "PAID",
        "sale_date": "2026-05-14"
    },
    {
        "product_sku": "IPH14",
        "customer_name": "Sara Ali",
        "quantity_sold": 2,
        "unit_price": Decimal("18000.00"),
        "discount": Decimal("1000.00"),
        "payment_method": "CARD",
        "payment_status": "PAID",
        "sale_date": "2026-05-10"
    },
]

# Sample Invoice Data
INVOICES_DATA = [
    {
        "invoice_number": "INV-2026-001",
        "customer_name": "Tech Solutions Co.",
        "customer_email": "tech@solutions.pk",
        "customer_phone": "021-34567890",
        "invoice_date": "2026-05-10",
        "due_date": "2026-06-10",
        "subtotal": Decimal("110000.00"),
        "tax_amount": Decimal("17600.00"),
        "discount_amount": Decimal("2000.00"),
        "total_amount": Decimal("125600.00"),
        "amount_paid": Decimal("125600.00"),
        "status": "PAID",
        "notes": "Corporate order - Electronics delivery confirmed"
    },
    {
        "invoice_number": "INV-2026-002",
        "customer_name": "Fresh Market Ltd.",
        "customer_email": "market@fresh.pk",
        "customer_phone": "051-98765432",
        "invoice_date": "2026-05-12",
        "due_date": "2026-06-12",
        "subtotal": Decimal("45000.00"),
        "tax_amount": Decimal("7200.00"),
        "discount_amount": Decimal("1500.00"),
        "total_amount": Decimal("50700.00"),
        "amount_paid": Decimal("50700.00"),
        "status": "PAID",
        "notes": "Organic food bulk order"
    },
    {
        "invoice_number": "INV-2026-003",
        "customer_name": "Industrial Supply Corp.",
        "customer_email": "supply@industrial.pk",
        "customer_phone": "042-87654321",
        "invoice_date": "2026-05-15",
        "due_date": "2026-07-15",
        "subtotal": Decimal("28000.00"),
        "tax_amount": Decimal("4480.00"),
        "discount_amount": Decimal("500.00"),
        "total_amount": Decimal("31980.00"),
        "amount_paid": Decimal("15990.00"),
        "status": "PARTIALLY_PAID",
        "notes": "Chemical products - Payment plan agreed"
    },
]
