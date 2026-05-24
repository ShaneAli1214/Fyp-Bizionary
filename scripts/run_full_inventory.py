import os
import sys
import pandas as pd

# Ensure scripts directory is on path so we can import generate_30day_sales
sys.path.insert(0, os.path.dirname(__file__))
from generate_30day_sales import generate_30day_sales

INPUT_XLSX = 'AlNoor_ERP_Dataset.xlsx'
SHEET_NAME = 'Inventory'
OUT_DIR = 'output'
OUT_CSV = os.path.join(OUT_DIR, '30day_sales_AlNoor.csv')

def main():
    if not os.path.exists(INPUT_XLSX):
        raise FileNotFoundError(f"Input file {INPUT_XLSX} not found")

    xls = pd.ExcelFile(INPUT_XLSX)
    if SHEET_NAME not in xls.sheet_names:
        raise ValueError(f"Sheet '{SHEET_NAME}' not found in {INPUT_XLSX}. Sheets: {xls.sheet_names}")

    # The sheet contains a title row; actual headers are on the second row (index 1)
    df = pd.read_excel(xls, sheet_name=SHEET_NAME, header=1)

    # Normalize column names expected by generator
    # Ensure columns: 'Product ID', 'Category', 'Product Name', 'Qty in Hand'
    required = ['Product ID', 'Category', 'Product Name', 'Qty in Hand']
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Required column '{col}' not found in sheet '{SHEET_NAME}'")

    os.makedirs(OUT_DIR, exist_ok=True)

    # Run generator
    result = generate_30day_sales(df, start_date='2025-01-01', days=30, seed=42)

    # Save
    result.to_csv(OUT_CSV, index=False)
    print(f"Saved 30-day sales to {OUT_CSV}")

if __name__ == '__main__':
    main()
