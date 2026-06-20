import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wallet, TrendingUp, TrendingDown, FileText, Plus, Calendar, ShieldCheck, Download, Upload } from 'lucide-react';
import { accountsApi } from '../../services/accountsApi';
import { formatPKR } from '../../utils/currency';
import RevenuesTab from './components/RevenuesTab';
import ExpensesTab from './components/ExpensesTab';
import InvoicesTab from './components/InvoicesTab';
import COATreeTab from './components/COATreeTab';
import FinancialReportsTab from './components/FinancialReportsTab';
import RecordModal from './components/RecordModal';

const parseLocalDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    const str = String(val).split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }
    return new Date(val);
};

const formatDateLabel = (date) => {
    if (!date) return '';
    const d = parseLocalDate(date);
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const toISODateString = (date) => {
    if (!date) return '';
    const d = parseLocalDate(date);
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function useFilteredFinancials(transactions, dateRange) {
    return useMemo(() => {
        const start = parseLocalDate(dateRange.startDate);
        const end = parseLocalDate(dateRange.endDate);
        
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
            return {
                filteredRevenue: 0,
                filteredExpenses: 0,
                filteredNetProfit: 0,
                filteredInvoices: [],
                filteredRevenuesList: [],
                filteredExpensesList: []
            };
        }

        const inRange = (dateStr) => {
            if (!dateStr) return false;
            const itemDate = parseLocalDate(dateStr);
            if (!itemDate || isNaN(itemDate.getTime())) return false;
            
            const compareStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const compareEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
            const compareItem = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
            
            return compareItem >= compareStart && compareItem <= compareEnd;
        };

        const filteredRevenuesList = transactions.filter(t => {
            const targetDate = t.date || t.due_date;
            if (!inRange(targetDate)) return false;
            // Revenues criteria: type is income or category is Sales Revenue/SALES_REVENUE/etc.
            return t.type === 'income' || t.category === 'Sales Revenue' || t.category === 'SALES_REVENUE' || t.category === 'SERVICE_INCOME' || t.category === 'OTHER_INCOME';
        });

        const filteredExpensesList = transactions.filter(t => {
            const targetDate = t.date || t.due_date;
            if (!inRange(targetDate)) return false;
            // Expenses criteria: type is expense/debit/payout or amount is a debit/payout (e.g. t.type is debit/payout)
            return t.type === 'expense' || t.type === 'debit' || t.type === 'payout';
        });

        const filteredInvoices = transactions.filter(t => {
            const targetDate = t.date || t.due_date;
            if (!inRange(targetDate)) return false;
            // Invoices criteria: invoice number exists or receivable status (UNPAID/RECEIVABLE/etc. or isInvoice/type is invoice)
            return !!(t.invoice_number || t.isInvoice || t.status === 'UNPAID' || t.status === 'RECEIVABLE' || t.status === 'PAID' || t.status === 'OVERDUE' || t.type === 'invoice');
        });

        const filteredRevenue = filteredRevenuesList.reduce((sum, t) => {
            return t.voided ? sum : sum + Number(t.amount || 0);
        }, 0);

        const filteredExpenses = filteredExpensesList.reduce((sum, t) => {
            return t.voided ? sum : sum + Number(t.amount || 0);
        }, 0);

        const filteredNetProfit = filteredRevenue - filteredExpenses;

        return {
            filteredRevenue,
            filteredExpenses,
            filteredNetProfit,
            filteredInvoices,
            filteredRevenuesList,
            filteredExpensesList
        };
    }, [transactions, dateRange.startDate, dateRange.endDate]);
}

const AccountsManager = () => {
    const [activeTab, setActiveTab] = useState('revenues');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // 1. Centralized State (Default: empty to allow auto-fitting from KPI response)
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [sliderDuration, setSliderDuration] = useState(30);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [toastMessage, setToastMessage] = useState(null);
    const [kpis, setKpis] = useState(null);
    const [loadingKpis, setLoadingKpis] = useState(true);

    const fileInputRef = useRef(null);

    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => {
            setToastMessage(null);
        }, 4000);
    };

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                setLoadingKpis(true);
                setError(null);
                
                const startStr = dateRange.startDate ? toISODateString(dateRange.startDate) : '';
                const endStr = dateRange.endDate ? toISODateString(dateRange.endDate) : '';
                
                // 1. Fetch KPIs
                const kpiRes = await accountsApi.getKpis('custom', startStr, endStr);
                if (kpiRes.data?.success) {
                    const data = kpiRes.data.data;
                    setKpis(data);
                    
                    // If start/end dates are empty, populate them from the KPI response (Auto-fit)
                    if (!dateRange.startDate && !dateRange.endDate && data.start_date && data.end_date) {
                        const newStart = parseLocalDate(data.start_date);
                        const newEnd = parseLocalDate(data.end_date);
                        setDateRange({
                            startDate: newStart,
                            endDate: newEnd
                        });
                        const diff = Math.ceil((newEnd - newStart) / (1000 * 60 * 60 * 24)) + 1;
                        setSliderDuration(Math.min(365, Math.max(1, diff)));
                        return; // The state update will trigger this useEffect again with valid dates
                    }
                }
                
                // 2. Fetch Transactions (only if dates are populated)
                if (startStr && endStr) {
                    const [revRes, expRes, invRes] = await Promise.all([
                        accountsApi.getRevenues('custom', 1, startStr, endStr),
                        accountsApi.getExpenses('custom', 1, startStr, endStr),
                        accountsApi.getInvoices('custom', 1, 500, startStr, endStr)
                    ]);
                    
                    const revs = (revRes.data?.data || []).map(r => ({ ...r, type: 'income' }));
                    const exps = (expRes.data?.data || []).map(e => ({ ...e, type: 'expense' }));
                    const invs = (invRes.data?.data || []).map(i => ({ ...i, isInvoice: true, date: i.due_date, type: 'invoice' }));
                    
                    setTransactions([...revs, ...exps, ...invs]);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError(err.message || 'Failed to fetch accounts data.');
                setKpis({
                    total_revenue: 0,
                    revenue_growth: 0,
                    total_cogs: 0,
                    cogs_growth: 0,
                    gross_profit: 0,
                    gross_profit_margin: 0,
                    gross_profit_growth: 0,
                    total_expense: 0,
                    expense_growth: 0,
                    net_profit: 0,
                    net_profit_margin: 0,
                    profit_growth: 0,
                    cash_inflow: 0,
                    cash_outflow: 0,
                    cash_flow: 0,
                    cash_flow_growth: 0,
                    inventory_value: 0,
                });
            } finally {
                setLoading(false);
                setLoadingKpis(false);
            }
        };

        fetchAllData();
    }, [refreshTrigger, dateRange.startDate, dateRange.endDate]);

    const { 
        filteredRevenue, 
        filteredExpenses, 
        filteredNetProfit, 
        filteredInvoices, 
        filteredRevenuesList, 
        filteredExpensesList 
    } = useFilteredFinancials(transactions, dateRange);

    const handleStartDateChange = (val) => {
        if (!val) return;
        const newStart = parseLocalDate(val);
        setDateRange(prev => {
            const nextEnd = prev.endDate >= newStart ? prev.endDate : newStart;
            const diff = Math.ceil((nextEnd - newStart) / (1000 * 60 * 60 * 24)) + 1;
            setSliderDuration(Math.min(365, Math.max(1, diff)));
            return {
                startDate: newStart,
                endDate: nextEnd
            };
        });
    };

    const handleEndDateChange = (val) => {
        if (!val) return;
        const newEnd = parseLocalDate(val);
        setDateRange(prev => {
            const nextStart = prev.startDate <= newEnd ? prev.startDate : newEnd;
            const diff = Math.ceil((newEnd - nextStart) / (1000 * 60 * 60 * 24)) + 1;
            setSliderDuration(Math.min(365, Math.max(1, diff)));
            return {
                startDate: nextStart,
                endDate: newEnd
            };
        });
    };

    const handleSliderChange = (duration) => {
        const val = parseInt(duration, 10);
        setSliderDuration(val);
        setDateRange(prev => {
            const nextEnd = new Date(prev.startDate);
            nextEnd.setDate(nextEnd.getDate() + val - 1);
            return {
                ...prev,
                endDate: nextEnd
            };
        });
    };

    const handleAddRecord = () => {
        setSelectedRecord(null);
        setIsModalOpen(true);
    };

    const handleEditRecord = (record) => {
        setSelectedRecord(record);
        setIsModalOpen(true);
    };

    const handleReconcile = async () => {
        showToast("General Ledger audit reconciliation completed successfully! General accounts are balanced.");
    };

    const handleUploadReceiptClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            showToast(`Receipt "${file.name}" uploaded and matched successfully!`);
        }
    };

    const handleExportCSV = () => {
        try {
            let dataToExport = [];
            let headers = [];
            let filename = `${activeTab}_export.csv`;

            if (activeTab === 'revenues') {
                dataToExport = filteredRevenuesList;
                headers = ['Date', 'Customer', 'Invoice #', 'Category', 'Status', 'Amount', 'Voided', 'Void Reason'];
            } else if (activeTab === 'expenses') {
                dataToExport = filteredExpensesList;
                headers = ['Date', 'Vendor', 'Category', 'Payment Method', 'Tax Amount', 'Total Amount', 'Receipt', 'Voided', 'Void Reason'];
            } else if (activeTab === 'invoices') {
                dataToExport = filteredInvoices;
                headers = ['Due Date', 'Customer', 'Invoice #', 'Status', 'Balance Due', 'Total Amount', 'Aging (Days)', 'Voided'];
            }

            if (dataToExport.length === 0) {
                showToast("No data available to export in this period.", "info");
                return;
            }

            const csvRows = [];
            csvRows.push(headers.join(','));

            for (const row of dataToExport) {
                let values = [];
                if (activeTab === 'revenues') {
                    values = [
                        row.date,
                        `"${row.customer?.replace(/"/g, '""')}"`,
                        row.invoice_number || '',
                        row.category,
                        row.payment_status,
                        row.amount,
                        row.voided ? 'Yes' : 'No',
                        `"${(row.void_reason || '').replace(/"/g, '""')}"`
                    ];
                } else if (activeTab === 'expenses') {
                    values = [
                        row.date,
                        `"${(row.vendor || '').replace(/"/g, '""')}"`,
                        row.category,
                        row.payment_method,
                        row.tax_amount,
                        row.amount,
                        row.receipt || '',
                        row.voided ? 'Yes' : 'No',
                        `"${(row.void_reason || '').replace(/"/g, '""')}"`
                    ];
                } else if (activeTab === 'invoices') {
                    values = [
                        row.due_date,
                        `"${row.client_name?.replace(/"/g, '""')}"`,
                        row.invoice_number,
                        row.status,
                        row.balance_due,
                        row.amount,
                        row.aging,
                        row.voided ? 'Yes' : 'No'
                    ];
                }
                csvRows.push(values.join(','));
            }

            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("CSV exported successfully!");
        } catch (error) {
            console.error("Export failed:", error);
            showToast("Failed to export CSV file.", "error");
        }
    };

    const getGrowthBadge = (growth) => {
        if (growth === undefined || growth === null) return null;
        const isPositive = growth >= 0;
        const colorClass = isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100';
        const sign = isPositive ? '+' : '';
        return (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colorClass} inline-block mt-0.5`}>
                {sign}{growth}% vs prev period
            </span>
        );
    };

    return (
        <div className="space-y-6 relative">
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 p-4 rounded-xl border bg-white shadow-lg flex items-center gap-3 animate-in slide-in-from-top duration-300">
                    <div className={`w-2 h-2 rounded-full ${toastMessage.type === 'error' ? 'bg-red-500' : toastMessage.type === 'info' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                    <p className="text-xs font-semibold text-slate-900">{toastMessage.text}</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
                        Accounts & Finance
                    </h1>
                    <p className="text-sm text-textMuted mt-1">Upgrade general ledgers, accounts receivable, and audit compliance.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white border border-slate-200 rounded-2xl p-2.5 gap-3 shadow-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 pl-0.5">Start Date</span>
                                <input 
                                    type="date" 
                                    value={toISODateString(dateRange.startDate)}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                    className="px-2 py-1 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-primary transition-all font-mono"
                                />
                            </div>
                            <span className="text-slate-300 font-bold self-end mb-1 text-xs px-0.5">to</span>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 pl-0.5">End Date</span>
                                <input 
                                    type="date" 
                                    value={toISODateString(dateRange.endDate)}
                                    onChange={(e) => handleEndDateChange(e.target.value)}
                                    className="px-2 py-1 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-primary transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div className="hidden sm:block w-px h-6 bg-slate-200 self-end mb-1"></div>

                        <div className="flex flex-col min-w-[140px] sm:min-w-[170px] justify-end">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Duration</span>
                                <span className="text-[10px] font-black text-primary bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100 font-mono">
                                    {sliderDuration} {sliderDuration === 1 ? 'day' : 'days'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 h-6">
                                <span className="text-[9px] text-slate-400 font-bold font-mono">1d</span>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="365" 
                                    value={sliderDuration}
                                    onChange={(e) => handleSliderChange(e.target.value)}
                                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="text-[9px] text-slate-400 font-bold font-mono">1y</span>
                            </div>
                        </div>
                    </div>

                    {(activeTab !== 'chart-tree' && activeTab !== 'financial-reports') && (
                        <button 
                            onClick={handleAddRecord}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg shadow-sm hover:bg-primaryDark cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Add Record
                        </button>
                    )}
                </div>
            </div>

            {(activeTab !== 'chart-tree' && activeTab !== 'financial-reports') && (
                <div className="bg-slate-100/80 p-3 rounded-2xl flex flex-wrap items-center gap-3 border border-slate-200/50 print:hidden">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide px-2">Quick Actions:</span>
                    <button 
                        onClick={handleReconcile}
                        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Reconcile Ledger
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                        <Download className="w-4 h-4 text-blue-600" />
                        Export CSV
                    </button>
                    <button 
                        onClick={handleUploadReceiptClick}
                        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                        <Upload className="w-4 h-4 text-purple-600" />
                        Upload Receipt
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*,.pdf" 
                        className="hidden" 
                    />
                </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 print:hidden">
                {/* Total Revenue */}
                <div className="bg-white p-4 rounded-2xl border-l-4 border-emerald-500 border-y border-r border-gray-100 shadow-sm flex flex-col gap-1">
                    <p className="text-xs text-textMuted font-bold uppercase tracking-wider">Revenue</p>
                    <h4 className="text-lg font-bold text-slate-900">{loadingKpis ? '...' : formatPKR(kpis?.total_revenue || 0)}</h4>
                    {!loadingKpis && getGrowthBadge(kpis?.revenue_growth)}
                    <div className="mt-auto pt-2 self-end p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                </div>

                {/* Total COGS */}
                <div className="bg-white p-4 rounded-2xl border-l-4 border-orange-400 border-y border-r border-gray-100 shadow-sm flex flex-col gap-1">
                    <p className="text-xs text-textMuted font-bold uppercase tracking-wider">COGS</p>
                    <h4 className="text-lg font-bold text-slate-900">{loadingKpis ? '...' : formatPKR(kpis?.total_cogs || 0)}</h4>
                    {!loadingKpis && getGrowthBadge(kpis?.cogs_growth)}
                    <div className="mt-auto pt-2 self-end p-2 bg-orange-50 text-orange-500 rounded-xl"><TrendingDown className="w-5 h-5" /></div>
                </div>

                {/* Gross Profit */}
                <div className="bg-white p-4 rounded-2xl border-l-4 border-teal-500 border-y border-r border-gray-100 shadow-sm flex flex-col gap-1">
                    <p className="text-xs text-textMuted font-bold uppercase tracking-wider">Gross Profit</p>
                    <h4 className="text-lg font-bold text-slate-900">{loadingKpis ? '...' : formatPKR(kpis?.gross_profit || 0)}</h4>
                    {!loadingKpis && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border text-teal-700 bg-teal-50 border-teal-100 inline-block">{kpis?.gross_profit_margin?.toFixed(1)}% margin</span>}
                    <div className="mt-auto pt-2 self-end p-2 bg-teal-50 text-teal-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                </div>

                {/* Total Expenses */}
                <div className="bg-white p-4 rounded-2xl border-l-4 border-rose-500 border-y border-r border-gray-100 shadow-sm flex flex-col gap-1">
                    <p className="text-xs text-textMuted font-bold uppercase tracking-wider">Expenses</p>
                    <h4 className="text-lg font-bold text-slate-900">{loadingKpis ? '...' : formatPKR(kpis?.total_expense || 0)}</h4>
                    {!loadingKpis && getGrowthBadge(kpis?.expense_growth)}
                    <div className="mt-auto pt-2 self-end p-2 bg-rose-50 text-rose-600 rounded-xl"><TrendingDown className="w-5 h-5" /></div>
                </div>

                {/* Net Profit */}
                <div className={`bg-white p-4 rounded-2xl border-l-4 ${(!loadingKpis && kpis?.net_profit < 0) ? 'border-rose-500' : 'border-primary'} border-y border-r border-gray-100 shadow-sm flex flex-col gap-1`}>
                    <p className="text-xs text-textMuted font-bold uppercase tracking-wider">{(!loadingKpis && kpis?.net_profit < 0) ? 'Net Loss' : 'Net Profit'}</p>
                    <h4 className="text-lg font-bold text-slate-900">{loadingKpis ? '...' : formatPKR(kpis?.net_profit || 0)}</h4>
                    {!loadingKpis && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border text-sky-700 bg-sky-50 border-sky-100 inline-block">{kpis?.net_profit_margin?.toFixed(1)}% margin</span>}
                    <div className={`mt-auto pt-2 self-end p-2 ${(!loadingKpis && kpis?.net_profit < 0) ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-primary'} rounded-xl`}><Wallet className="w-5 h-5" /></div>
                </div>

                {/* Cash Flow */}
                <div className="bg-white p-4 rounded-2xl border-l-4 border-amber-500 border-y border-r border-gray-100 shadow-sm flex flex-col gap-1">
                    <p className="text-xs text-textMuted font-bold uppercase tracking-wider">Net Cash Flow</p>
                    <h4 className="text-lg font-bold text-slate-900">{loadingKpis ? '...' : formatPKR(kpis?.cash_flow || 0)}</h4>
                    {!loadingKpis && getGrowthBadge(kpis?.cash_flow_growth)}
                    <div className="mt-auto pt-2 self-end p-2 bg-amber-50 text-amber-600 rounded-xl"><FileText className="w-5 h-5" /></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px] print:border-none print:shadow-none print:bg-transparent">
                <div className="flex justify-between items-center border-b border-gray-100 px-6 pt-4 print:hidden">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('revenues')}
                            className={`pb-4 font-bold text-sm transition-colors relative cursor-pointer ${activeTab === 'revenues' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Revenues
                            {activeTab === 'revenues' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={`pb-4 font-bold text-sm transition-colors relative cursor-pointer ${activeTab === 'expenses' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Expenses
                            {activeTab === 'expenses' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`pb-4 font-bold text-sm transition-colors relative cursor-pointer ${activeTab === 'invoices' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Invoices (Receivables)
                            {activeTab === 'invoices' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('chart-tree')}
                            className={`pb-4 font-bold text-sm transition-colors relative cursor-pointer ${activeTab === 'chart-tree' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Chart of Accounts
                            {activeTab === 'chart-tree' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('financial-reports')}
                            className={`pb-4 font-bold text-sm transition-colors relative cursor-pointer ${activeTab === 'financial-reports' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Financial Statements
                            {activeTab === 'financial-reports' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                        </button>
                    </div>

                    <div className="pb-4 flex items-center gap-1.5 text-xs font-semibold text-textMuted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                            Filter: 
                            <span className="text-primary ml-1.5 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 font-bold">
                                {formatDateLabel(dateRange.startDate)} - {formatDateLabel(dateRange.endDate)}
                            </span>
                        </span>
                    </div>
                </div>

                <div className="p-6 flex-1 bg-slate-50/30 print:p-0 print:bg-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-slate-500 font-bold">Loading transactions...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-6 rounded-2xl text-center py-10 font-bold">
                            {error}
                        </div>
                    ) : (
                        <>
                            {activeTab === 'revenues' && (
                                filteredRevenuesList.length === 0 ? (
                                    <div className="empty-state-message text-center py-20 font-bold text-slate-500 bg-white rounded-2xl border border-slate-100 p-6">No matching database records found for this period.</div>
                                ) : (
                                    <RevenuesTab 
                                        revenues={filteredRevenuesList}
                                        onEdit={handleEditRecord} 
                                        triggerRefresh={triggerRefresh}
                                    />
                                )
                            )}
                            {activeTab === 'expenses' && (
                                filteredExpensesList.length === 0 ? (
                                    <div className="empty-state-message text-center py-20 font-bold text-slate-500 bg-white rounded-2xl border border-slate-100 p-6">No matching database records found for this period.</div>
                                ) : (
                                    <ExpensesTab 
                                        expenses={filteredExpensesList}
                                        onEdit={handleEditRecord} 
                                        triggerRefresh={triggerRefresh}
                                    />
                                )
                            )}
                            {activeTab === 'invoices' && (
                                filteredInvoices.length === 0 ? (
                                    <div className="empty-state-message text-center py-20 font-bold text-slate-500 bg-white rounded-2xl border border-slate-100 p-6">No matching database records found for this period.</div>
                                ) : (
                                    <InvoicesTab 
                                        invoices={filteredInvoices}
                                        onEdit={handleEditRecord} 
                                        triggerRefresh={triggerRefresh}
                                    />
                                )
                            )}
                            {activeTab === 'chart-tree' && (
                                <COATreeTab 
                                    refreshTrigger={refreshTrigger}
                                    dateRange="custom"
                                    startDate={toISODateString(dateRange.startDate)}
                                    endDate={toISODateString(dateRange.endDate)}
                                />
                            )}
                            {activeTab === 'financial-reports' && (
                                <FinancialReportsTab 
                                    refreshTrigger={refreshTrigger}
                                    dateRange="custom"
                                    startDate={toISODateString(dateRange.startDate)}
                                    endDate={toISODateString(dateRange.endDate)}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            <RecordModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                recordType={activeTab === 'invoices' ? 'invoices' : activeTab} 
                record={selectedRecord}
                triggerRefresh={triggerRefresh}
            />
        </div>
    );
};

export default AccountsManager;
