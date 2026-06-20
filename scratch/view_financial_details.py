import sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
xls = pd.ExcelFile("AlNoor_Financial_Summary.xlsx")

for name in ['KPI Dashboard Data', 'Expense Tracker', 'Financial Summary']:
    print(f"\n==================== {name} ====================")
    df = pd.read_excel(xls, name)
    pd.set_option('display.max_rows', 100)
    pd.set_option('display.max_columns', 10)
    pd.set_option('display.width', 1000)
    print(df)
