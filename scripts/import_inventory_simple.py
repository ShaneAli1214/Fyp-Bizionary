"""
Simple Inventory importer: read Inventory sheet into a Python list
and insert the first N rows into `products.Product`.

Usage:
  .\.venv\Scripts\python.exe scripts/import_inventory_simple.py

By default it inserts 5 rows; change `SAMPLE_COUNT` to modify.
"""
import os
from pathlib import Path
import pandas as pd
from decimal import Decimal

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
import django
django.setup()

from products.models import Product


EXCEL = Path(__file__).resolve().parents[1] / 'AlNoor_ERP_Dataset.xlsx'
SAMPLE_COUNT = 5


def find_inventory_sheet(xls):
    for name in xls.sheet_names:
        if 'inventory' in name.lower():
            return name
    return None


def detect_header_and_df(xls, sheet_name):
    # read without header to inspect rows
    raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)
    # look for a row that contains likely column names
    keywords = ['sku', 'product', 'name', 'qty', 'quantity', 'unit', 'price', 'reorder']
    header_row = None
    for idx, row in raw.iterrows():
        row_text = ' '.join([str(c).strip().lower() for c in row.fillna('')])
        if any(k in row_text for k in keywords):
            header_row = idx
            break
    if header_row is None:
        # fallback: use first row as header
        df = pd.read_excel(xls, sheet_name=sheet_name)
        return df
    # read again using detected header
    df = pd.read_excel(xls, sheet_name=sheet_name, header=header_row)
    # drop rows above header (pandas already does)
    return df


def map_columns(cols):
    lowered = [c.strip().lower() for c in cols]
    mapping = {}
    for c in lowered:
        if 'sku' in c or 'product code' in c or 'product id' in c:
            mapping['sku'] = True
        if 'name' in c and 'supplier' not in c:
            mapping['name'] = True
        if 'qty' in c or 'quantity' in c or 'on hand' in c:
            mapping['qty'] = True
        if 'price' in c or 'unit price' in c or 'cost' in c:
            mapping['unit_price'] = True
        if 'reorder' in c:
            mapping['reorder'] = True
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


def build_list_and_insert(sample_count=SAMPLE_COUNT):
    if not EXCEL.exists():
        print('Excel not found:', EXCEL)
        return
    xls = pd.ExcelFile(EXCEL)
    sheet = find_inventory_sheet(xls)
    if not sheet:
        print('No inventory sheet found')
        return
    df = detect_header_and_df(xls, sheet)
    print(f"Sheet '{sheet}' rows={len(df)} cols={len(df.columns)}")

    # build python list of dicts
    items = []
    for _, r in df.iterrows():
        items.append(r.to_dict())

    print('Built list length:', len(items))

    # Insert first sample_count rows into DB (if SKU or name exists)
    inserted = 0
    for i, row in enumerate(items[:sample_count]):
        # heuristics to pick fields
        keys = {k.lower(): k for k in row.keys()}
        sku = None
        name = None
        qty = 0
        price = Decimal('0.00')

        for k in keys:
            if 'sku' in k or 'product code' in k or 'product id' in k:
                sku = str(row[keys[k]]).strip()
            if 'name' in k and 'supplier' not in k:
                name = str(row[keys[k]]).strip()
            if 'qty' in k or 'quantity' in k or 'on hand' in k:
                qty = to_int(row[keys[k]])
            if 'price' in k or 'unit price' in k or 'cost' in k:
                price = to_decimal(row[keys[k]])

        if not sku and not name:
            print(f'Skipping row {i}: no sku/name')
            continue

        if not sku:
            sku = (name or f'ITEM{i}').replace(' ', '-').upper()[:100]
        if not name:
            name = sku

        # create or update minimal fields
        p = Product.objects.filter(sku__iexact=sku).first()
        if p:
            p.stock_quantity = qty
            p.unit_price = price
            p.save()
            print(f'Updated existing SKU={sku} qty={qty}')
        else:
            Product.objects.create(
                sku=sku[:100],
                name=(name[:255] if name else sku),
                stock_quantity=qty,
                unit_price=price,
            )
            print(f'Inserted SKU={sku} name={name} qty={qty}')
        inserted += 1

    print('Inserted/Updated count:', inserted)


if __name__ == '__main__':
    build_list_and_insert()
