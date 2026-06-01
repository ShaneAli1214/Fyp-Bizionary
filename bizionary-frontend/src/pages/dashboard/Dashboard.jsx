import React, { useState, useEffect, useMemo } from 'react';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import { ChevronDown } from 'lucide-react';
import RecentSalesTile from '../../components/dashboard/RecentSalesTile';
import SalesPerformanceChart from '../../components/dashboard/SalesPerformanceChart';
import useSalesInsights from '../../hooks/useSalesInsights';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [pendingInvoicesOpen, setPendingInvoicesOpen] = useState(false);
    const { periodOptions, selectedPeriod, setSelectedPeriod, selectedData } = useSalesInsights();
    const [data, setData] = useState({
        kpis: null,
        inventoryProducts: [],
        pendingInvoices: [],
    });

    useEffect(() => {
        const normalizeKpis = (raw = {}) => ({
            total_revenue: raw.total_revenue ?? 0,
            inventory_value: raw.total_inventory_value ?? 0,
            total_products: raw.total_products ?? 0,
            pending_company_payables_count: raw.pending_company_payables ?? 0,
            pending_invoices_count: raw.pending_invoices ?? raw.unpaid_invoices ?? 0,
            low_stock_count: raw.low_stock_count ?? 0,
            total_invoices: raw.total_invoices ?? raw.total_purchase_orders ?? 0,
        });

        const normalizeProducts = (payload = {}) => {
            const products = payload?.results || payload?.data || payload || [];
            return Array.isArray(products) ? products : [];
        };

        const fetchDashboardData = async () => {
            try {
                const [kpisRes, productsRes, payablesRes] = await Promise.allSettled([
                    api.get('dashboard/kpis/'),
                    api.get('products/'),
                    api.get('dashboard/outstanding-payables/'),
                ]);

                setData({
                    kpis: {
                        ...normalizeKpis(kpisRes.status === 'fulfilled' ? kpisRes.value.data : {}),
                    },
                    inventoryProducts: productsRes.status === 'fulfilled' ? normalizeProducts(productsRes.value.data) : [],
                    pendingInvoices: payablesRes.status === 'fulfilled'
                        ? (payablesRes.value.data || []).map((item) => ({
                            id: item.id,
                            type: item.type,
                            product_name: item.product_name,
                            category: item.company_name || item.category || 'Uncategorized',
                            quantity: item.quantity ?? item.quantity_purchased ?? 0,
                            balance: item.balance,
                        }))
                        : [],
                });

                if ([kpisRes, productsRes, payablesRes].some(r => r.status === 'rejected')) {
                    console.warn('Some dashboard endpoints failed; rendered available data only.');
                }
            } catch (error) {
                console.warn('Dashboard API calls failed, rendering empty state values.');

                setData({
                    kpis: {
                        total_revenue: 0,
                        inventory_value: 0,
                        total_products: 0,
                        unpaid_invoices_count: 0,
                        low_stock_count: 0,
                        total_invoices: 0,
                    },
                    inventoryProducts: [],
                    pendingInvoices: [],
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // Keep dashboard data in sync and recover automatically if backend starts later.
        const refreshTimer = setInterval(fetchDashboardData, 15000);
        return () => clearInterval(refreshTimer);
    }, []);

    const { kpis, pendingInvoices } = data;
    const totalRevenue = useMemo(
        () => Number(selectedData.totalSalesAmount || kpis?.total_revenue || 0),
        [selectedData.totalSalesAmount, kpis]
    );

    if (loading) {
        return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
    }

    return (
        <div className="space-y-8">
            {/* Header/Hero Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-textMain dark:text-slate-100">Business Overview</h1>
                    <p className="text-textMuted dark:text-slate-300 text-sm mt-1">Live business snapshot from your current ERP data.</p>
                </div>
            </div>

            {/* Apps strip removed from Dashboard since it's displayed under the topbar via the Navbar */}

            {/* Insights cards (SAP-like tiles with mini charts) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-textMain">Insights</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                    {/* Total Revenue */}
                    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="text-xs text-textMuted">Total Revenue</div>
                                <div className="text-lg font-extrabold text-textMain mt-1">{formatPKR(totalRevenue)}</div>
                                <div className="text-[11px] text-textMuted mt-1">{selectedData.periodLabel} • {selectedData.dateContext}</div>
                            </div>
                        </div>
                    </div>

                    <RecentSalesTile
                        periodOptions={periodOptions}
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={setSelectedPeriod}
                        selectedData={selectedData}
                    />

                    {/* Pending Invoices */}
                    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm relative overflow-visible z-30">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="text-xs text-textMuted">Pending Orders</div>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="text-lg font-extrabold text-textMain">{kpis.pending_company_payables_count}</div>
                                    <button
                                        type="button"
                                        aria-expanded={pendingInvoicesOpen}
                                        aria-label="Toggle pending orders list"
                                        onClick={() => setPendingInvoicesOpen((open) => !open)}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-surface/20 bg-background/80 text-textMuted transition hover:bg-surface hover:text-textMain"
                                    >
                                        <ChevronDown className={`h-4 w-4 transition-transform ${pendingInvoicesOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {pendingInvoicesOpen && (
                            <div className="absolute left-4 top-[78px] z-50 w-64 max-w-[calc(100%-2rem)] rounded-xl border border-surface/20 bg-white shadow-lg overflow-hidden">
                                <div className="px-4 py-2 border-b border-surface/10 bg-white">
                                    <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                                        <div className="text-sm font-semibold text-textMain">Product Name</div>
                                        <div className="text-sm font-semibold text-textMain text-right">Quantity</div>
                                    </div>
                                </div>
                                <div className="max-h-56 overflow-y-auto bg-white">
                                    {pendingInvoices.length > 0 ? (
                                        pendingInvoices.map((item) => (
                                            <div
                                                key={item.id}
                                                className="grid grid-cols-[1fr_auto] gap-4 items-center px-4 py-3 text-sm hover:bg-surface/60"
                                            >
                                                <div className="min-w-0 whitespace-normal">
                                                    <div className="font-medium text-textMain break-words">{item.product_name}</div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <div className="font-semibold text-textMain">{item.quantity}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-textMuted">No pending items found.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Bottom sales visualization */}
            <div className="grid grid-cols-1 gap-6">
                <div>
                    <SalesPerformanceChart selectedData={selectedData} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
