"""
Import the Products sheet from Excel into the Product model.

Usage:
    python scripts/import_inventory.py

This script reads `AlNoor_ERP_Dataset.xlsx` in the repo root and updates or
creates `products.Product` rows using the Products sheet as the source of truth.
"""
import os
import sys
from pathlib import Path

import pandas as pd

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import django
django.setup()

from decimal import Decimal
from products.models import Product


EXCEL_PATH = Path(__file__).resolve().parents[1] / 'AlNoor_ERP_Dataset.xlsx'


def find_sheet(xls, keyword):
    for name in xls.sheet_names:
        if keyword in name.lower():
            return name
    return None


def detect_header_row(xls, sheet_name):
    raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)
    keywords = ['product id', 'category', 'sub-category', 'product name', 'sku', 'cost price', 'sale price', 'qty in hand', 'stock status']
    for idx, row in raw.iterrows():
        row_text = ' '.join(str(value).strip().lower() for value in row.fillna(''))
        if any(keyword in row_text for keyword in keywords):
            return idx
    return 0


def map_columns(cols, mode='products'):
    # return keys for the selected mode: products or inventory
    lowered = [c.strip().lower() for c in cols]
    mapping = {}
    for i, c in enumerate(lowered):
        if any(k in c for k in ('sku', 'product code', 'product_code')):
            mapping['sku'] = cols[i]
        elif any(k in c for k in ('product name', 'name', 'product')) and 'supplier' not in c:
            mapping['name'] = cols[i]
        elif mode == 'inventory' and ('qty in hand' in c or 'qty on hand' in c or c == 'stock quantity'):
            mapping['qty'] = cols[i]
        elif 'cost price' in c or c == 'cost price (pkr)':
            mapping['cost_price'] = cols[i]
        elif 'sale price' in c or 'selling price' in c:
            mapping['sale_price'] = cols[i]
        elif 'sub-category' in c or 'subcategory' in c:
            mapping['subcategory'] = cols[i]
        elif 'category' in c and 'sub' not in c:
            mapping['category'] = cols[i]
        elif mode == 'inventory' and ('reorder level' in c or c == 'reorder level (units)'):
            mapping['reorder'] = cols[i]
        elif mode == 'inventory' and 'stock status' in c:
            mapping['stock_status'] = cols[i]
    return mapping


def to_int(v):
    try:
        if pd.isna(v):
            return 0
        return int(float(v))
    except Exception:
        return 0


def to_decimal(v):
    try:
        if pd.isna(v) or v == '':
            return Decimal('0.00')
        return Decimal(str(v)).quantize(Decimal('0.01'))
    except Exception:
        return Decimal('0.00')


def normalize_status(value, qty, reorder_level):
    raw = str(value or '').strip().lower()
    if raw:
        if 'out' in raw:
            return 'Out of Stock'
        if 'low' in raw:
            return 'Low Stock'
        if 'in' in raw:
            return 'In Stock'
    if qty <= 0:
        return 'Out of Stock'
    if qty <= reorder_level:
        return 'Low Stock'
    return 'In Stock'


