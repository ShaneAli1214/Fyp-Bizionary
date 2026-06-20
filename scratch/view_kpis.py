import sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
xls = pd.ExcelFile("AlNoor_Financial_Summary.xlsx")
df = pd.read_excel(xls, 'KPI Dashboard Data')
print(df)
