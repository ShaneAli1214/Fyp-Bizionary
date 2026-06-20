import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')
wb = openpyxl.load_workbook("AlNoor_Financial_Summary.xlsx")
sheet = wb["KPI Dashboard Data"]
print("=== KPI Dashboard Data ===")
for r in range(1, 30):
    row_vals = [sheet.cell(row=r, column=c).value for c in range(1, 10)]
    if any(row_vals):
        print(f"Row {r}: {row_vals}")
wb.close()
