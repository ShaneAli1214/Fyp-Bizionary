import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_30day_sales(df, qty_col='Qty in Hand', category_col='Category',
                         start_date='2025-01-01', days=30, seed=None):
    if seed is not None:
        np.random.seed(seed)

    df_out = df.copy().reset_index(drop=True)
    start = datetime.fromisoformat(start_date)
    # generate labels like '1-Jan' .. '30-Jan'
    try:
        date_labels = [(start + timedelta(days=i)).strftime('%-d-%b') for i in range(days)]
    except Exception:
        date_labels = [(start + timedelta(days=i)).strftime('%d-%b').lstrip('0') for i in range(days)]

    def simulate_row(row):
        remaining = int(row.get(qty_col, 0))
        cat = str(row.get(category_col, '')).strip()
        prev_sale = 0
        sales = []
        for d in range(days):
            day_dt = start + timedelta(days=d)
            weekday = day_dt.weekday()  # Mon=0 ... Sun=6
            demand = 0

            # Category rules
            if cat == 'Grocery & Food Items':
                demand = np.random.randint(5, 21)
            elif cat == 'Pharmaceuticals & Health':
                demand = np.random.randint(2, 11)
            elif cat == 'Clothing & Textiles':
                demand = np.random.randint(1, 6)
            elif cat == 'Stationery & Office Supplies':
                demand = np.random.randint(1, 13)
            elif cat == 'Construction & Hardware':
                if np.random.rand() < 0.45:
                    demand = np.random.randint(1, 9)
                else:
                    demand = 0
            elif cat == 'Automobiles & Accessories':
                if np.random.rand() < 0.40:
                    demand = np.random.randint(1, 5)
                else:
                    demand = 0
            elif cat == 'Electronics & Appliances':
                if prev_sale > 0:
                    if np.random.rand() < 0.15:
                        demand = 1
                    else:
                        demand = 0
                else:
                    if np.random.rand() < 0.35:
                        demand = np.random.randint(1, 3)
                    else:
                        demand = 0
            else:
                if np.random.rand() < 0.25:
                    demand = np.random.randint(1, 4)
                else:
                    demand = 0

            # Weekend boost: Friday(4), Saturday(5), Sunday(6)
            if weekday in (4,5,6) and demand > 0:
                demand = int(np.round(demand * 1.4))

            sale = min(int(demand), remaining)
            sales.append(sale)

            remaining -= sale
            prev_sale = sale

            if remaining <= 0:
                sales.extend([0] * (days - len(sales)))
                break
        return sales

    sales_matrix = df_out.apply(simulate_row, axis=1, result_type='expand')
    sales_matrix.columns = date_labels
    sales_matrix = sales_matrix.fillna(0).astype(int)

    result = pd.concat([df_out, sales_matrix.reset_index(drop=True)], axis=1)
    return result


if __name__ == '__main__':
    # Sample run using a small subset to demonstrate functionality
    sample = pd.DataFrame([
        {'Product ID': 'PK-1001', 'Category': 'Electronics & Appliances', 'Product Name': 'Samsung Galaxy A54', 'Qty in Hand': 10},
        {'Product ID': 'PK-1073', 'Category': 'Grocery & Food Items', 'Product Name': "K&N's Chicken Strips 400g", 'Qty in Hand': 50},
        {'Product ID': 'PK-1124', 'Category': 'Construction & Hardware', 'Product Name': 'Primer 4L', 'Qty in Hand': 8},
        {'Product ID': 'PK-1160', 'Category': 'Pharmaceuticals & Health', 'Product Name': 'Thermometer Digital', 'Qty in Hand': 5},
    ])

    df_with_sales = generate_30day_sales(sample, start_date='2025-01-01', days=30, seed=12345)
    print(df_with_sales.to_string(index=False))
