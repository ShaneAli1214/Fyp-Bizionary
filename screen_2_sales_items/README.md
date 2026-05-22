# Screen 2: Sales & Items Management - API Documentation

## Overview
This folder contains two Django apps for the Sales & Items Management screen:
- **items_management**: Product CRUD, inventory, stock tracking
- **sales_analytics**: KPIs, performance metrics, sales analytics

## Folder Structure
```
screen_2_sales_items/
├── __init__.py
├── urls.py                          # Main URL router for screen 2
├── items_management/                # Product & inventory management
│   ├── models.py                    # Category, ProductImage, StockHistory
│   ├── views.py                     # CRUD operations, filters, search
│   ├── serializers.py               # 6 serializers for different use cases
│   ├── urls.py                      # 6 API endpoints
│   └── admin.py                     # Django admin configuration
└── sales_analytics/                 # Sales KPIs and analytics
    ├── models.py                    # SalesTarget, PerformanceMetric
    ├── views.py                     # KPI calculations, aggregations
    ├── serializers.py               # 5 serializers for analytics
    ├── urls.py                      # 6 API endpoints
    └── admin.py                     # Django admin configuration
```

---

## API Endpoints

### Base URL: `http://localhost:8000/api/screen2/`

### **Items Management APIs** (`/api/screen2/items/`)

#### 1. **List/Create Products**
```
GET  /api/screen2/items/products/
POST /api/screen2/items/products/
```

**Query Parameters (GET):**
- `search` - Search by name, SKU, or category
- `category` - Filter by category (e.g., "Electronics")
- `stock` - Filter by stock status: "low", "out", "in_stock"
- `order_by` - Sort results (default: "-created_at")

**Example:**
```bash
# Get all products
curl http://localhost:8000/api/screen2/items/products/

# Search for "wireless"
curl http://localhost:8000/api/screen2/items/products/?search=wireless

# Get low stock items in Electronics category
curl http://localhost:8000/api/screen2/items/products/?category=Electronics&stock=low
```

**POST Body (Create Product):**
```json
{
  "name": "Wireless Mouse",
  "sku": "WM-001",
  "category": "Electronics",
  "unit_price": "1500.00",
  "stock_quantity": 50,
  "reorder_level": 10,
  "description": "Ergonomic wireless mouse"
}
```

---

#### 2. **Product Detail/Update/Delete**
```
GET    /api/screen2/items/products/{id}/
PUT    /api/screen2/items/products/{id}/
DELETE /api/screen2/items/products/{id}/
```

**Example:**
```bash
# Get product details with images and stock history
curl http://localhost:8000/api/screen2/items/products/1/

# Update product stock
curl -X PUT http://localhost:8000/api/screen2/items/products/1/ \
  -H "Content-Type: application/json" \
  -d '{"stock_quantity": 75}'

# Delete product
curl -X DELETE http://localhost:8000/api/screen2/items/products/1/
```

---

#### 3. **Product Stock History**
```
GET /api/screen2/items/products/{id}/history/
```

**Response Example:**
```json
[
  {
    "id": 1,
    "product": 1,
    "product_name": "Wireless Mouse",
    "transaction_type": "SALE",
    "quantity_change": -5,
    "quantity_after": 45,
    "reference_id": "SALE-123",
    "notes": "Sold to customer",
    "created_by": "admin",
    "created_at": "2026-02-26T10:30:00Z"
  }
]
```

---

#### 4. **Categories List**
```
GET /api/screen2/items/categories/
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "parent_category": null,
    "created_at": "2026-02-26T10:00:00Z"
  }
]
```

---

#### 5. **Bulk Update Stock**
```
POST /api/screen2/items/products/bulk-update/
```

**Request Body:**
```json
{
  "updates": [
    {"product_id": 1, "quantity": 100},
    {"product_id": 2, "quantity": 50}
  ]
}
```

**Response:**
```json
{
  "updated": [
    {
      "product_id": 1,
      "name": "Wireless Mouse",
      "old_quantity": 45,
      "new_quantity": 100
    }
  ],
  "errors": [],
  "total_updated": 1
}
```

---

#### 6. **Search Suggestions (Autocomplete)**
```
GET /api/screen2/items/products/search/suggestions/?q={query}
```

**Example:**
```bash
curl http://localhost:8000/api/screen2/items/products/search/suggestions/?q=wire
```

**Response:**
```json
[
  {"id": 1, "name": "Wireless Mouse", "sku": "WM-001"},
  {"id": 5, "name": "Wireless Keyboard", "sku": "WK-005"}
]
```

---

### **Sales Analytics APIs** (`/api/screen2/analytics/`)

#### 1. **Sales KPIs (Top 4 Cards)**
```
GET /api/screen2/analytics/kpis/
```

**Response:**
```json
{
  "total_sales": "PKR 1,200,000",
  "total_revenue": "PKR 4,500,000",
  "total_orders": 1450,
  "growth_rate": "+12.5%",
  "sales_vs_last_month": "+5.2%",
  "revenue_vs_last_month": "+3.8%",
  "orders_vs_last_month": "+10.1%",
  "growth_vs_target": "+2.4%"
}
```

