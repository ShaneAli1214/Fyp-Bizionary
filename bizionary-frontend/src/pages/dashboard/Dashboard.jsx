import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import SalesPerformanceChart from '../../components/dashboard/SalesPerformanceChart';
import useSalesInsights from '../../hooks/useSalesInsights';
import { useAuth } from '../../context/AuthContext';

// Import action modals and forms
import RecordModal from '../accounts/components/RecordModal';
import ProductForm from '../products/ProductForm';
import OrderSlipForm from '../ordered-slips/OrderSlipForm';

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

    const fetchRevenue = async (period) => {
        setRevenueLoading(true);
        try {
            const res = await api.get(`dashboard/revenue-by-period/?period=${period}`);
            if (res.data) {
                setRevenueData(res.data);
            }
        } catch (error) {
            console.warn('Failed to fetch revenue by period', error);
        } finally {
            setRevenueLoading(false);
        }
    };

    useEffect(() => {
        fetchKPIs();
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

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Title */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Dashboard</h1>
                <p className="text-sm text-textMuted dark:text-slate-400 mt-1">Real-time enterprise statistics and quick operations.</p>
            </div>

            {/* Notification messages */}
            {actionMessage.text && (
                <div className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                    actionMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                    {actionMessage.text}
                </div>
            )}

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 7. Total Revenue - with Daily / Weekly / Monthly filter */}
                {!isInventoryManager && (
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2 hover:shadow-md transition-all col-span-1 sm:col-span-2 lg:col-span-1">
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue</div>
                            {revenueLoading && (
                                <div className="h-3 w-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                            )}
                        </div>

                        {/* Filter pills */}
                        <div className="flex gap-1">
                            {REVENUE_PERIODS.map((p) => (
                                <button
                                    key={p.key}
                                    onClick={() => setRevenuePeriod(p.key)}
                                    className={`flex-1 text-[10px] font-bold rounded-md py-1 transition-all ${
                                        revenuePeriod === p.key
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Revenue amount */}
                        <div className={`text-xl font-black text-slate-800 dark:text-slate-100 transition-opacity duration-200 ${
                            revenueLoading ? 'opacity-40' : 'opacity-100'
                        }`}>
                            {formatPKR(revenueData.revenue)}
                        </div>

                        {/* Meta row: transaction count + period label */}
                        <div className="flex items-center justify-between mt-auto">
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                {revenueData.transaction_count.toLocaleString()} sale{revenueData.transaction_count !== 1 ? 's' : ''}
                            </div>
                            {revenueData.label && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    {revenueData.label}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 1. Accounts */}
                {!isInventoryManager && !isSalesManager && (
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center h-44 hover:shadow-md transition-all">
                        <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Accounts</div>
                        <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{kpis.total_accounts}</div>
                        <button 
                            onClick={() => navigate('/accounts')}
                            className="px-6 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 uppercase"
                        >
                            View
                        </button>
                    </div>
                )}

                {/* 2. Products */}
                {!isAccountant && (
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center h-44 hover:shadow-md transition-all">
                        <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Products</div>
                        <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{kpis.total_products}</div>
                        <button 
                            onClick={() => navigate('/products')}
                            className="px-6 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 uppercase"
                        >
                            View
                        </button>
                    </div>
                )}

                {/* 3. Purchase Orders */}
                {!isSalesManager && !isAccountant && (
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center h-44 hover:shadow-md transition-all">
                        <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Ordered Slips</div>
                        <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{kpis.total_ordered_slips}</div>
                        <button 
                            onClick={() => navigate('/ordered-slips')}
                            className="px-6 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 uppercase"
                        >
                            View
                        </button>
                    </div>
                )}

                {/* 5. Sales */}
                {!isInventoryManager && (
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center h-44 hover:shadow-md transition-all">
                        <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{isAccountant ? 'Total Sales' : 'Sales'}</div>
                        <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{kpis.total_orders}</div>
                        <button 
                            onClick={() => navigate('/sales')}
                            className="px-6 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 uppercase"
                        >
                            View
                        </button>
                    </div>
                )}

                {/* Accountant Specific: Pending Customer Payments & Pending Vendor Payables */}
                {isAccountant && (
                    <>
                        {/* Pending Customer Payments */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center h-44 hover:shadow-md transition-all">
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Pending Customer Payments</div>
                            <div className="text-4xl font-black text-amber-600 dark:text-amber-400">{kpis.pending_invoices}</div>
                            <button 
                                onClick={() => navigate('/accounts')}
                                className="px-6 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-amber-500/20 uppercase"
                            >
                                Manage
                            </button>
                        </div>

                        {/* Pending Vendor Payables */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center h-44 hover:shadow-md transition-all">
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Pending Vendor Payables</div>
                            <div className="text-4xl font-black text-rose-600 dark:text-rose-400">{kpis.pending_company_payables}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">To Be Paid</div>
                        </div>
                    </>
                )}

                {/* 6. Stock Batches */}
                {!isSalesManager && !isAccountant && (
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center h-44 hover:shadow-md transition-all">
                        <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Stock Batches</div>
                        <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{kpis.total_stock_batches}</div>
                        <button 
                            onClick={() => navigate('/inventory-managment')}
                            className="px-6 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 uppercase"
                        >
                            View
                        </button>
                    </div>
                )}

            </div>

            {/* Quick Actions Header Banner */}
            <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="bg-[#003A6B] px-5 py-3 text-white font-bold text-sm uppercase tracking-wider">
                    Quick Actions
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 flex flex-wrap gap-3 items-center">
                    {/* + Add Customer / Create Invoice */}
                    {!isInventoryManager && (
                        <button
                            onClick={() => {
                                setRecordModalType('invoices');
                                setIsRecordModalOpen(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            {isAccountant ? 'Create Invoice' : '+ Add Customer'}
                        </button>
                    )}

                    {/* + Add Product */}
                    {!isSalesManager && !isAccountant && (
                        <button
                            onClick={() => setIsProductFormOpen(true)}
                            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            + Add Product
                        </button>
                    )}

                    {/* + Record Payment */}
                    {!isInventoryManager && (
                        <button
                            onClick={() => {
                                setRecordModalType('revenues');
                                setIsRecordModalOpen(true);
                            }}
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            + Record Payment
                        </button>
                    )}

                    {/* View Transactions */}
                    {isAccountant && (
                        <button
                            onClick={() => navigate('/accounts')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            View Transactions
                        </button>
                    )}

                    {/* + Add Stock */}
                    {!isSalesManager && !isAccountant && (
                        <button
                            onClick={() => setIsOrderSlipFormOpen(true)}
                            className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            + Add Stock
                        </button>
                    )}

                    {/* Reset System */}
                    {!isInventoryManager && !isSalesManager && !isAccountant && (
                        <button
                            onClick={handleResetSystem}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            Reset System
                        </button>
                    )}

                    {!isInventoryManager && !isAccountant && (
                        <button
                            onClick={handleSyncSalesFiles}
                            disabled={syncing}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                            {syncing && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                            {syncing ? 'Syncing...' : 'Sync Sales Files'}
                        </button>
                    )}
                </div>
            </div>

            {/* Sales performance chart at bottom */}
            {!isInventoryManager && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Sales Performance Insights</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Visual representation of real-time sales & category statistics.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {selectedPeriod === 'monthly' && selectedData?.availableMonths && selectedData.availableMonths.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span>Month:</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                    >
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
                                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 animate-pulse"></div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading sales insights...</span>
                        </div>
                    ) : (
                        <SalesPerformanceChart selectedData={selectedData} isAccountant={isAccountant} />
                    )}
                </div>
            )}

            {/* Recent Transactions Table for Accountant */}
            {isAccountant && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-6">
                    <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent Transactions</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Summary of the most recently issued customer invoices.</p>
                    </div>
                    
                    {loadingInvoices ? (
                        <div className="py-8 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : recentInvoices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-350">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-455 uppercase tracking-wider">
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
                                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3 px-2 text-slate-900 dark:text-slate-100">{inv.invoice_number}</td>
                                            <td className="py-3 px-2">{inv.client_name}</td>
                                            <td className="py-3 px-2">{inv.date}</td>
                                            <td className="py-3 px-2">{inv.due_date || '—'}</td>
                                            <td className="py-3 px-2 text-right text-slate-900 dark:text-slate-100">{formatPKR(inv.amount)}</td>
                                            <td className="py-3 px-2 text-right text-rose-600 dark:text-rose-450">{formatPKR(inv.balance_due)}</td>
                                            <td className="py-3 px-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                                                    inv.status === 'PAID' 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/40' 
                                                        : inv.status === 'OVERDUE' 
                                                        ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/40' 
                                                        : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/40'
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
                        <div className="py-8 text-center text-slate-400 dark:text-slate-550">
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
