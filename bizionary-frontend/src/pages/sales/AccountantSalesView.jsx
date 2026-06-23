import React, { useState, useEffect, useMemo } from 'react';
import { 
    TrendingUp, Coins, FileText, Undo2, Percent, 
    Calendar, X, Search, Check, AlertCircle, ArrowUpRight 
} from 'lucide-react';
import { 
    ResponsiveContainer, ComposedChart, Area, Bar, Line, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart 
} from 'recharts';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';
import { formatDayLabel } from '../../utils/chartDates';

// Helper to format currency in compact form (e.g. Rs 1.5M, Rs 40k)
const formatCompactPKR = (value) => {
    const amount = Number(value) || 0;
    const absValue = Math.abs(amount);

    if (absValue >= 1_000_000) {
        return `Rs ${Number(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (absValue >= 1_000) {
        return `Rs ${Number(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return `Rs ${amount}`;
};

const AccountantSalesView = () => {
    // ── DATA STATES ──────────────────────────────────────────
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // ── FILTER STATES ────────────────────────────────────────
    const [period, setPeriod] = useState('monthly');
    const [month, setMonth] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // ── TAB STATE ────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('receivables'); // 'receivables' | 'tax' | 'returns' | 'profitability'

    // ── MODAL STATES ──────────────────────────────────────────
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [saleSearchId, setSaleSearchId] = useState('');
    const [matchedSale, setMatchedSale] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [qtyToReturn, setQtyToReturn] = useState(1);
    const [refundAmount, setRefundAmount] = useState('');
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
    const [returnReason, setReturnReason] = useState('');
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');
    const [submittingReturn, setSubmittingReturn] = useState(false);

    // ── FETCH ANALYTICS ──────────────────────────────────────
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { period };
            
            if (period === 'custom') {
                if (startDate) params.start_date = startDate;
                if (endDate) params.end_date = endDate;
            } else if (period !== 'monthly' && month) {
                params.month = month;
            }

            const res = await api.get('dashboard/accountant-sales/', { params });
            if (res.data) {
                setAnalytics(res.data);
                // Auto-set latest month if not specified
                if (res.data.availableMonths?.length > 0 && !month) {
                    setMonth(res.data.availableMonths[0].key);
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch accountant sales data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [period, month, refreshTrigger]);

    // Handle Custom Date Search button
    const handleCustomFilterSubmit = (e) => {
        e.preventDefault();
        setRefreshTrigger(prev => prev + 1);
    };

    // ── FETCH SALE FOR RETURN ─────────────────────────────────
    const handleFetchSaleDetails = async () => {
        setModalError('');
        setModalSuccess('');
        setMatchedSale(null);
        setSelectedProduct(null);

        if (!saleSearchId.trim()) {
            setModalError('Please enter a valid Sale ID');
            return;
        }

        try {
            const res = await api.get(`sales/${saleSearchId}/`);
            const saleData = res.data?.data || res.data;
            if (saleData) {
                setMatchedSale(saleData);
                // Default to first product in sale line items
                if (saleData.line_items?.length > 0) {
                    const firstItem = saleData.line_items[0];
                    setSelectedProduct(firstItem);
                    setQtyToReturn(1);
                    setRefundAmount(firstItem.unit_price);
                } else if (saleData.product) {
                    // Fallback for flat sale record
                    const productObj = {
                        product: saleData.product,
                        product_name: saleData.product_name || `Product #${saleData.product}`,
                        unit_price: saleData.unit_price,
                        quantity_sold: saleData.quantity_sold
                    };
                    setSelectedProduct(productObj);
                    setQtyToReturn(1);
                    setRefundAmount(saleData.unit_price);
                }
            } else {
                setModalError('Sale record not found.');
            }
        } catch (err) {
            setModalError('Failed to fetch sale details. Make sure the Sale ID exists.');
        }
    };

    // Auto-update refund amount when product or quantity changes
    useEffect(() => {
        if (selectedProduct) {
            const price = Number(selectedProduct.unit_price || 0);
            setRefundAmount((price * qtyToReturn).toFixed(2));
        }
    }, [selectedProduct, qtyToReturn]);

    // ── SUBMIT SALE RETURN ──────────────────────────────────
    const handleRecordReturn = async (e) => {
        e.preventDefault();
        if (!matchedSale || !selectedProduct) return;

        setModalError('');
        setSubmittingReturn(true);

        const payload = {
            sale: matchedSale.id,
            product: selectedProduct.product,
            quantity_returned: qtyToReturn,
            refund_amount: parseFloat(refundAmount),
            return_date: returnDate,
            reason: returnReason
        };

        try {
            await api.post('sales/returns/', payload);
            setModalSuccess('Sales return recorded successfully! Inventory and Ledger adjusted.');
            setReturnReason('');
            setSaleSearchId('');
            setMatchedSale(null);
            setSelectedProduct(null);
            
            // Reload page data
            setRefreshTrigger(prev => prev + 1);
            
            // Auto close after 2 seconds
            setTimeout(() => {
                setIsReturnModalOpen(false);
                setModalSuccess('');
            }, 2000);
        } catch (err) {
            setModalError(err.response?.data?.error || 'Failed to record return transaction.');
        } finally {
            setSubmittingReturn(false);
        }
    };

    // ── AGING BUCKETS FOR RECHARTS ───────────────────────────
    const agingChartData = useMemo(() => {
        if (!analytics?.ar_aging_buckets) return [];
        const buckets = analytics.ar_aging_buckets;
        return [
            { name: 'Current', value: buckets.current, fill: '#10B981' },
            { name: '1-30 Days', value: buckets['1_30_days'], fill: '#F59E0B' },
            { name: '31-60 Days', value: buckets['31_60_days'], fill: '#EF4444' },
            { name: '61-90 Days', value: buckets['61_90_days'], fill: '#B91C1C' },
            { name: '90+ Days', value: buckets['90_plus_days'], fill: '#7F1D1D' }
        ];
    }, [analytics]);

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-surface/80 backdrop-blur-md p-5 rounded-2xl border border-card shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-textMain tracking-tight">Sales & Receivables Hub</h1>
                    <p className="text-xs text-textMuted mt-0.5">Finance-first analysis of sales contracts, taxes, aging, and credits.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Period Tabs */}
                    <div className="flex bg-page p-1 rounded-xl">
                        {['daily', 'weekly', 'monthly', 'custom'].map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                                setPeriod(p);
                                if (p !== 'custom') {
                                    setStartDate('');
                                    setEndDate('');
                                }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                              period === p
                                ? 'bg-card text-primary shadow-sm'
                                : 'text-textMuted hover:text-textMain'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                    </div>

                    {/* Month selector (disabled for Monthly period view) */}
                    {period !== 'custom' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-textMuted">
                            <span>Month:</span>
                            <select
                              value={month}
                              disabled={period === 'monthly'}
                              onChange={(e) => setMonth(e.target.value)}
                              className="px-3 py-1.5 bg-card border border-card rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs text-textMain"
                            >
                              {analytics?.availableMonths?.map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.label}
                                </option>
                              ))}
                              {!analytics?.availableMonths?.length && (
                                <option value="">No months</option>
                              )}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Date Range Inputs (Only visible when Custom Period selected) */}
            {period === 'custom' && (
                <form onSubmit={handleCustomFilterSubmit} className="bg-surface/80 backdrop-blur-md p-4 rounded-xl border border-card shadow-sm flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-textMuted uppercase tracking-wider">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            className="block px-3 py-2 border border-card rounded-lg text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-textMuted uppercase tracking-wider">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                            className="block px-3 py-2 border border-card rounded-lg text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-primary font-bold text-xs rounded-full shadow-sm active:scale-95"
                    >
                        Apply Filter
                    </button>
                </form>
            )}

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="text-xs text-textMuted font-medium">Analyzing ledgers & tax filing records...</span>
                </div>
            ) : error ? (
                <div className="bg-status-info/10 border border-card p-4 rounded-xl text-rose-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                </div>
            ) : (
                <>
                    {/* Financial KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                        {/* 1. Total Invoiced Revenue */}
                        <div className="bg-card p-5 rounded-2xl border border-card shadow-sm hover:shadow-md transition-all flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Gross Billed Sales</span>
                            <div className="text-lg font-black text-textMain mt-1">{formatPKR(analytics?.summary?.total_revenue_billed)}</div>
                            <div className="text-[10px] text-textMuted mt-auto flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                <span>POS: {formatCompactPKR(analytics?.summary?.gross_sales)} | Inv: {formatCompactPKR(analytics?.summary?.gross_invoices)}</span>
                            </div>
                        </div>

                        {/* 2. Outstanding Balance (Receivables) */}
                        <div className="bg-card p-5 rounded-2xl border border-card shadow-sm hover:shadow-md transition-all flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Accounts Receivable</span>
                            <div className="text-lg font-black text-amber-600 mt-1">{formatPKR(analytics?.summary?.ar_total_outstanding)}</div>
                            <div className="text-[10px] text-textMuted mt-auto flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-status-info"></span>
                                <span>Total unpaid invoice credit</span>
                            </div>
                        </div>

                        {/* 3. Output GST collected */}
                        <div className="bg-card p-5 rounded-2xl border border-card shadow-sm hover:shadow-md transition-all flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Output Tax (GST/VAT)</span>
                            <div className="text-lg font-black text-primary mt-1">{formatPKR(analytics?.summary?.total_gst_collected)}</div>
                            <div className="text-[10px] text-textMuted mt-auto flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span>Audit & compliance output tax</span>
                            </div>
                        </div>

                        {/* 4. Cost of Goods Sold */}
                        <div className="bg-card p-5 rounded-2xl border border-card shadow-sm hover:shadow-md transition-all flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Cost of Goods (COGS)</span>
                            <div className="text-lg font-black text-primary mt-1">{formatPKR(analytics?.summary?.total_cogs)}</div>
                            <div className="text-[10px] text-textMuted mt-auto flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-secondary" />
                                <span>Real-time POS stock cost</span>
                            </div>
                        </div>

                        {/* 5. Profit Margin percentage */}
                        <div className="bg-card p-5 rounded-2xl border border-card shadow-sm hover:shadow-md transition-all flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Gross Profit Margin</span>
                            <div className="text-lg font-black text-status-success mt-1">{analytics?.summary?.profit_margin?.toFixed(2)}%</div>
                            <div className="text-[10px] text-textMuted mt-auto flex items-center gap-1.5">
                                <Percent className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Net Gross profit: {formatCompactPKR(analytics?.summary?.gross_profit)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-card p-5 rounded-2xl border border-card shadow-sm">
                        <div className="flex justify-between items-start gap-4 mb-6">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-textMain">Sales Profitability & Trend Dynamics</h3>
                                <p className="text-xs text-textMuted mt-0.5">Visualizing invoiced revenue (net of returns) vs inventory cost cost.</p>
                            </div>
                            {analytics?.summary?.total_refunded > 0 && (
                                <div className="px-3 py-1 bg-status-info/10 text-status-info border border-rose-100 rounded-lg text-xs font-bold">
                                    Refund Deductions: {formatPKR(analytics?.summary?.total_refunded)}
                                </div>
                            )}
                        </div>

                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={analytics?.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#A6764F" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#A6764F" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E0D3" />
                                    <XAxis 
                                        dataKey="period" 
                                        tick={{ fill: '#8A7F6E', fontSize: 10, fontWeight: 500 }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <YAxis 
                                        tickFormatter={formatCompactPKR} 
                                        tick={{ fill: '#8A7F6E', fontSize: 10, fontWeight: 500 }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <Tooltip 
                                        formatter={(val) => [formatPKR(val), '']} 
                                        contentStyle={{ backgroundColor: '#FFFCF7', color: '#2E2620', border: '1px solid #E8E0D3', borderRadius: '12px', fontSize: '11px' }} 
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" />
                                    <Area type="monotone" name="Billed Revenue" dataKey="revenue" fill="url(#revGrad)" stroke="#A6764F" strokeWidth={2.5} />
                                    <Line type="monotone" name="Inventory Cost (COGS)" dataKey="cogs" stroke="#8A7F6E" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                                    <Line type="monotone" name="Gross Profit" dataKey="profit" stroke="#6B8E4E" strokeWidth={2} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed Tab Panels */}
                    <div className="bg-card rounded-2xl border border-card shadow-sm overflow-hidden flex flex-col">
                        {/* Tab Headers */}
                        <div className="flex border-b border-card bg-page/50">
                            {[
                                { key: 'receivables', label: 'Accounts Receivable' },
                                { key: 'tax', label: 'Sales Tax / GST Details' },
                                { key: 'returns', label: 'Returns & Credit Notes' },
                                { key: 'profitability', label: 'COGS & Profit Listing' }
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 py-4 text-xs font-bold text-center border-b-2 transition-all ${
                                        activeTab === tab.key
                                            ? 'border-primary text-primary bg-card'
                                            : 'border-transparent text-textMuted hover:text-textMain hover:bg-page/50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {/* TAB 1: RECEIVABLES */}
                            {activeTab === 'receivables' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                                        {/* Aging Summary cards */}
                                        <div className="lg:col-span-1 space-y-3">
                                            <h4 className="text-xs font-black uppercase text-textMuted tracking-wider">AR Aging Summary</h4>
                                            <div className="divide-y divide-gray-100 border border-card rounded-2xl overflow-hidden bg-surface">
                                                <div className="flex justify-between items-center p-3">
                                                    <span className="text-xs text-textMuted font-semibold">Current (Not Overdue)</span>
                                                    <span className="text-xs font-bold text-status-success">{formatPKR(analytics?.ar_aging_buckets?.current)}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3">
                                                    <span className="text-xs text-textMuted font-semibold">1 - 30 Days Overdue</span>
                                                    <span className="text-xs font-bold text-amber-500">{formatPKR(analytics?.ar_aging_buckets?.['1_30_days'])}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3">
                                                    <span className="text-xs text-textMuted font-semibold">31 - 60 Days Overdue</span>
                                                    <span className="text-xs font-bold text-rose-500">{formatPKR(analytics?.ar_aging_buckets?.['31_60_days'])}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3">
                                                    <span className="text-xs text-textMuted font-semibold">61 - 90 Days Overdue</span>
                                                    <span className="text-xs font-bold text-status-info">{formatPKR(analytics?.ar_aging_buckets?.['61_90_days'])}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3">
                                                    <span className="text-xs text-textMuted font-semibold">90+ Days Overdue</span>
                                                    <span className="text-xs font-bold text-red-950">{formatPKR(analytics?.ar_aging_buckets?.['90_plus_days'])}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Aging chart */}
                                        <div className="lg:col-span-2">
                                            <h4 className="text-xs font-black uppercase text-textMuted tracking-wider mb-3">Aging Distribution</h4>
                                            <div className="h-44">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={agingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                        <YAxis tickFormatter={formatCompactPKR} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                        <Tooltip formatter={(val) => formatPKR(val)} />
                                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Outstanding receivables listing */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black uppercase text-textMuted tracking-wider">Outstanding Invoices & Pending Sales</h4>
                                        <div className="overflow-x-auto border border-card rounded-2xl">
                                            <table className="w-full text-xs text-left">
                                                <thead className="text-text-secondary text-[10px] uppercase font-semibold border-b border-border-card">
                                                    <tr>
                                                        <th className="px-4 py-3">Doc Ref</th>
                                                        <th className="px-4 py-3">Customer</th>
                                                        <th className="px-4 py-3">Due Date</th>
                                                        <th className="px-4 py-3 text-center">Days Overdue</th>
                                                        <th className="px-4 py-3">Aging Bracket</th>
                                                        <th className="px-4 py-3 text-right font-semibold">Billed Amount</th>
                                                        <th className="px-4 py-3 text-right font-semibold">Outstanding Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border-card font-medium">
                                                    {analytics?.outstanding_invoices?.map((inv) => (
                                                        <tr key={inv.id} className="hover:bg-page transition-colors">
                                                            <td className="px-4 py-3 font-mono font-bold text-primary">{inv.invoice_number}</td>
                                                            <td className="px-4 py-3 text-textMain font-bold">{inv.customer_name}</td>
                                                            <td className="px-4 py-3 text-textMuted">{inv.due_date}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`text-[10px] font-semibold ${
                                                                    inv.days_overdue > 90 ? 'text-text-secondary' :
                                                                    inv.days_overdue > 0 ? 'text-status-info' : 'text-status-success'
                                                                }`}>
                                                                    {inv.days_overdue} days
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-textMuted">{inv.aging_tier}</td>
                                                            <td className="px-4 py-3 text-right text-textMuted">{formatPKR(inv.total_amount)}</td>
                                                            <td className="px-4 py-3 text-right text-status-info font-bold">{formatPKR(inv.balance_due)}</td>
                                                        </tr>
                                                    ))}
                                                    {!analytics?.outstanding_invoices?.length && (
                                                        <tr>
                                                            <td colSpan="7" className="px-4 py-12 text-center text-textMuted">No outstanding receivables found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: TAX BREAKDOWN */}
                            {activeTab === 'tax' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3">
                                        <div>
                                            <h4 className="text-xs font-black uppercase text-textMuted tracking-wider">Output Sales Tax / GST Ledger</h4>
                                            <p className="text-[10px] text-textMuted mt-0.5">Calculated at 18% standard rate for POS sales and exact billing tax on Invoices.</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Total Output Tax Billed</span>
                                            <div className="text-lg font-black text-primary mt-0.5">{formatPKR(analytics?.summary?.total_gst_collected)}</div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border border-card rounded-2xl">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-text-secondary text-[10px] uppercase font-semibold border-b border-border-card">
                                                <tr>
                                                    <th className="px-4 py-3">Doc Type</th>
                                                    <th className="px-4 py-3">Reference</th>
                                                    <th className="px-4 py-3">Customer</th>
                                                    <th className="px-4 py-3">Date</th>
                                                    <th className="px-4 py-3 text-right">Net Subtotal</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Calculated Output Tax</th>
                                                    <th className="px-4 py-3 text-right">Gross Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-card font-medium">
                                                {analytics?.tax_details?.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-page transition-colors">
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[10px] font-semibold ${
                                                                item.type === 'Invoice' ? 'text-status-info' : 'text-status-success'
                                                            }`}>
                                                                {item.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-mono font-bold">{item.reference}</td>
                                                        <td className="px-4 py-3 font-bold">{item.customer_name}</td>
                                                        <td className="px-4 py-3 text-textMuted">{item.date}</td>
                                                        <td className="px-4 py-3 text-right text-textMuted">{formatPKR(item.subtotal)}</td>
                                                        <td className="px-4 py-3 text-right text-primary font-bold">{formatPKR(item.tax_amount)}</td>
                                                        <td className="px-4 py-3 text-right font-bold">{formatPKR(item.total_amount)}</td>
                                                    </tr>
                                                ))}
                                                {!analytics?.tax_details?.length && (
                                                    <tr>
                                                        <td colSpan="7" className="px-4 py-12 text-center text-textMuted">No tax records found for the period.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: RETURNS & CREDIT NOTES */}
                            {activeTab === 'returns' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3">
                                        <div>
                                            <h4 className="text-xs font-black uppercase text-textMuted tracking-wider">Sales Returns & Customer Refunds</h4>
                                            <p className="text-[10px] text-textMuted mt-0.5">Track items returned by clients and reverse inventory stock transactions.</p>
                                        </div>
                                        <button 
                                            onClick={() => setIsReturnModalOpen(true)}
                                            className="flex items-center px-4 py-2 bg-gradient-to-r from-primary to-accent text-card font-bold text-xs rounded-full shadow-sm hover:-translate-y-0.5 transition-all"
                                        >
                                            Record Sale Return
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto border border-card rounded-2xl">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-text-secondary text-[10px] uppercase font-semibold border-b border-border-card">
                                                <tr>
                                                    <th className="px-4 py-3">Return ID</th>
                                                    <th className="px-4 py-3">Original Sale</th>
                                                    <th className="px-4 py-3">Customer</th>
                                                    <th className="px-4 py-3">Product Name</th>
                                                    <th className="px-4 py-3 text-center">Returned Qty</th>
                                                    <th className="px-4 py-3">Date Returned</th>
                                                    <th className="px-4 py-3">Reason</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Refunded Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-card font-medium">
                                                {analytics?.returns_list?.map((ret) => (
                                                    <tr key={ret.id} className="hover:bg-page transition-colors">
                                                        <td className="px-4 py-3 font-mono font-bold text-textMuted">#RET-{String(ret.id).padStart(4, '0')}</td>
                                                        <td className="px-4 py-3 font-mono font-bold text-primary">{ret.sale_invoice}</td>
                                                        <td className="px-4 py-3 font-bold">{ret.customer_name}</td>
                                                        <td className="px-4 py-3 font-bold">{ret.product_name} <code className="bg-page px-1 rounded text-textMuted font-mono text-[10px]">{ret.product_code}</code></td>
                                                        <td className="px-4 py-3 text-center font-bold text-status-info">{ret.quantity_returned}</td>
                                                        <td className="px-4 py-3 text-textMuted">{ret.return_date}</td>
                                                        <td className="px-4 py-3 text-textMuted max-w-xs truncate" title={ret.reason}>{ret.reason || '—'}</td>
                                                        <td className="px-4 py-3 text-right text-status-info font-bold">{formatPKR(ret.refund_amount)}</td>
                                                    </tr>
                                                ))}
                                                {!analytics?.returns_list?.length && (
                                                    <tr>
                                                        <td colSpan="8" className="px-4 py-12 text-center text-textMuted">No sales returns recorded in this timeframe.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: COGS & MARGIN */}
                            {activeTab === 'profitability' && (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-black uppercase text-textMuted tracking-wider">Transaction COGS & Cost Margins</h4>
                                        <p className="text-[10px] text-textMuted mt-0.5">Integrates snapshotted acquisition costs directly against revenues for live gross margin tracking.</p>
                                    </div>

                                    <div className="overflow-x-auto border border-card rounded-2xl">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-text-secondary text-[10px] uppercase font-semibold border-b border-border-card">
                                                <tr>
                                                    <th className="px-4 py-3">Doc Reference</th>
                                                    <th className="px-4 py-3">Product Summary</th>
                                                    <th className="px-4 py-3 text-center">Items Sold</th>
                                                    <th className="px-4 py-3 text-right">Acquisition Cost</th>
                                                    <th className="px-4 py-3 text-right">Billed Revenue</th>
                                                    <th className="px-4 py-3 text-right">Cost of Goods (COGS)</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Gross Profit</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Cost Margin</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-card font-medium">
                                                {analytics?.profitability_details?.map((sale, idx) => (
                                                    <tr key={idx} className="hover:bg-page transition-colors">
                                                        <td className="px-4 py-3 font-mono font-bold text-primary">{sale.reference}</td>
                                                        <td className="px-4 py-3 font-bold">{sale.product_name}</td>
                                                        <td className="px-4 py-3 text-center font-bold">{sale.quantity_sold}</td>
                                                        <td className="px-4 py-3 text-right text-textMuted">{formatPKR(sale.unit_cost_price)} / unit</td>
                                                        <td className="px-4 py-3 text-right font-bold">{formatPKR(sale.revenue)}</td>
                                                        <td className="px-4 py-3 text-right text-primary font-bold">{formatPKR(sale.cogs)}</td>
                                                        <td className="px-4 py-3 text-right text-status-success font-bold">{formatPKR(sale.profit)}</td>
                                                        <td className="px-4 py-3 text-right font-black">
                                                            <span className={`text-[10px] ${
                                                                sale.margin > 40 ? 'text-status-success' :
                                                                sale.margin > 20 ? 'text-status-info' : 'text-text-secondary'
                                                            }`}>
                                                                {sale.margin.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {!analytics?.profitability_details?.length && (
                                                    <tr>
                                                        <td colSpan="8" className="px-4 py-12 text-center text-textMuted">No POS sales records found to analyze cost margins.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* RECORD RETURN MODAL */}
            {isReturnModalOpen && (
                <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-card">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-status-info/10 text-status-info rounded-xl">
                                    <Undo2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-textMain">Record Customer Sales Return</h2>
                                    <p className="text-xs text-textMuted">Restores product batches to stock & logs refund outflow</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsReturnModalOpen(false);
                                    setMatchedSale(null);
                                    setSelectedProduct(null);
                                    setSaleSearchId('');
                                    setModalError('');
                                }} 
                                className="p-2 hover:bg-page rounded-xl transition-colors"
                            >
                                <X className="w-4 h-4 text-secondary" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleRecordReturn} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                            {modalError && (
                                <div className="p-3.5 bg-status-info/10 border border-rose-100 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{modalError}</span>
                                </div>
                            )}
                            {modalSuccess && (
                                <div className="p-3.5 bg-status-success/10 border border-emerald-100 rounded-xl text-status-success text-xs font-semibold flex items-center gap-2">
                                    <Check className="w-4 h-4 shrink-0" />
                                    <span>{modalSuccess}</span>
                                </div>
                            )}

                            {/* Step 1: Search Sale ID */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-textMuted uppercase tracking-wider">Sale ID</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Enter Sale ID (e.g. 5)"
                                        value={saleSearchId}
                                        onChange={(e) => setSaleSearchId(e.target.value)}
                                        disabled={!!matchedSale || submittingReturn}
                                        className="flex-1 px-3 py-2 border border-card rounded-lg text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                    />
                                    {matchedSale ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMatchedSale(null);
                                                setSelectedProduct(null);
                                                setSaleSearchId('');
                                                setModalError('');
                                            }}
                                            className="px-4 py-2 border border-card text-textMuted hover:text-textMain hover:bg-page rounded-full text-xs font-bold transition-all"
                                        >
                                            Reset
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleFetchSaleDetails}
                                            className="px-4 py-2 bg-primary font-bold rounded-full text-xs active:scale-95"
                                        >
                                            Verify Sale
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Show product and details once sale verified */}
                            {matchedSale && (
                                <div className="space-y-4 border-t border-card pt-4 animate-in slide-in-from-top-4 duration-200">
                                    {/* Sale info snapshot */}
                                    <div className="p-3 bg-page rounded-xl text-xs space-y-1.5 font-medium text-textMuted border border-card">
                                        <div className="flex justify-between"><span>Customer:</span><span className="font-bold text-textMain">{matchedSale.customer_name}</span></div>
                                        <div className="flex justify-between"><span>Sale Date:</span><span className="font-bold text-textMain">{matchedSale.sale_date}</span></div>
                                        <div className="flex justify-between"><span>Paid total:</span><span className="font-bold text-status-success">{formatPKR(matchedSale.total_price)}</span></div>
                                    </div>

                                    {/* Product picker */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-textMuted uppercase tracking-wider">Product to Return</label>
                                        <select
                                            disabled={submittingReturn}
                                            onChange={(e) => {
                                                const productObj = matchedSale.line_items?.find(item => item.product === parseInt(e.target.value)) || matchedSale;
                                                setSelectedProduct(productObj);
                                                setQtyToReturn(1);
                                            }}
                                            className="w-full px-3 py-2 border border-card rounded-lg text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary cursor-pointer font-bold text-xs"
                                        >
                                            {matchedSale.line_items?.map((item) => (
                                                <option key={item.product} value={item.product}>
                                                    {item.product_name} (Sold: {item.quantity_sold} units @ {formatPKR(item.unit_price)})
                                                </option>
                                            ))}
                                            {!matchedSale.line_items?.length && (
                                                <option value={matchedSale.product}>
                                                    {matchedSale.product_name} (Sold: {matchedSale.quantity_sold} units)
                                                </option>
                                            )}
                                        </select>
                                    </div>

                                    {selectedProduct && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Quantity selector */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-textMuted uppercase tracking-wider">Return Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={selectedProduct.quantity_sold || selectedProduct.quantity}
                                                    value={qtyToReturn}
                                                    onChange={(e) => setQtyToReturn(Math.min(Number(e.target.value), selectedProduct.quantity_sold || selectedProduct.quantity))}
                                                    disabled={submittingReturn}
                                                    className="w-full px-3 py-2 border border-card rounded-lg text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>

                                            {/* Refund amount input */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-textMuted uppercase tracking-wider">Refund Cash Amount</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={refundAmount}
                                                    onChange={(e) => setRefundAmount(e.target.value)}
                                                    disabled={submittingReturn}
                                                    className="w-full px-3 py-2 border border-card rounded-lg text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary font-bold"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Return Date input */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-textMuted uppercase tracking-wider">Return Date</label>
                                            <input
                                                type="date"
                                                value={returnDate}
                                                onChange={(e) => setReturnDate(e.target.value)}
                                                disabled={submittingReturn}
                                                className="w-full px-3 py-2 border border-card rounded-lg text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-textMuted uppercase tracking-wider">Reason for Return</label>
                                        <textarea
                                            rows={2.5}
                                            placeholder="Specify reason (e.g. damaged goods, duplicate order)"
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            disabled={submittingReturn}
                                            className="w-full px-3 py-2 border border-card rounded-lg text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary resize-none"
                                        />
                                    </div>

                                    {/* Action button */}
                                    <button
                                        type="submit"
                                        disabled={submittingReturn}
                                        className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-700 text-card font-bold text-xs rounded-full hover:shadow-[0_12px_24px_-4px_rgba(220,38,38,0.25)] hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submittingReturn && <span className="h-4.5 w-4.5 rounded-full border-2 border-card/30 border-t-white animate-spin inline-block" />}
                                        {submittingReturn ? 'Reversing ledger balances...' : 'Issue Refund & Record Return'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountantSalesView;
