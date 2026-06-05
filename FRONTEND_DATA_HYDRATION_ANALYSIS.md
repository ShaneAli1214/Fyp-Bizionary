# Frontend Data Hydration Analysis - Dashboard

## Current State

### ✅ **Real API Data** (Working)
The following dashboard components correctly fetch real data from the backend API:

1. **Total Revenue KPI** (Dashboard.jsx line 95)
   - Endpoint: `dashboard/kpis/`
   - Field: `kpis.total_revenue`
   - Status: ✅ Real backend data

2. **Pending Orders** (Dashboard.jsx line 162)
   - Endpoint: `dashboard/outstanding-payables/`
   - Status: ✅ Real backend data

3. **Inventory Products** (Dashboard.jsx)
   - Endpoint: `products/`
   - Status: ✅ Real backend data

---

## ⚠️ **Hardcoded Mock Data** (Needs Fix)
These components currently display hardcoded/generated mock data instead of real API responses:

### 1. **Recent Sales Tile** - Hardcoded Seed Data
**File:** `bizionary-frontend/src/hooks/useSalesInsights.js`

**Problem:**
- Uses hardcoded `SALES_INSIGHTS_DATA` object built from `SALES_TAXONOMY`
- Generates synthetic data using seed values (line 490-502):
  ```javascript
  const SALES_INSIGHTS_DATA = {
      daily: buildSeries('daily', [...], 42),      // seed 42
      weekly: buildSeries('weekly', [...], 42),    // seed 42
      last10Days: buildSeries('last10Days', [...], 42),  // seed 42
      monthly: buildSeries('monthly', [...], 42),  // seed 42
  };
  ```
- Mock data uses hardcoded product taxonomy (Electronics, Grocery, Clothing, etc.)
- Math-based revenue generation, not actual database queries

**Impact:**
- RecentSalesTile component (bizionary-frontend/src/components/dashboard/RecentSalesTile.jsx) displays mock totals:
  - totalSalesAmount (mock)
  - totalQuantity (mock)
  - totalProfit (mock)
  - Categories and breakdown (mock)

### 2. **Sales Performance Chart** - Hardcoded Data
**File:** `bizionary-frontend/src/components/dashboard/SalesPerformanceChart.jsx`

**Problem:**
- Uses `selectedData` from `useSalesInsights` hook
- Renders chart with synthetic data from `chartData` array
- Does not query `dashboard/sales_performance/` or similar real endpoint

---

## 🔧 **How to Fix**

### Option 1: Create Backend API Endpoint (Recommended)
Create a new Django REST endpoint in `dashboard/views.py`:

```python
@api_view(['GET'])
def sales_by_period(request):
    """
    Returns sales data grouped by period (daily, weekly, monthly, last-10-days)
    with breakdown by product category
    """
    period = request.query_params.get('period', 'last10Days')
    
    # Query actual sales data from database
    sales = Sale.objects.filter(...)  # Apply date filters based on period
    
    return Response({
        'period': period,
        'totalSalesAmount': sum_of_sales,
        'totalQuantity': total_quantity,
        'totalProfit': total_profit,
        'categories': [...],  # Real category breakdown
        'chartData': [...]    # Real sales over time
    })
```

Then update URL routing in `dashboard/urls.py`:
```python
urlpatterns = [
    path('sales-by-period/', sales_by_period, name='sales_by_period'),
    # ... existing endpoints
]
```

### Option 2: Fetch from Existing Backend Data
If backend already has real sales data in the database but no aggregation endpoint exists:

Modify `useSalesInsights.js` to fetch from backend instead of using seed data:
```javascript
const useSalesInsights = () => {
    const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_PERIOD);
    const [selectedData, setSelectedData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSalesData = async () => {
            try {
                const response = await api.get('dashboard/sales-by-period/', {
                    params: { period: selectedPeriod }
                });
                setSelectedData(response.data);
            } catch (error) {
                // Fallback to mock data if API fails
                setSelectedData(SALES_INSIGHTS_DATA[selectedPeriod]);
            } finally {
                setLoading(false);
            }
        };

        fetchSalesData();
    }, [selectedPeriod]);

    return { periodOptions, selectedPeriod, setSelectedPeriod, selectedData, loading };
};
```

---

## ✅ **What Was Already Fixed**

Recent improvements to the Recent Sales tile:
- ✅ Separated KPI total revenue from period-filtered revenue (line 95)
- ✅ Fixed date context to show May dates instead of system date (useSalesInsights.js)
- ✅ Unified seed values to prevent inverted filtering logic
- ✅ Fixed text overflow in metrics boxes with `truncate` and responsive text sizes

---

## 📋 **Recommended Next Steps**

1. **Quick Fix (If data not yet in database):**
   - Keep current mock data for now
   - Ensure mock data accurately represents expected ranges
   - Add clear indicator in UI: "Sample Data" badge

2. **Medium-term Fix (1-2 days):**
   - Create `sales-by-period/` backend API endpoint
   - Aggregate real `Sale` model data from database
   - Update `useSalesInsights.js` to fetch from this endpoint
   - Add loading states and error handling

3. **Long-term (Architecture):**
   - Consider migrating all period-based analytics to dedicated analytics service
   - Implement caching for expensive aggregations
   - Add real-time data sync if needed

---

## 📊 **Data Comparison**

| Metric | Current (Mock) | Should Be (Real) |
|--------|---|---|
| Total Revenue | Seed-generated | Sum of all Sale.amount |
| Period Revenue | Seed-generated | Sum of Sale.amount for date range |
| Quantity Sold | Seed-generated | Sum of SaleItem.quantity |
| Profit | Calculated @ 28% margin | Actual cost - actual revenue |
| Categories | Hardcoded taxonomy | From product.category |
| Date Range | System date | Actual sale dates in database |

---

## 🔍 **Current Mock Data Source**

The mock data generation chain:
```
Dashboard.jsx
  ↓
useSalesInsights.js (SALES_INSIGHTS_DATA)
  ↓
buildSeries() function
  ↓
SALES_TAXONOMY (hardcoded categories)
  ↓
Synthetic values based on seed
```

**None of this queries the actual database or backend API.**

---

## ✨ **Already Completed Fixes** (This Session)

1. ✅ **Grid Layout Realignment**
   - RecentSalesTile now spans 2 columns on XL breakpoint (more prominent)
   - Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

2. ✅ **Text Overflow in Metrics**
   - Added `truncate` class to overflow text
   - Responsive font sizes: `text-base md:text-lg`
   - Proper padding and overflow management

3. ✅ **Mobile Navigation**
   - Hamburger button now shows on mobile only (`md:hidden`)
   - Sidebar drawer has proper animation (`ease-out duration-300`)
   - White background on drawer for visibility
   - Close button improvements with better hover states

