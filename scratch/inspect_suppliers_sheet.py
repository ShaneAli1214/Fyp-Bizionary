import openpyxl

wb = openpyxl.load_workbook("AlNoor_ERP_Dataset.xlsx")
if "Suppliers" in wb.sheetnames:
    sheet = wb["Suppliers"]
    print("Row | Supplier Name | Category")
    for r in range(1, 15):
        print(f"{r} | {sheet.cell(row=r, column=2).value} | {sheet.cell(row=r, column=7).value}")
else:
    print("Suppliers sheet not found")
wb.close()
