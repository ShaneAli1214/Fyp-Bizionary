import pandas as pd
from pathlib import Path
p = Path('AlNoor_ERP_Dataset.xlsx')
print('Path exists:', p.exists())
if not p.exists():
    raise SystemExit('Excel file not found')
df = pd.read_excel(p)
print('Columns:')
for c in df.columns:
    print(repr(str(c)))
print('Sample row count:', len(df))
print('\nFirst 10 rows:')
with pd.option_context('display.max_columns', None, 'display.width', 200):
    print(df.head(10))
