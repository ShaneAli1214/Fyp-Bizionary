"""Import 30-day sales quantities CSV into the Django Sale table.

Default behavior preserves the literal day-month headers from the CSV
(e.g. 1-Jan .. 30-Jan) and assigns them to the selected year.

Usage:
  c:/Users/Dell/Desktop/Fyp/.venv/Scripts/python.exe scripts/import_30day_sales_to_db.py
  c:/Users/Dell/Desktop/Fyp/.venv/Scripts/python.exe scripts/import_30day_sales_to_db.py --csv output/30day_sales_AlNoor.csv
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path

import django


DEFAULT_CSV_PATH = os.path.join("output", "30day_sales_AlNoor.csv")
DAY_COLUMN_PATTERN = re.compile(r"^\d{1,2}-[A-Za-z]{3}$")
PROJECT_ROOT = Path(__file__).resolve().parents[1]
MONTHS_BY_NAME = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def setup_django() -> None:
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "erp_system.settings")
    django.setup()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import 30-day sales CSV into sqlite via Django ORM")
    parser.add_argument("--csv", dest="csv_path", default=DEFAULT_CSV_PATH, help="Path to CSV file")
    parser.add_argument("--customer", default="AlNoor (CSV Import)", help="Customer name for created Sale rows")
    parser.add_argument(
        "--year",
        type=int,
        default=date.today().year,
        help="Year to assign when preserving CSV day-month headers (default: current year)",
    )
    parser.add_argument(
        "--rolling-window",
        action="store_true",
        help="Map CSV day columns to the latest rolling N-day window instead of literal month/day headers.",
    )
    parser.add_argument(
        "--replace-existing-imports",
        action="store_true",
        help="Delete previous CSV-ALNOOR imported sale rows before inserting new ones.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate data but do not write records",
    )
    return parser.parse_args()


def get_day_columns(fieldnames: list[str]) -> list[str]:
    day_columns = [name for name in fieldnames if DAY_COLUMN_PATTERN.match((name or "").strip())]
    if len(day_columns) != 30:
        raise ValueError(f"Expected 30 day columns, found {len(day_columns)}")

    day_columns.sort(key=lambda col: int(col.split("-")[0]))
    return day_columns


def get_target_dates_rolling(day_count: int) -> list[date]:
    end_date = date.today()
    start_date = end_date - timedelta(days=day_count - 1)
    return [start_date + timedelta(days=offset) for offset in range(day_count)]


def get_target_dates_from_headers(day_columns: list[str], year: int) -> list[date]:
    dates = []
    detected_months = set()

    for column in day_columns:
        day_str, month_str = column.split("-", 1)
        day = int(day_str)
        month = MONTHS_BY_NAME.get(month_str.strip().lower())
        if not month:
            raise ValueError(f"Unsupported month token in column: {column}")
        detected_months.add(month)
        dates.append(date(year, month, day))

    if len(detected_months) != 1:
        raise ValueError("CSV day columns span multiple months; expected a single-month 30-day dataset")

    return dates


def to_int(value: str) -> int:
    try:
        return int((value or "").strip() or 0)
    except ValueError:
        return 0


def main() -> None:
    args = parse_args()
    setup_django()

    from products.models import Product
    from sales.models import Sale

    csv_path = args.csv_path
    if not os.path.isabs(csv_path):
        csv_path = os.path.join(os.getcwd(), csv_path)

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("CSV appears empty or missing headers")

        day_columns = get_day_columns(reader.fieldnames)
        target_dates = (
            get_target_dates_rolling(len(day_columns))
            if args.rolling_window
            else get_target_dates_from_headers(day_columns, args.year)
        )

        if args.replace_existing_imports and not args.dry_run:
            deleted_count, _ = Sale.objects.filter(invoice_number__startswith="CSV-ALNOOR-").delete()
            print(f"Deleted previous CSV imports: {deleted_count}")

        created = 0
        skipped_duplicates = 0
        skipped_missing_products = 0
        skipped_zero_qty = 0

        for row in reader:
            sku = (row.get("SKU") or "").strip()
            product_name = (row.get("Product Name") or "").strip()

            product = None
            if sku:
                product = Product.objects.filter(sku=sku).first()
            if product is None and product_name:
                product = Product.objects.filter(name=product_name).first()

            if product is None:
                skipped_missing_products += 1
                continue

            for index, day_col in enumerate(day_columns):
                qty = to_int(row.get(day_col, "0"))
                if qty <= 0:
                    skipped_zero_qty += 1
                    continue

                sale_date = target_dates[index]
                unit_price = Decimal(product.unit_price)

                try:
                    total_price = (unit_price * Decimal(qty)).quantize(Decimal("0.01"))
                except (InvalidOperation, ValueError):
                    continue

                # Stable import key prevents duplicate insertions across reruns.
                invoice_number = f"CSV-ALNOOR-{sale_date.isoformat()}-{product.sku}"

                if Sale.objects.filter(invoice_number=invoice_number).exists():
                    skipped_duplicates += 1
                    continue

                if args.dry_run:
                    created += 1
                    continue

                Sale.objects.create(
                    product=product,
                    customer_name=args.customer,
                    quantity_sold=qty,
                    line_items=[
                        {
                            "product": product.id,
                            "product_name": product.name,
                            "product_code": product.sku,
                            "quantity_sold": qty,
                            "unit_price": str(unit_price),
                            "total_price": str(total_price),
                        }
                    ],
                    unit_price=unit_price,
                    total_price=total_price,
                    discount=Decimal("0.00"),
                    invoice_number=invoice_number,
                    notes=(
                        "Imported from output/30day_sales_AlNoor.csv "
                        f"({'rolling window' if args.rolling_window else f'header dates {args.year}'})"
                    ),
                    payment_status="PAID",
                    payment_method="CASH",
                    sale_date=sale_date,
                )
                created += 1

    print("Import complete")
    print(f"Created sales rows: {created}")
    print(f"Skipped duplicates: {skipped_duplicates}")
    print(f"Skipped missing products: {skipped_missing_products}")
    print(f"Skipped zero-quantity cells: {skipped_zero_qty}")


if __name__ == "__main__":
    main()
