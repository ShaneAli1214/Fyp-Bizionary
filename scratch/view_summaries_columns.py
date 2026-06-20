import sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
xls = pd.ExcelFile("AlNoor_Financial_Summary.xlsx")

for name in ['Daily Totals', 'Category Summary', 'KPI Dashboard Data']:
    print(f"\n==================== {name} ====================")
    df = pd.read_excel(xls, name)
    print("Row 0:", df.iloc[0].tolist())
    print(df.head(5))
