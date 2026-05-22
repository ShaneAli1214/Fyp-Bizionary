import os
import re
import pandas as pd
from decimal import Decimal

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EXCEL_PATH = os.path.join(BASE_DIR, 'AlNoor_ERP_Dataset.xlsx')
PRODUCT_CATALOG_DIR = os.path.join(BASE_DIR, 'product_catalog')

slug_re = re.compile(r'[^a-z0-9]+')

def slugify(s):
    s = s.lower().strip()
    s = s.replace('&', 'and')
    s = s.replace("'", '')
    s = slug_re.sub('_', s)
    s = s.strip('_')
    return s


def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)


def format_decimal(v):
    try:
        return Decimal(str(v)).quantize(Decimal('0.01'))
    except Exception:
        return Decimal('0.00')


def main():
    # try reading with the second row as header (some exports include a title row)
    try:
        df = pd.read_excel(EXCEL_PATH, header=1)
    except Exception:
        df = pd.read_excel(EXCEL_PATH)

    # normalize column names to simple keys for flexible matching
    original_cols = list(df.columns)
    simple_cols = {str(c).strip().lower(): c for c in original_cols}

    def find_col(*options):
        for opt in options:
            key = str(opt).strip().lower()
            if key in simple_cols:
                return simple_cols[key]
        # try partial match
        for key, orig in simple_cols.items():
            for opt in options:
                if opt and opt.strip().lower() in key:
                    return orig
        return None

    # column name candidates
    COL_CATEGORY = find_col('Category')
    COL_SUBCAT = find_col('Sub-Category', 'Sub Category', 'SubCategory')
    COL_PROD_ID = find_col('Product ID', 'ProductID')
    COL_NAME = find_col('Product Name', 'Product')
    COL_SKU = find_col('SKU')
    COL_UNIT = find_col('Unit')
    COL_REORDER_LEVEL = find_col('Reorder Level', 'ReorderLevel')
    COL_REORDER_QTY = find_col('Reorder Qty', 'ReorderQty', 'Reorder Quantity')
    COL_COST = find_col('Cost Price (PKR)', 'Cost Price', 'Cost')
    COL_SALE = find_col('Sale Price (PKR)', 'Sale Price', 'Sale')
    COL_GROSS = find_col('Gross Margin (PKR)', 'Gross Margin')
    COL_MARGIN_PCT = find_col('Margin %', 'Margin')
    COL_SUPPLIER = find_col('Supplier')
    COL_BRAND = find_col('Brand')
    COL_STATUS = find_col('Status')

    # group rows by category -> subcategory
    groups = {}
    for _, row in df.iterrows():
        category = str(row.get(COL_CATEGORY, '') or '').strip()
        subcat = str(row.get(COL_SUBCAT, '') or '').strip()
        if pd.isna(category) or pd.isna(subcat):
            continue
        key = (category, subcat)
        if key not in groups:
            groups[key] = []
        # set stock_quantity = Reorder Qty
        try:
            stock_qty = int(row.get(COL_REORDER_QTY, 0) or 0)
        except Exception:
            stock_qty = 0
        prod = {
            'product_id': str(row.get(COL_PROD_ID, '') or '').strip(),
            'name': str(row.get(COL_NAME, '') or '').strip(),
            'sku': str(row.get(COL_SKU, '') or '').strip(),
            'unit': str(row.get(COL_UNIT, '') or '').strip(),
            'category': category,
            'subcategory': subcat,
            'reorder_level': int(row.get(COL_REORDER_LEVEL, 0) or 0),
            'reorder_qty': stock_qty,
            'stock_quantity': stock_qty,
            'cost_price': format_decimal(row.get(COL_COST, 0)),
            'sale_price': format_decimal(row.get(COL_SALE, 0)),
            'gross_margin': format_decimal(row.get(COL_GROSS, 0)),
            'margin_pct': str(row.get(COL_MARGIN_PCT, '') or ''),
            'supplier': str(row.get(COL_SUPPLIER, '') or '').strip(),
            'brand': str(row.get(COL_BRAND, '') or '').strip(),
            'status': str(row.get(COL_STATUS, 'Active') or 'Active').strip(),
        }
        groups[key].append(prod)

    ensure_dir(PRODUCT_CATALOG_DIR)
    generated_modules = []

    for (category, subcat), items in groups.items():
        category_slug = slugify(category)
        subcat_slug = slugify(subcat)
        target_dir = os.path.join(PRODUCT_CATALOG_DIR, category_slug)
        ensure_dir(target_dir)
        file_path = os.path.join(target_dir, f"{subcat_slug}.py")

        var_name = f"{subcat_slug.upper()}_PRODUCTS"
        generated_modules.append((category_slug, subcat_slug, var_name, os.path.relpath(file_path, BASE_DIR).replace('\\', '/')))

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('from decimal import Decimal\n\n')
            f.write(f"# {category} / {subcat}\n")
            f.write(f"{var_name} = [\n")
            for it in items:
                f.write("    {")
                f.write(f"'product_id': {it['product_id']!r}, ")
                f.write(f"'name': {it['name']!r}, ")
                f.write(f"'sku': {it['sku']!r}, ")
                f.write(f"'unit': {it['unit']!r}, ")
                f.write(f"'category': {it['category']!r}, ")
                f.write(f"'subcategory': {it['subcategory']!r}, ")
                f.write(f"'stock_quantity': {it['stock_quantity']}, ")
                f.write(f"'reorder_level': {it['reorder_level']}, ")
                f.write(f"'reorder_qty': {it['reorder_qty']}, ")
                f.write(f"'cost_price': Decimal('{it['cost_price']}'), ")
                f.write(f"'unit_price': Decimal('{it['sale_price']}'), ")
                f.write(f"'supplier': {it['supplier']!r}, ")
                f.write(f"'brand': {it['brand']!r}, ")
                f.write(f"'status': {it['status']!r}")
                f.write('},\n')
            f.write(']\n')

    # create aggregator module
    agg_path = os.path.join(PRODUCT_CATALOG_DIR, 'generated_products.py')
    with open(agg_path, 'w', encoding='utf-8') as f:
        f.write('"""Auto-generated aggregated products module"""\n')
        f.write('from decimal import Decimal\n\n')
        imports = []
        for cat_slug, sub_slug, var_name, relpath in generated_modules:
            module_path = relpath[:-3].replace('/', '.')
            imports.append((module_path, var_name))
        for module_path, var_name in imports:
            f.write(f'from {module_path} import {var_name}\n')
        f.write('\nALL_PRODUCTS = []\n')
        for _, var_name in imports:
            f.write(f'ALL_PRODUCTS += {var_name}\n')

    # update package __init__.py to import generated_products
    init_path = os.path.join(PRODUCT_CATALOG_DIR, '__init__.py')
    with open(init_path, 'w', encoding='utf-8') as f:
        f.write('# Auto-generated product_catalog package init\n')
        f.write('from .generated_products import ALL_PRODUCTS\n')

    print('Generated product files and aggregator successfully.')

if __name__ == "__main__":
    main()
