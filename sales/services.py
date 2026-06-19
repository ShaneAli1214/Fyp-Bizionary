import os
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
import pandas as pd
from django.db import transaction
from django.conf import settings
from products.models import Product
from sales.models import Sale

HEADER_KEYWORDS = ('product id', 'product name', 'category', 'sku', 'qty in hand', 'sale price')

class SalesImportService:
    @staticmethod
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

    @staticmethod
    def normalize_date(value: object) -> date:
        if isinstance(value, pd.Timestamp):
            return value.to_pydatetime().date()
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        return pd.to_datetime(value).date()

    @staticmethod
    def to_int(value: object) -> int:
        try:
            if pd.isna(value):
                return 0
            return int(float(value))
        except Exception:
            return 0

    @staticmethod
    def to_decimal(value: object) -> Decimal:
        try:
            if pd.isna(value) or value == '':
                return Decimal('0.00')
            return Decimal(str(value)).quantize(Decimal('0.01'))
        except Exception:
            return Decimal('0.00')

    @staticmethod
    def first_existing_column(columns: list[str], candidates: tuple[str, ...]) -> str | None:
        lowered = {str(column).strip().lower(): column for column in columns}
        for candidate in candidates:
            for key, original in lowered.items():
                if candidate in key:
                    return original
        return None

    @classmethod
    def sync_monthly_sales_files(cls, force: bool = False) -> dict:
        """
        Scans output/ directory for Excel sales workbooks.
        Detects month files, and imports them dynamically.
        """
        output_dir = Path(settings.BASE_DIR) / 'output'
        if not output_dir.exists():
            return {
                'success': False,
                'error': f"Output directory not found at {output_dir}"
            }

        xlsx_files = list(output_dir.glob('*.xlsx'))
        # Exclude temp/hidden files starting with ~$
        xlsx_files = [f for f in xlsx_files if not f.name.startswith('~$')]

        if not xlsx_files:
            return {
                'success': True,
                'message': "No Excel files found in output directory.",
                'details': []
            }

        details = []
        total_created = 0
        total_skipped = 0

        # Load all products once for performance
        all_products = {product.sku: product for product in Product.objects.all()}
        # Also build mapping by name for fallback matching
        all_products_by_name = {product.name.strip().lower(): product for product in Product.objects.all()}

        for filepath in xlsx_files:
            filename = filepath.name
            filename_stem = filepath.stem
            # stable, unique invoice prefix for this file
            prefix = f"XLSX-ALNOOR-{filename_stem.upper().replace(' ', '_')}-"

            # Check if this file has already been imported
            exists = Sale.objects.filter(invoice_number__startswith=prefix).exists()
            if exists and not force:
                details.append({
                    'filename': filename,
                    'status': 'SKIPPED',
                    'message': 'Already imported. Use force=True to re-import.'
                })
                continue

            try:
                xls = pd.ExcelFile(filepath)
                
                # Sheet detection
                sheet_name = None
                preferred_sheet = 'Sales Data'
                if preferred_sheet in xls.sheet_names:
                    sheet_name = preferred_sheet
                else:
                    for s in xls.sheet_names:
                        if 'sales' in s.lower() or 'data' in s.lower():
                            sheet_name = s
                            break
                    if not sheet_name:
                        sheet_name = xls.sheet_names[0]

                # Header row detection
                raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)
                header_row = 0
                for idx, row in raw.iterrows():
                    row_text = ' '.join(str(value).strip().lower() for value in row.fillna(''))
                    if all(keyword in row_text for keyword in HEADER_KEYWORDS[:4]) or (
                        'sku' in row_text and 'qty in hand' in row_text and ('sale price' in row_text or 'stock status' in row_text)
                    ):
                        header_row = idx
                        break

                df = pd.read_excel(xls, sheet_name=sheet_name, header=header_row)
                if df.empty:
                    details.append({
                        'filename': filename,
                        'status': 'ERROR',
                        'message': f"Sheet '{sheet_name}' is empty."
                    })
                    continue

                # Find columns
                sku_col = cls.first_existing_column(list(df.columns), ('sku', 'product code', 'product id'))
                name_col = cls.first_existing_column(list(df.columns), ('product name', 'name'))
                customer_col = cls.first_existing_column(list(df.columns), ('customer', 'client'))
                qty_cols = [col for col in df.columns if cls.is_date_like(col)]
                qty_cols = sorted(qty_cols, key=cls.normalize_date)

                if not sku_col:
                    details.append({
                        'filename': filename,
                        'status': 'ERROR',
                        'message': "Could not detect SKU/Product ID column."
                    })
                    continue

                if not qty_cols:
                    details.append({
                        'filename': filename,
                        'status': 'ERROR',
                        'message': "Could not detect any date/sales columns."
                    })
                    continue

                created_count = 0
                skipped_zero = 0
                missing_products = set()

                with transaction.atomic():
                    # Clear existing sales with this prefix
                    deleted_count, _ = Sale.objects.filter(invoice_number__startswith=prefix).delete()

                    for _, row in df.iterrows():
                        sku_val = str(row.get(sku_col, '')).strip()
                        if not sku_val or sku_val.lower() == 'nan':
                            continue

                        # Find product
                        product = all_products.get(sku_val)
                        if product is None and name_col:
                            name_val = str(row.get(name_col, '')).strip()
                            if name_val:
                                product = all_products_by_name.get(name_val.lower())

                        if product is None:
                            missing_products.add(sku_val)
                            continue

                        unit_price = cls.to_decimal(product.unit_price)
                        cust_name = str(row.get(customer_col, 'AlNoor Trading')).strip() if customer_col else 'AlNoor Trading'

                        for qty_col in qty_cols:
                            qty = cls.to_int(row.get(qty_col, 0))
                            if qty <= 0:
                                skipped_zero += 1
                                continue

                            sale_date = cls.normalize_date(qty_col)
                            total_price = (unit_price * Decimal(qty)).quantize(Decimal('0.01'))

                            # Save individually to trigger Django signals
                            Sale.objects.create(
                                product=product,
                                customer_name=cust_name,
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
                                invoice_number=f"{prefix}{sale_date.isoformat()}-{product.sku}",
                                notes=f"Imported dynamically from {filename}",
                                payment_status='PAID',
                                payment_method='CASH',
                                sale_date=sale_date
                            )
                            created_count += 1

                total_created += created_count
                total_skipped += skipped_zero
                details.append({
                    'filename': filename,
                    'status': 'SUCCESS',
                    'created_records': created_count,
                    'skipped_zero_quantity': skipped_zero,
                    'missing_products': list(missing_products),
                    'deleted_previous': deleted_count
                })

            except Exception as e:
                details.append({
                    'filename': filename,
                    'status': 'ERROR',
                    'message': f"Failed to process: {str(e)}"
                })

        return {
            'success': True,
            'total_created': total_created,
            'total_skipped': total_skipped,
            'details': details
        }
