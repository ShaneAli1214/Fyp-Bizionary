import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import SalesPerformanceChart from '../../components/dashboard/SalesPerformanceChart';
import useSalesInsights from '../../hooks/useSalesInsights';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import { 
    CreditCard, 
    Package, 
    ClipboardList, 
    ShoppingCart, 
    AlertCircle, 
    TrendingUp, 
    Boxes, 
    TrendingDown, 
    Coins, 
    FileText, 
    RefreshCw, 
    FileSpreadsheet, 
    Plus, 
    UserPlus, 
    Receipt, 
    History, 
    ArrowRight
} from 'lucide-react';

// Import action modals and forms
import RecordModal from '../accounts/components/RecordModal';
import ProductForm from '../products/ProductForm';
import OrderSlipForm from '../ordered-slips/OrderSlipForm';

// ─── Comparison helpers ──────────────────────────────────────────────────────

/**
 * Returns the percentage change between current and previous values.
 * Returns null when previous is zero or missing (caller must handle gracefully).
 */
const calcPctChange = (current, previous) => {
    const c = parseFloat(current) || 0;
    const p = parseFloat(previous) || 0;
    if (!p) return null;
    return ((c - p) / p) * 100;
};

/**
 * Returns (numerator / denominator) * 100.
 * Returns null when the denominator is zero or missing.
 */
const calcMargin = (numerator, denominator) => {
    const n = parseFloat(numerator) || 0;
    const d = parseFloat(denominator) || 0;
    if (!d) return null;
    return (n / d) * 100;
};

/**
 * Sub-text ribbon rendered inside each card's bottom row.
 *
 * type="change"  → "+X% vs prev" badge (green = good, red = bad)
 * type="margin"  → "X% margin" badge (blue, neutral)
 *
 * inverse=true  → reverses good/bad colour logic (e.g. rising costs = bad)
 */
