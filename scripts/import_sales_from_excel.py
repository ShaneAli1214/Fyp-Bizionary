"""
Import a 30-day sales workbook into the Django Sale table.

Usage:
    python scripts/import_sales_from_excel.py
    python scripts/import_sales_from_excel.py --workbook output/30day_sales_AlNoor_cleaned.xlsx
    python scripts/import_sales_from_excel.py --dry-run

The script is designed for workbooks that contain a sales grid with product
identifiers plus one date column per day. It auto-detects the sales sheet,
header row, and date columns, then inserts one Sale row per non-zero cell.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import django
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = PROJECT_ROOT / 'output' / '30day_sales_AlNoor_cleaned.xlsx'
DEFAULT_SHEET_NAME = 'Sales Data'
DEFAULT_INVOICE_PREFIX = 'XLSX-ALNOOR-'
HEADER_KEYWORDS = ('product id', 'product name', 'category', 'sku', 'qty in hand', 'sale price')


def setup_django() -> None:
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
    django.setup()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Import sales rows from an Excel workbook into SQLite via Django ORM')
    parser.add_argument('--workbook', default=str(DEFAULT_WORKBOOK), help='Path to the Excel workbook')
    parser.add_argument('--sheet', default=DEFAULT_SHEET_NAME, help='Preferred sheet name (falls back to sales-like sheet detection)')
    parser.add_argument('--customer', default='AlNoor Trading', help='Customer name to store on imported sales rows')
    parser.add_argument('--prefix', default=DEFAULT_INVOICE_PREFIX, help='Invoice prefix used for stable imports')
    parser.add_argument('--replace-existing-imports', action='store_true', help='Delete rows that match the invoice prefix before importing')
    parser.add_argument('--dry-run', action='store_true', help='Validate and count rows without writing to the database')
    return parser.parse_args()


def find_sheet_name(xls: pd.ExcelFile, preferred_sheet: str) -> str:
    if preferred_sheet in xls.sheet_names:
        return preferred_sheet

    for sheet_name in xls.sheet_names:
        lowered = sheet_name.lower()
        if 'sales' in lowered or 'data' in lowered:
            return sheet_name

    return xls.sheet_names[0]


def detect_header_row(xls: pd.ExcelFile, sheet_name: str) -> int:
    raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)

    for idx, row in raw.iterrows():
        row_text = ' '.join(str(value).strip().lower() for value in row.fillna(''))
        if all(keyword in row_text for keyword in HEADER_KEYWORDS[:4]) or (
            'sku' in row_text and 'qty in hand' in row_text and ('sale price' in row_text or 'stock status' in row_text)
        ):
            return idx

    return 0


def is_date_like(value: object) -> bool:
    if isinstance(value, (datetime, date, pd.Timestamp)):
        return True

    text = str(value).strip()
    if not text or text.startswith('Unnamed:'):
        return False

    try:
        pd.to_datetime(text, errors='raise')
        return True
    except Exception:
        return False


def normalize_date(value: object) -> date:
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime().date()
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return pd.to_datetime(value).date()


def to_int(value: object) -> int:
    try:
        if pd.isna(value):
            return 0
        return int(float(value))
    except Exception:
        return 0


def to_decimal(value: object) -> Decimal:
    try:
        if pd.isna(value) or value == '':
            return Decimal('0.00')
        return Decimal(str(value)).quantize(Decimal('0.01'))
    except Exception:
        return Decimal('0.00')


def first_existing_column(columns: list[str], candidates: tuple[str, ...]) -> str | None:
    lowered = {str(column).strip().lower(): column for column in columns}
    for candidate in candidates:
        for key, original in lowered.items():
            if candidate in key:
                return original
    return None


def main() -> None:
    args = parse_args()
    setup_django()

    from products.models import Product
    from sales.models import Sale

    workbook_path = Path(args.workbook)
    if not workbook_path.is_absolute():
        workbook_path = PROJECT_ROOT / workbook_path

    if not workbook_path.exists():
        raise FileNotFoundError(f'Workbook not found: {workbook_path}')

    xls = pd.ExcelFile(workbook_path)
    sheet_name = find_sheet_name(xls, args.sheet)
    header_row = detect_header_row(xls, sheet_name)

    df = pd.read_excel(xls, sheet_name=sheet_name, header=header_row)
    if df.empty:
        raise ValueError(f'Sheet "{sheet_name}" is empty')

    sku_column = first_existing_column(list(df.columns), ('sku', 'product code', 'product id'))
    name_column = first_existing_column(list(df.columns), ('product name', 'name'))
    customer_column = first_existing_column(list(df.columns), ('customer', 'client'))
    quantity_columns = [column for column in df.columns if is_date_like(column)]
    quantity_columns = sorted(quantity_columns, key=normalize_date)

    if not sku_column:
        raise ValueError('Could not detect a SKU/Product ID column')
    if not quantity_columns:
        raise ValueError('Could not detect any date columns')

    product_skus = [str(value).strip() for value in df[sku_column].dropna().tolist() if str(value).strip() and str(value).strip().lower() != 'nan']
    products_by_sku = {product.sku: product for product in Product.objects.filter(sku__in=product_skus)}

    if args.replace_existing_imports and not args.dry_run:
        deleted_count, _ = Sale.objects.filter(invoice_number__startswith=args.prefix).delete()
        print(f'Deleted existing imported sales: {deleted_count}')

    prepared_rows: list[Sale] = []
    missing_products: list[str] = []
    skipped_zero_qty = 0

    for _, row in df.iterrows():
        sku_value = str(row.get(sku_column, '')).strip()
        if not sku_value or sku_value.lower() == 'nan':
            continue

        product = products_by_sku.get(sku_value)
        if product is None and name_column:
            product_name = str(row.get(name_column, '')).strip()
            if product_name:
                product = Product.objects.filter(name=product_name).first()

        if product is None:
            missing_products.append(sku_value)
            continue

        unit_price = to_decimal(product.unit_price)
        customer_name = str(row.get(customer_column, args.customer)).strip() if customer_column else args.customer
        if not customer_name:
            customer_name = args.customer

        for quantity_column in quantity_columns:
            qty = to_int(row.get(quantity_column, 0))
            if qty <= 0:
                skipped_zero_qty += 1
                continue

            sale_date = normalize_date(quantity_column)
            total_price = (unit_price * Decimal(qty)).quantize(Decimal('0.01'))
            prepared_rows.append(
                Sale(
                    product=product,
                    customer_name=customer_name,
                    quantity_sold=qty,
                    line_items=[{
                        'product': product.id,
                        'product_name': product.name,
                        'product_code': product.sku,
                        'quantity_sold': qty,
                        'unit_price': str(unit_price),
                        'total_price': str(total_price),
                    }],
                    unit_price=unit_price,
                    total_price=total_price,
                    discount=Decimal('0.00'),
                    invoice_number=f'{args.prefix}{sale_date.isoformat()}-{product.sku}',
                    notes=f'Imported from {workbook_path.name} ({sheet_name})',
                    payment_status='PAID',
                    payment_method='CASH',
                    sale_date=sale_date,
                )
            )

    if args.dry_run:
        print('Dry run complete')
        print(f'Workbook: {workbook_path}')
        print(f'Sheet: {sheet_name} (header row {header_row})')
        print(f'SKU column: {sku_column}')
        print(f'Date columns: {len(quantity_columns)}')
        print(f'Prepared rows: {len(prepared_rows)}')
        print(f'Skipped zero-quantity cells: {skipped_zero_qty}')
        print(f'Missing products: {len(missing_products)}')
        if missing_products:
            print(f'Missing product sample: {missing_products[:10]}')
        return

    created = 0
    batch_size = 500
    for start in range(0, len(prepared_rows), batch_size):
        Sale.objects.bulk_create(prepared_rows[start:start + batch_size], batch_size=batch_size)
        created += len(prepared_rows[start:start + batch_size])

    print('Import complete')
    print(f'Workbook: {workbook_path}')
    print(f'Sheet: {sheet_name} (header row {header_row})')
    print(f'Created sales rows: {created}')
    print(f'Skipped zero-quantity cells: {skipped_zero_qty}')
    print(f'Missing products: {len(missing_products)}')
    if missing_products:
        print(f'Missing product sample: {missing_products[:10]}')


if __name__ == '__main__':
    main()