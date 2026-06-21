import openpyxl

wb = openpyxl.load_workbook("AlNoor_ERP_Dataset.xlsx", read_only=True)
sheet = wb["Suppliers"]
print("Row | Supplier Name | Col 3 (Category) | Col 7 (City)")
for r in range(1, 60):
    row_cells = [sheet.cell(row=r, column=c).value for c in (2, 3, 7)]
    if not any(row_cells):
        continue
    print(f"{r:2} | {str(row_cells[0]):25} | {str(row_cells[1]):20} | {str(row_cells[2]):15}")
wb.close()