def run_import(apply_changes=True):
    if not EXCEL_PATH.exists():
        print(f"Excel file not found: {EXCEL_PATH}")
        return

    xls = pd.ExcelFile(EXCEL_PATH)
    products_sheet = find_sheet(xls, 'products')
    inventory_sheet = find_sheet(xls, 'inventory')
    if not products_sheet:
        print("No Products sheet found in workbook.")
        return
    if not inventory_sheet:
        print("No Inventory sheet found in workbook.")
        return

    products_header_row = detect_header_row(xls, products_sheet)
    inventory_header_row = detect_header_row(xls, inventory_sheet)
    products_df = pd.read_excel(xls, sheet_name=products_sheet, header=products_header_row)
    inventory_df = pd.read_excel(xls, sheet_name=inventory_sheet, header=inventory_header_row)

    if products_df.shape[0] == 0:
        print("Products sheet is empty.")
        return
    if inventory_df.shape[0] == 0:
        print("Inventory sheet is empty.")
        return

    products_mapping = map_columns(list(products_df.columns), mode='products')
    inventory_mapping = map_columns(list(inventory_df.columns), mode='inventory')
    print(f"Using sheets: products='{products_sheet}' (header {products_header_row}), inventory='{inventory_sheet}' (header {inventory_header_row})")
    print('Products mapping detected:', products_mapping)
    print('Inventory mapping detected:', inventory_mapping)

    def build_lookup(df, mapping, label):
        lookup = {}
        for _, row in df.iterrows():
            sku_column = mapping.get('sku')
            if not sku_column:
                continue
            sku = str(row.get(sku_column)).strip()
            if not sku or sku.lower() == 'nan':
                continue
            lookup[sku] = row
        if not lookup:
            print(f'Warning: no rows mapped from {label} sheet.')
        return lookup

    products_lookup = build_lookup(products_df, products_mapping, 'Products')
    inventory_lookup = build_lookup(inventory_df, inventory_mapping, 'Inventory')
    all_skus = list(dict.fromkeys([*products_lookup.keys(), *inventory_lookup.keys()]))

    updated = 0
    created = 0
    skipped = 0
    errors = 0

    for idx, sku in enumerate(all_skus):
        try:
            name = None
            category = None
            subcategory = None
            qty = None
            cost_price = None
            sale_price = None
            reorder = None
            stock_status = None

            product_row = products_lookup.get(sku, {})
            inventory_row = inventory_lookup.get(sku, {})

            if products_mapping.get('name') and product_row is not None:
                name = str(product_row.get(products_mapping['name'])).strip()
            if inventory_mapping.get('name') and not name and inventory_row is not None:
                name = str(inventory_row.get(inventory_mapping['name'])).strip()

            if products_mapping.get('category') and product_row is not None:
                category = str(product_row.get(products_mapping['category'])).strip()
            if inventory_mapping.get('category') and not category and inventory_row is not None:
                category = str(inventory_row.get(inventory_mapping['category'])).strip()

            if products_mapping.get('subcategory') and product_row is not None:
                subcategory = str(product_row.get(products_mapping['subcategory'])).strip()
            if inventory_mapping.get('subcategory') and not subcategory and inventory_row is not None:
                subcategory = str(inventory_row.get(inventory_mapping['subcategory'])).strip()

            if inventory_mapping.get('qty') and inventory_row is not None:
                qty = to_int(inventory_row.get(inventory_mapping['qty']))

            if inventory_mapping.get('reorder') and inventory_row is not None:
                reorder = to_int(inventory_row.get(inventory_mapping['reorder']))

            if inventory_mapping.get('stock_status') and inventory_row is not None:
                stock_status = inventory_row.get(inventory_mapping['stock_status'])

            if products_mapping.get('cost_price') and product_row is not None:
                cost_price = to_decimal(product_row.get(products_mapping['cost_price']))
            if products_mapping.get('sale_price') and product_row is not None:
                sale_price = to_decimal(product_row.get(products_mapping['sale_price']))

            if not name:
                name = sku
            if qty is None:
                qty = 0
            if cost_price is None:
                cost_price = Decimal('0.00')
            if sale_price is None:
                sale_price = cost_price
            if reorder is None:
                reorder = 20

            status_label = normalize_status(stock_status, qty, reorder)

            product = Product.objects.filter(sku__iexact=sku).first()

            if product:
                # update fields
                changed = False
                if product.name != name:
                    print(f"Update SKU {sku}: name {product.name} -> {name}")
                    if apply_changes:
                        product.name = name
                        changed = True
                if (product.category or '') != (category or ''):
                    print(f"Update SKU {sku}: category {product.category} -> {category}")
                    if apply_changes:
                        product.category = category or ''
                        changed = True
                if (product.subcategory or '') != (subcategory or ''):
                    print(f"Update SKU {sku}: subcategory {product.subcategory} -> {subcategory}")
                    if apply_changes:
                        product.subcategory = subcategory or ''
                        changed = True
                if product.stock_quantity != qty:
                    print(f"Update SKU {sku}: stock {product.stock_quantity} -> {qty}")
                    if apply_changes:
                        product.stock_quantity = qty
                        changed = True
                if product.cost_price != cost_price:
                    print(f"Update SKU {sku}: cost {product.cost_price} -> {cost_price}")
                    if apply_changes:
                        product.cost_price = cost_price
                        changed = True
                if product.unit_price != sale_price:
                    print(f"Update SKU {sku}: sale {product.unit_price} -> {sale_price}")
                    if apply_changes:
                        product.unit_price = sale_price
                        changed = True
                if reorder and product.min_stock != reorder:
                    print(f"Update SKU {sku}: min_stock {product.min_stock} -> {reorder}")
                    if apply_changes:
                        product.min_stock = reorder
                        changed = True
                if product.stock_status != status_label:
                    print(f"Update SKU {sku}: status {product.stock_status} -> {status_label}")
                if changed and apply_changes:
                    product.save()
                    updated += 1
                elif changed:
                    updated += 1
            else:
                # create minimal product
                print(f"Create SKU {sku} Name: {name} Qty: {qty}")
                if apply_changes:
                    Product.objects.create(
                        sku=sku[:100],
                        name=(name or sku)[:255],
                        category=(category or '')[:100] if category else '',
                        subcategory=(subcategory or '')[:150] if subcategory else '',
                        cost_price=cost_price,
                        unit_price=sale_price,
                        stock_quantity=qty,
                        min_stock=reorder,
                    )
                    created += 1
                else:
                    created += 1

        except Exception as e:
            print(f"Error processing row {idx} / SKU {sku}: {e}")
            errors += 1

    print('\nImport summary:')
    print(f'  Updated: {updated}')
    print(f'  Created: {created}')
    print(f'  Skipped: {skipped}')
    print(f'  Errors:  {errors}')


if __name__ == '__main__':
    # run with apply by default (user requested import)
    run_import(apply_changes=True)
