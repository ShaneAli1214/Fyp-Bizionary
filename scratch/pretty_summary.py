import sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
xls = pd.ExcelFile("AlNoor_Financial_Summary.xlsx")
df = pd.read_excel(xls, 'Financial Summary')
for idx, row in df.iterrows():
    print(f"Row {idx}: {row.tolist()}")
