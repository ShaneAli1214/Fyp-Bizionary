import pandas as pd, json
from pathlib import Path
p=Path(r'c:/Users/Dell/Desktop/Project/Final-Year-Project-clone/AlNoor_ERP_Dataset.xlsx')
xls = pd.ExcelFile(p)
out={}
for sheet in xls.sheet_names:
    df = pd.read_excel(xls, sheet_name=sheet)
    out[sheet] = {'rows': int(df.shape[0]), 'cols': int(df.shape[1]), 'columns': list(df.columns[:20]), 'sample_first_row': (df.head(1).fillna('').to_dict(orient='records')[:1] or [''])[0]}
print(json.dumps(out, indent=2))
