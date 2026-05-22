"""
Import Inventory sheet from Excel into Product model.

Usage:
  python scripts/import_inventory.py

This script will read the Inventory sheet from
`AlNoor_ERP_Dataset.xlsx` in the repo root and update or create
`products.Product` rows, updating `stock_quantity` and optional fields.
"""
import os
import sys
from pathlib import Path
import decimal
import pandas as pd

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
import django
django.setup()

from decimal import Decimal
from products.models import Product


EXCEL_PATH = Path(__file__).resolve().parents[1] / 'AlNoor_ERP_Dataset.xlsx'


def find_inventory_sheet(xls):
    for name in xls.sheet_names:
        if 'inventory' in name.lower():
            return name
    return None


def map_columns(cols):
    # return keys: sku, name, qty, unit_price, reorder
    lowered = [c.strip().lower() for c in cols]
    mapping = {}
    for i, c in enumerate(lowered):
        if any(k in c for k in ('sku', 'product code', 'product id', 'product_code', 'product id')):
            mapping['sku'] = cols[i]
        elif any(k in c for k in ('product name', 'name', 'product')) and 'supplier' not in c:
            mapping['name'] = cols[i]
        elif any(k in c for k in ('qty', 'quantity', 'qty in hand', 'on hand', 'stock')):
            mapping['qty'] = cols[i]
        elif any(k in c for k in ('unit price', 'price', 'unit_price', 'cost')):
            mapping['unit_price'] = cols[i]
        elif 'reorder' in c:
            mapping['reorder'] = cols[i]
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


def run_import(apply_changes=True):
    if not EXCEL_PATH.exists():
        print(f"Excel file not found: {EXCEL_PATH}")
        return

    xls = pd.ExcelFile(EXCEL_PATH)
    sheet = find_inventory_sheet(xls)
    if not sheet:
        print("No Inventory sheet found in workbook.")
        return

    df = pd.read_excel(xls, sheet_name=sheet)
    if df.shape[0] == 0:
        print("Inventory sheet is empty.")
        return

    mapping = map_columns(list(df.columns))
    print(f"Using sheet: '{sheet}' — rows: {df.shape[0]}, cols: {df.shape[1]}")
    print('Column mapping detected:', mapping)

    updated = 0
    created = 0
    skipped = 0
    errors = 0

    for idx, row in df.iterrows():
        try:
            sku = None
            name = None
            qty = None
            unit_price = None
            reorder = None

            if 'sku' in mapping:
                sku = str(row.get(mapping['sku'])).strip()
            if 'name' in mapping:
                name = str(row.get(mapping['name'])).strip()
            if 'qty' in mapping:
                qty = to_int(row.get(mapping['qty']))
            if 'unit_price' in mapping:
                unit_price = to_decimal(row.get(mapping['unit_price']))
            if 'reorder' in mapping:
                reorder = to_int(row.get(mapping['reorder']))

            # fallback heuristics
            if not sku and name:
                sku = name.replace(' ', '-').upper()[:50]

            if not name and sku:
                name = sku

            if qty is None:
                qty = 0

            if unit_price is None:
                unit_price = Decimal('0.00')

            if reorder is None:
                reorder = 20

            if not sku:
                skipped += 1
                continue

            product = None
            try:
                product = Product.objects.filter(sku__iexact=sku).first()
            except Exception:
                product = None

            if product:
                # update fields
                changed = False
                if product.stock_quantity != qty:
                    print(f"Update SKU {sku}: stock {product.stock_quantity} -> {qty}")
                    if apply_changes:
                        product.stock_quantity = qty
                        changed = True
                if unit_price and product.unit_price != unit_price:
                    print(f"Update SKU {sku}: price {product.unit_price} -> {unit_price}")
                    if apply_changes:
                        product.unit_price = unit_price
                        changed = True
                if reorder and product.reorder_level != reorder:
                    print(f"Update SKU {sku}: reorder {product.reorder_level} -> {reorder}")
                    if apply_changes:
                        product.reorder_level = reorder
                        changed = True
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
                        unit_price=unit_price,
                        stock_quantity=qty,
                        reorder_level=reorder,
                    )
                    created += 1
                else:
                    created += 1

        except Exception as e:
            print(f"Error processing row {idx}: {e}")
            errors += 1

    print('\nImport summary:')
    print(f'  Updated: {updated}')
    print(f'  Created: {created}')
    print(f'  Skipped: {skipped}')
    print(f'  Errors:  {errors}')


if __name__ == '__main__':
    # run with apply by default (user requested import)
    run_import(apply_changes=True)
