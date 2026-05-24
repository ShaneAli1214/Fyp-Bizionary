import pandas as pd

XLSX = 'AlNoor_ERP_Dataset.xlsx'
SHEET = 'Inventory'

xls = pd.ExcelFile(XLSX)
print('Sheets:', xls.sheet_names)
df = pd.read_excel(xls, sheet_name=SHEET)
print('Columns:', list(df.columns))
print('\nSample rows:\n')
print(df.head().to_string())