const DeltaBadge = ({ pct, type = 'change', label, inverse = false }) => {
    if (pct === null || pct === undefined) return null;

    if (type === 'margin') {
        return (
            <span className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {pct.toFixed(1)}% {label ?? 'margin'}
            </span>
        );
    }

    const abs = Math.abs(pct).toFixed(1);
    const good = inverse ? pct < 0 : pct > 0;
    const bad  = inverse ? pct > 0 : pct < 0;
    const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→';

    return (
        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${
            pct > 0
                ? good
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger'
                : pct < 0
                ? bad
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger'
                : 'bg-background text-text-secondary border border-border'
        }`}>
            {arrow} {abs}% vs prev
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isInventoryManager = user?.role_name === 'Inventory Manager';
    const isSalesManager = user?.role_name === 'Sales Manager';
    const isAccountant = user?.role_name === 'Accountant';
    const [loading, setLoading] = useState(true);
    const { 
        periodOptions, 
        selectedPeriod, 
        setSelectedPeriod, 
        selectedMonth,
        setSelectedMonth,
        selectedData, 
        loading: insightsLoading,
        refresh: refreshInsights
    } = useSalesInsights();
    
    // KPI state
    const [kpis, setKpis] = useState({
        total_products: 0,
        total_inventory_value: 0,
        total_revenue: 0,
        total_purchases_value: 0,
        total_purchase_orders: 0,
        total_ordered_slips: 0,
        pending_company_payables: 0,
        pending_invoices: 0,
        total_invoices: 0,
        unpaid_invoices: 0,
        low_stock_count: 0,
        total_customers: 0,
        total_accounts: 0,
        total_orders: 0,
        total_payments_count: 0,
        total_stock_batches: 0,
        total_payments_value: 0,
    });

    // Modal state controllers
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [recordModalType, setRecordModalType] = useState('invoices'); // 'invoices' or 'revenues'
    
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [productSubmitting, setProductSubmitting] = useState(false);
    const [productError, setProductError] = useState('');

    const [isOrderSlipFormOpen, setIsOrderSlipFormOpen] = useState(false);
    const [orderSlipSubmitting, setOrderSlipSubmitting] = useState(false);
    const [orderSlipError, setOrderSlipError] = useState('');
    const [orderSlipSuccess, setOrderSlipSuccess] = useState('');

    const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
    const [syncing, setSyncing] = useState(false);

    // Revenue period filter state
    const REVENUE_PERIODS = [
        { key: 'daily',   label: 'Last 24h' },
        { key: 'weekly',  label: 'Last 7 Days' },
        { key: 'monthly', label: 'Last 30 Days' },
    ];
    const [revenuePeriod, setRevenuePeriod] = useState('daily');
    const [revenueData, setRevenueData] = useState({ revenue: '0.00', transaction_count: 0, start_date: '', end_date: '', label: '' });
    const [revenueLoading, setRevenueLoading] = useState(false);
    // Previous-period snapshots for comparison metrics (null = backend doesn't support it yet)
    const [prevKpis, setPrevKpis] = useState(null);
    const [prevRevenueData, setPrevRevenueData] = useState(null);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    // Fetch master data for product codes / supplier dropdowns
    const fetchDropdownOptions = async () => {
        try {
            const [productsRes, supplierRes] = await Promise.allSettled([
                api.get('products/'),
                api.get('purchases/companies/'),
            ]);
            
            if (productsRes.status === 'fulfilled') {
                setProducts(productsRes.value.data?.results || productsRes.value.data || []);
            }
            if (supplierRes.status === 'fulfilled') {
                setSupplierOptions(supplierRes.value.data?.results || supplierRes.value.data || []);
            }
        } catch (error) {
            console.warn('Failed to load modal dropdown options');
        }
    };

    const fetchRecentInvoices = async () => {
        if (isAccountant) {
            setLoadingInvoices(true);
            try {
                const res = await api.get('accounts/recent-invoices/');
                if (res.data?.success) {
                    setRecentInvoices(res.data.data || []);
                }
            } catch (error) {
                console.warn('Failed to load recent invoices for dashboard', error);
            } finally {
                setLoadingInvoices(false);
            }
        }
    };

    const fetchKPIs = async () => {
        try {
            const res = await api.get('dashboard/kpis/');
            if (res.data) {
                setKpis(res.data);
            }
        } catch (error) {
            console.warn('Failed to fetch dashboard KPIs', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch the previous-period KPI snapshot for comparison deltas.
    // Silently ignored if the backend endpoint doesn't support it.
    const fetchPrevKpis = async () => {
        try {
            const res = await api.get('dashboard/kpis/?period=previous');
            if (res.data) setPrevKpis(res.data);
        } catch {
            setPrevKpis(null);
        }
    };

    const fetchRevenue = async (period) => {
        setRevenueLoading(true);
        try {
            // Fetch current and previous period in parallel.
            // offset=1 asks the backend for the immediately preceding equivalent window.
            const [currRes, prevRes] = await Promise.allSettled([
                api.get(`dashboard/revenue-by-period/?period=${period}`),
                api.get(`dashboard/revenue-by-period/?period=${period}&offset=1`),
            ]);
            if (currRes.status === 'fulfilled' && currRes.value.data) {
                setRevenueData(currRes.value.data);
            }
            setPrevRevenueData(
                prevRes.status === 'fulfilled' && prevRes.value.data
                    ? prevRes.value.data
                    : null
            );
        } catch (error) {
            console.warn('Failed to fetch revenue by period', error);
        } finally {
            setRevenueLoading(false);
        }
    };

    useEffect(() => {
        fetchKPIs();
        fetchPrevKpis();
        fetchDropdownOptions();
        fetchRevenue('daily');
        if (isAccountant) {
            fetchRecentInvoices();
        }

        // Keep dashboard in sync automatically
        const interval = setInterval(() => {
            fetchKPIs();
            if (isAccountant) {
                api.get('accounts/recent-invoices/')
                    .then(res => {
                        if (res.data?.success) {
                            setRecentInvoices(res.data.data || []);
                        }
                    })
                    .catch(() => {});
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [isAccountant]);

    useEffect(() => {
        fetchRevenue(revenuePeriod);
    }, [revenuePeriod]);

    // Create Product Handler (matches ProductList.jsx logic)
    const handleCreateProduct = async (productData) => {
        setProductSubmitting(true);
        setProductError('');
        try {
            const payload = {
                category: productData.category || 'Tech',
                product_code: productData.product_code,
                name: productData.name,
                cost_price: Number(productData.cost_price || 0),
                unit_price: Number(productData.sale_price || 0),
                supplier: productData.supplier || null,
                status: 'ACTIVE',
            };

            await api.post('products/', payload);
            setIsProductFormOpen(false);
            showActionMessage('success', 'Product added successfully!');
            fetchKPIs();
            fetchDropdownOptions();
        } catch (error) {
            setProductError(error.response?.data?.detail || 'Failed to add product.');
        } finally {
            setProductSubmitting(false);
        }
    };

    // Helper to auto-generate product codes
    const getNextProductCode = (category) => {
        const prefix = (category || 'Tech').slice(0, 3).toUpperCase();
        const maxNumber = products.reduce((max, item) => {
            const code = item.product_code || item.sku || '';
            const match = code.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
            if (!match) return max;
            return Math.max(max, Number(match[1]));
        }, 0);
        return `${prefix}${maxNumber + 1}`;
    };

    // Create Order Slip Handler (matches InventoryManagment.jsx logic)
    const handleCreateOrderSlip = async (orderSlipData) => {
        setOrderSlipSubmitting(true);
        setOrderSlipError('');
        try {
            const payload = {
                ...orderSlipData,
                status: 'PENDING',
            };
            await api.post('purchases/ordered-slips/', payload);
            setIsOrderSlipFormOpen(false);
            showActionMessage('success', 'Purchase order slip generated successfully!');
            fetchKPIs();
        } catch (error) {
            setOrderSlipError('Failed to generate order slip.');
        } finally {
            setOrderSlipSubmitting(false);
        }
    };

    // Reset System Handler
    const handleResetSystem = async () => {
        const confirmed = window.confirm(
            "⚠️ WARNING: Are you sure you want to reset the system?\n\nThis will delete all products, invoices, sales, purchases, and finance records, and repopulate them with fresh seed data."
        );
        if (!confirmed) return;

        setLoading(true);
        try {
            const res = await api.post('dashboard/reset-system/');
            if (res.data?.success) {
                showActionMessage('success', 'System database reset and seeded successfully.');
                fetchKPIs();
                fetchDropdownOptions();
            } else {
                showActionMessage('error', 'Reset failed: ' + (res.data?.error || 'Unknown error'));
            }
        } catch (error) {
            showActionMessage('error', 'Reset failed: Server error.');
        } finally {
            setLoading(false);
        }
    };

    // Sync Sales Files Handler
    const handleSyncSalesFiles = async () => {
        setSyncing(true);
        showActionMessage('info', 'Syncing monthly sales Excel files from output folder...');
        try {
            const res = await api.post('sales/sync-excel/', { force: true });
            if (res.data?.success) {
                const total = res.data.total_created;
                showActionMessage('success', `Excel sales files synced successfully! Imported ${total} sales transactions.`);
                fetchKPIs();
                refreshInsights();
            } else {
                showActionMessage('error', 'Sync failed: ' + (res.data?.error || 'Unknown error'));
            }
        } catch (error) {
            showActionMessage('error', 'Sync failed: Server error.');
        } finally {
            setSyncing(false);
        }
    };

    const showActionMessage = (type, text) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage({ type: '', text: '' }), 5000);
    };

    // ── Derived comparison metrics ───────────────────────────────────────────

    // Gross profit: revenue minus cost of goods purchased.
    // Falls back to explicit backend field when available.
    const grossProfit = useMemo(() => {
        if (kpis.gross_profit !== undefined) return parseFloat(kpis.gross_profit) || 0;
        return (parseFloat(kpis.total_revenue) || 0) - (parseFloat(kpis.total_purchases_value) || 0);
    }, [kpis]);

    // Net profit: use explicit backend field when available; otherwise mirrors gross profit
    // until the backend exposes operating-expense data.
    const netProfit = useMemo(() => {
        if (kpis.net_profit !== undefined) return parseFloat(kpis.net_profit) || 0;
        return grossProfit;
    }, [kpis, grossProfit]);

    const grossMarginPct = useMemo(() =>
        calcMargin(grossProfit, kpis.total_revenue),
    [grossProfit, kpis.total_revenue]);

    const netMarginPct = useMemo(() =>
        calcMargin(netProfit, kpis.total_revenue),
    [netProfit, kpis.total_revenue]);

    // Previous-period equivalents for the profit cards.
    const prevGrossProfit = useMemo(() => {
        if (!prevKpis) return null;
        if (prevKpis.gross_profit !== undefined) return parseFloat(prevKpis.gross_profit) || 0;
        return (parseFloat(prevKpis.total_revenue) || 0) - (parseFloat(prevKpis.total_purchases_value) || 0);
    }, [prevKpis]);

    // % change helpers for each KPI card.
    const revenueChangePct   = calcPctChange(revenueData.revenue,         prevRevenueData?.revenue);
    const ordersChangePct    = calcPctChange(kpis.total_orders,           prevKpis?.total_orders);
    const productsChangePct  = calcPctChange(kpis.total_products,         prevKpis?.total_products);
    const stockChangePct     = calcPctChange(kpis.total_stock_batches,    prevKpis?.total_stock_batches);
    const slipsChangePct     = calcPctChange(kpis.total_ordered_slips,    prevKpis?.total_ordered_slips);
    const grossProfitChgPct  = calcPctChange(grossProfit,                 prevGrossProfit);
    const netProfitChgPct    = calcPctChange(netProfit,                   prevGrossProfit); // same base until net_profit field exists

    // ─────────────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard"
                subtitle="Real-time enterprise statistics and quick operations."
            />

            {/* Notification messages */}
            {actionMessage.text && (
                <div className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                    actionMessage.type === 'success' 
                    ? 'bg-status-success/10 text-status-success border-emerald-100' 
                    : 'bg-status-info/10 text-status-info border-rose-100'
                }`}>
                    {actionMessage.text}
                </div>
            )}            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 7. Total Revenue - with Daily / Weekly / Monthly filter */}
                {!isInventoryManager && (
                    <div className="bg-surface border border-border border-l-2 border-l-accent p-4.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col justify-between h-[128px]">
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Revenue</span>
                            <div className="flex items-center gap-1.5">
                                {revenueLoading && (
                                    <RefreshCw className="h-3 w-3 text-accent animate-spin" />
                                )}
                                <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                    <Coins className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </div>

                        {/* Revenue amount */}
                        <div className={`text-2xl font-bold text-text-primary tracking-tight transition-opacity duration-200 ${
                            revenueLoading ? 'opacity-40' : 'opacity-100'
                        }`}>
                            {formatPKR(revenueData.revenue)}
                        </div>

                        {/* Filter pills */}
                        <div className="flex gap-1 bg-background p-0.5 rounded-lg border border-border">
                            {REVENUE_PERIODS.map((p) => (
                                <button
                                    key={p.key}
                                    onClick={() => setRevenuePeriod(p.key)}
                                    className={`flex-1 text-[9px] font-bold rounded-md py-0.5 transition-all cursor-pointer ${
                                        revenuePeriod === p.key
                                            ? 'bg-surface text-text-primary shadow-xs border border-border'
                                             : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Meta row: transaction count + comparison ribbons */}
                        <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[9px] text-text-secondary font-semibold shrink-0">
                                {revenueData.transaction_count.toLocaleString()} sale{revenueData.transaction_count !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                                {/* % change vs previous equivalent period */}
                                {revenueChangePct !== null
                                    ? <DeltaBadge pct={revenueChangePct} />
                                    : revenueData.label && (
                                        <span className="text-[9px] text-success font-bold bg-success/10 px-1.5 py-0.5 rounded-md">
                                            {revenueData.label}
                                        </span>
                                    )
                                }
                                {/* Gross profit margin */}
                                <DeltaBadge pct={grossMarginPct} type="margin" label="margin" />
                            </div>
                        </div>
                    </div>
                )}

                {/* 1. Accounts */}
                {!isInventoryManager && !isSalesManager && (
                    <div 
                        onClick={() => navigate('/accounts')}
                        className="bg-surface p-4.5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent transition-all duration-200 cursor-pointer flex flex-col justify-between h-[128px] group"
                    >
                        <div className="flex items-start justify-between">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Accounts</span>
                            <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                <CreditCard className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary tracking-tight">
                                {kpis.total_accounts}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                            <span>System accounts</span>
                            <span className="flex items-center gap-0.5 text-accent font-bold group-hover:translate-x-1 transition-transform">
                                View <ArrowRight className="w-3 h-3" />
                            </span>
                        </div>
                    </div>
                )}

                {/* 2. Products */}
                {!isAccountant && (
                    <div 
                        onClick={() => navigate('/products')}
                        className="bg-surface p-4.5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent transition-all duration-200 cursor-pointer flex flex-col justify-between h-[128px] group"
                    >
                        <div className="flex items-start justify-between">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Products</span>
                            <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                <Package className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary tracking-tight">
                                {kpis.total_products}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                            <span>Catalog items</span>
                            <div className="flex items-center gap-2">
                                <DeltaBadge pct={productsChangePct} />
                                <span className="flex items-center gap-0.5 text-accent font-bold group-hover:translate-x-1 transition-transform">
                                    View <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Ordered Slips */}
                {!isSalesManager && !isAccountant && (
                    <div 
                        onClick={() => navigate('/ordered-slips')}
                        className="bg-surface p-4.5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent transition-all duration-200 cursor-pointer flex flex-col justify-between h-[128px] group"
                    >
                        <div className="flex items-start justify-between">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Ordered Slips</span>
                            <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                <ClipboardList className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary tracking-tight">
                                {kpis.total_ordered_slips}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                            <span>Purchase orders</span>
                            <div className="flex items-center gap-2">
                                <DeltaBadge pct={slipsChangePct} />
                                <span className="flex items-center gap-0.5 text-accent font-bold group-hover:translate-x-1 transition-transform">
                                    View <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gross Profit */}
                {isAccountant && (
                    <div className="bg-surface p-4.5 rounded-xl border border-border shadow-sm flex flex-col justify-between h-[128px]">
                        <div className="flex items-start justify-between">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Gross Profit</span>
                            <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                <TrendingUp className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div>
                            <div className={`text-2xl font-bold tracking-tight ${
                                grossProfit >= 0
                                    ? 'text-text-primary'
                                    : 'text-danger'
                            }`}>
                                {formatPKR(grossProfit)}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                            <span>Revenue − COGS</span>
                            <div className="flex items-center gap-1.5">
                                <DeltaBadge pct={grossProfitChgPct} />
                                <DeltaBadge pct={grossMarginPct} type="margin" label="margin" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Net Profit */}
                {isAccountant && (
                    <div className="bg-surface p-4.5 rounded-xl border border-border shadow-sm flex flex-col justify-between h-[128px]">
                        <div className="flex items-start justify-between">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Net Profit</span>
                            <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                <Coins className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div>
                            <div className={`text-2xl font-bold tracking-tight ${
                                netProfit >= 0
                                    ? 'text-text-primary'
                                    : 'text-danger'
                            }`}>
                                {formatPKR(netProfit)}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                            <span>After deductions</span>
                            <div className="flex items-center gap-1.5">
                                <DeltaBadge pct={netProfitChgPct} />
                                <DeltaBadge pct={netMarginPct} type="margin" label="margin" />
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Sales */}
                {!isInventoryManager && (
                    <div 
                        onClick={() => navigate('/sales')}
                        className="bg-surface p-4.5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent transition-all duration-200 cursor-pointer flex flex-col justify-between h-[128px] group"
                    >
                        <div className="flex items-start justify-between">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                                {isAccountant ? 'Total Sales' : 'Sales'}
                            </span>
                            <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                <ShoppingCart className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary tracking-tight">
                                {kpis.total_orders}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                            <span>Transactions</span>
                            <div className="flex items-center gap-2">
                                <DeltaBadge pct={ordersChangePct} />
                                <span className="flex items-center gap-0.5 text-accent font-bold group-hover:translate-x-1 transition-transform">
                                    View <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Accountant Specific: Pending Customer Payments & Pending Vendor Payables */}
                {isAccountant && (
                    <>
                        {/* Pending Customer Payments */}
                        <div 
                            onClick={() => navigate('/accounts')}
                            className="bg-surface p-4.5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent transition-all duration-200 cursor-pointer flex flex-col justify-between h-[128px] group"
                        >
                            <div className="flex items-start justify-between">
                                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Pending Customer Payments</span>
                                <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-text-primary tracking-tight">
                                    {kpis.pending_invoices}
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                                <span>Invoices to collect</span>
                                <span className="flex items-center gap-0.5 text-accent font-bold group-hover:translate-x-1 transition-transform">
                                    Manage <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>

                        {/* Pending Vendor Payables */}
                        <div className="bg-surface p-4.5 rounded-xl border border-border shadow-sm flex flex-col justify-between h-[128px]">
                            <div className="flex items-start justify-between">
                                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Pending Vendor Payables</span>
                                <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-text-primary tracking-tight">
                                    {kpis.pending_company_payables}
                                </div>
                            </div>
                            <div className="text-[10px] text-text-secondary font-semibold uppercase">
                                To Be Paid
                            </div>
                        </div>
                    </>
                )}

                {/* 6. Stock Batches */}
                {!isSalesManager && !isAccountant && (
                    <div 
                        onClick={() => navigate('/inventory-managment')}
                        className="bg-surface p-4.5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent transition-all duration-200 cursor-pointer flex flex-col justify-between h-[128px] group"
                    >
                        <div className="flex items-start justify-between">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Stock Batches</span>
                            <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
                                <Boxes className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary tracking-tight">
                                {kpis.total_stock_batches}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                            <span>Warehouse batches</span>
                            <div className="flex items-center gap-2">
                                <DeltaBadge pct={stockChangePct} />
                                <span className="flex items-center gap-0.5 text-accent font-bold group-hover:translate-x-1 transition-transform">
                                    View <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Quick Actions Panel */}
            <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-background">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                        Quick Operations
                    </span>
                </div>
                <div className="p-5 flex flex-wrap gap-2.5 items-center">
                    {/* + Add Customer / Create Invoice */}
                    {!isInventoryManager && (
                        <button
                            onClick={() => {
                                setRecordModalType('invoices');
                                setIsRecordModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-card rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            {isAccountant ? (
                                <>
                                    <FileText className="w-3.5 h-3.5 text-card" />
                                    <span>Create Invoice</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-3.5 h-3.5 text-card" />
                                    <span>Add Customer</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* + Add Product */}
                    {!isSalesManager && !isAccountant && (
                        <button
                            onClick={() => setIsProductFormOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-background text-text-primary border border-border rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 text-accent" />
                            <span>Add Product</span>
                        </button>
                    )}

                    {/* + Record Payment */}
                    {!isInventoryManager && (
                        <button
                            onClick={() => {
                                setRecordModalType('revenues');
                                setIsRecordModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-background text-text-primary border border-border rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            <Receipt className="w-3.5 h-3.5 text-accent" />
                            <span>Record Payment</span>
                        </button>
                    )}

                    {/* View Transactions */}
                    {isAccountant && (
                        <button
                            onClick={() => navigate('/accounts')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-background text-text-primary border border-border rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            <History className="w-3.5 h-3.5 text-accent" />
                            <span>View Transactions</span>
                        </button>
                    )}

                    {/* + Add Stock */}
                    {!isSalesManager && !isAccountant && (
                        <button
                            onClick={() => setIsOrderSlipFormOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-background text-text-primary border border-border rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            <Boxes className="w-3.5 h-3.5 text-accent" />
                            <span>Add Stock</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sales performance chart at bottom */}
            {!isInventoryManager && (
                <div className="bg-surface dark:bg-surface-dark p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200 chart-fade-in">
                    <div className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-border gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Sales Performance Insights</h3>
                            <p className="text-xs text-text-secondary mt-0.5">Visual representation of real-time sales & category statistics.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-text-secondary">
                            {selectedData?.availableMonths && selectedData.availableMonths.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span>Month:</span>
                                    <select
                                        value={selectedPeriod === 'monthly' ? selectedMonth : ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val) {
                                                setSelectedPeriod('monthly');
                                                setSelectedMonth(val);
                                            }
                                        }}
                                        className="px-3 py-1.5 bg-surface dark:bg-surface-dark text-text-primary border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                                    >
                                        {selectedPeriod !== 'monthly' && (
                                            <option value="">Select Month...</option>
                                        )}
                                        {selectedData.availableMonths.map((m) => (
                                            <option key={m.key} value={m.key}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <span>Period:</span>
                                <select
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                    className="px-3 py-1.5 bg-surface dark:bg-surface-dark text-text-primary border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                                >
                                    {periodOptions?.map((opt) => (
                                        <option key={opt.key} value={opt.key}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    {insightsLoading || !selectedData ? (
                        <div className="h-[340px] flex flex-col items-center justify-center space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent animate-pulse"></div>
                            <span className="text-xs text-text-secondary font-medium">Loading sales insights...</span>
                        </div>
                    ) : (
                        <SalesPerformanceChart selectedData={selectedData} isAccountant={isAccountant} />
                    )}
                </div>
            )}

            {/* Recent Transactions Table for Accountant */}
            {isAccountant && (
                <div className="bg-card dark:bg-primary p-5 rounded-xl border border-card/80 dark:border-slate-800/80 shadow-sm mt-6">
                    <div className="mb-4 pb-4 border-b border-card dark:border-slate-800/80">
                        <h3 className="text-lg font-bold text-primary dark:text-slate-100">Recent Transactions</h3>
                        <p className="text-xs text-secondary dark:text-secondary mt-0.5">Summary of the most recently issued customer invoices.</p>
                    </div>
                    
                    {loadingInvoices ? (
                        <div className="py-8 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : recentInvoices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs font-semibold text-primary dark:text-slate-350">
                                <thead>
                                    <tr className="border-b border-card dark:border-slate-800 text-secondary dark:text-slate-455 uppercase tracking-wider">
                                        <th className="py-3 px-2">Invoice #</th>
                                        <th className="py-3 px-2">Client</th>
                                        <th className="py-3 px-2">Invoice Date</th>
                                        <th className="py-3 px-2">Due Date</th>
                                        <th className="py-3 px-2 text-right">Total Amount</th>
                                        <th className="py-3 px-2 text-right">Balance Due</th>
                                        <th className="py-3 px-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {recentInvoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-page/50 dark:hover:bg-primary/30 transition-colors">
                                            <td className="py-3 px-2 text-primary dark:text-slate-100">{inv.invoice_number}</td>
                                            <td className="py-3 px-2">{inv.client_name}</td>
                                            <td className="py-3 px-2">{inv.date}</td>
                                            <td className="py-3 px-2">{inv.due_date || '—'}</td>
                                            <td className="py-3 px-2 text-right text-primary dark:text-slate-100">{formatPKR(inv.amount)}</td>
                                            <td className="py-3 px-2 text-right text-status-info dark:text-rose-450">{formatPKR(inv.balance_due)}</td>
                                            <td className="py-3 px-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                                                    inv.status === 'PAID' 
                                                        ? 'bg-status-success/10 text-status-success border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/40' 
                                                        : inv.status === 'OVERDUE' 
                                                        ? 'bg-status-info/10 text-status-info border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/40' 
                                                        : 'bg-amber-50 text-status-info border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/40'
                                                }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-secondary dark:text-slate-550">
                            No recent invoices found.
                        </div>
                    )}
                </div>
            )}

            {/* Action Modals */}

            {/* Invoice & Revenue Modal */}
            <RecordModal
                isOpen={isRecordModalOpen}
                onClose={() => setIsRecordModalOpen(false)}
                recordType={recordModalType}
                triggerRefresh={fetchKPIs}
            />

            {/* Product Form Modal */}
            <ProductForm
                isOpen={isProductFormOpen}
                onClose={() => setIsProductFormOpen(false)}
                onSubmit={handleCreateProduct}
                initialData={null}
                submitting={productSubmitting}
                errorMessage={productError}
                getNextProductCode={getNextProductCode}
                supplierOptions={supplierOptions}
            />

            {/* Order Slip Form Modal */}
            <OrderSlipForm
                isOpen={isOrderSlipFormOpen}
                onClose={() => setIsOrderSlipFormOpen(false)}
                onSubmit={handleCreateOrderSlip}
                onCompanySaved={fetchDropdownOptions}
                submitting={orderSlipSubmitting}
                errorMessage={orderSlipError}
                initialMode="existing"
            />
        </div>
    );
};

export default Dashboard;