**Maps to UI:**
- Total Sales card
- Total Revenue card
- Total Orders card
- Growth card

---

#### 2. **Monthly Performance (Chart Data)**
```
GET /api/screen2/analytics/monthly-performance/?months=6
```

**Response:**
```json
[
  {
    "month": "2025-11",
    "month_name": "Nov",
    "revenue": "750000.00",
    "sales_count": 220
  },
  {
    "month": "2025-12",
    "month_name": "Dec",
    "revenue": "820000.00",
    "sales_count": 245
  }
]
```

**Use for:** Monthly Sales Performance chart

---

#### 3. **Category Breakdown**
```
GET /api/screen2/analytics/category-breakdown/
```

**Response:**
```json
[
  {
    "category": "Electronics",
    "total_revenue": "2500000.00",
    "total_quantity": 450,
    "order_count": 180,
    "percentage_of_total": 55.5
  }
]
```

---

#### 4. **Top Products**
```
GET /api/screen2/analytics/top-products/?limit=10
```

**Response:**
```json
[
  {
    "product_id": 1,
    "product_name": "Wireless Headphones v2",
    "sku": "WH-194-R",
    "category": "Electronics",
    "total_quantity_sold": 145,
    "total_revenue": "340200.00",
    "order_count": 35
  }
]
```

**Use for:** Product table in the screen

---

#### 5. **Sales Trends**
```
GET /api/screen2/analytics/trends/?period=daily&days=30
```

**Query Parameters:**
- `period` - "daily", "weekly", or "monthly"
- `days` - Number of days to analyze

**Response:**
```json
[
  {
    "sale_date": "2026-02-20",
    "revenue": "45000.00",
    "count": 12,
    "avg_order_value": "3750.00"
  }
]
```

---

#### 6. **Sales Targets**
```
GET  /api/screen2/analytics/targets/
POST /api/screen2/analytics/targets/
```

**POST Body:**
```json
{
  "period_type": "MONTHLY",
  "start_date": "2026-03-01",
  "end_date": "2026-03-31",
  "target_amount": "5000000.00",
  "target_units": 2000,
  "category": "Electronics",
  "notes": "Q1 2026 target"
}
```

---

## Database Models

### **items_management Models:**

**Category:**
- name, description, parent_category
- Hierarchical categories (parent-child relationship)

**ProductImage:**
- product (FK to Product)
- image (ImageField)
- is_primary (Boolean)

**StockHistory:**
- product (FK)
- transaction_type (PURCHASE, SALE, ADJUSTMENT, RETURN, DAMAGE)
- quantity_change, quantity_after
- reference_id, notes, created_by, created_at
- Audit trail for all stock movements

### **sales_analytics Models:**

**SalesTarget:**
- period_type (MONTHLY, QUARTERLY, YEARLY)
- start_date, end_date
- target_amount, target_units
- category (optional - for category-specific targets)

**PerformanceMetric:**
- metric_name, metric_value (JSON)
- last_updated
- Cache layer for expensive calculations

---

## Frontend Integration

### **For Product Table (items_management):**
```javascript
// Fetch products with filters
fetch('http://localhost:8000/api/screen2/items/products/?search=wireless&category=Electronics')
  .then(res => res.json())
  .then(data => {
    console.log(`Found ${data.count} products`);
    console.log(data.results);
  });
```

### **For KPI Cards (sales_analytics):**
```javascript
// Fetch KPIs for top 4 cards
fetch('http://localhost:8000/api/screen2/analytics/kpis/')
  .then(res => res.json())
  .then(kpis => {
    // Update UI cards
    document.getElementById('total-sales').innerText = kpis.total_sales;
    document.getElementById('revenue').innerText = kpis.total_revenue;
    document.getElementById('orders').innerText = kpis.total_orders;
    document.getElementById('growth').innerText = kpis.growth_rate;
  });
```

### **For Monthly Sales Chart:**
```javascript
// Fetch chart data
fetch('http://localhost:8000/api/screen2/analytics/monthly-performance/?months=6')
  .then(res => res.json())
  .then(data => {
    const chartData = {
      labels: data.map(d => d.month_name),
      datasets: [{
        label: 'Revenue',
        data: data.map(d => d.revenue)
      }]
    };
    // Render chart with Chart.js or Recharts
  });
```

---

## Testing

### Test All Endpoints:
```bash
# Items Management
curl http://localhost:8000/api/screen2/items/products/
curl http://localhost:8000/api/screen2/items/categories/

# Sales Analytics
curl http://localhost:8000/api/screen2/analytics/kpis/
curl http://localhost:8000/api/screen2/analytics/monthly-performance/
curl http://localhost:8000/api/screen2/analytics/top-products/
```

---

## Notes

- All endpoints return JSON
- Authentication not implemented yet (add DRF authentication in production)
- CORS enabled for frontend development
- Pagination not implemented (add for production)
- All monetary values in PKR (Pakistani Rupee)
- Dates in ISO 8601 format (YYYY-MM-DD)

---

## Next Steps

1. Test all endpoints with existing data
2. Create frontend components for this screen
3. Integrate with React/Vue for UI
4. Add authentication/authorization
5. Implement pagination for large datasets
6. Add caching for expensive analytics queries
