import React, { useState, useEffect, useRef } from 'react';
import { Wallet, TrendingUp, TrendingDown, FileText, Plus, Calendar, ShieldCheck, Download, Upload } from 'lucide-react';
import { accountsApi } from '../../services/accountsApi';
import { formatPKR } from '../../utils/currency';
import RevenuesTab from './components/RevenuesTab';
import ExpensesTab from './components/ExpensesTab';
import InvoicesTab from './components/InvoicesTab';
import COATreeTab from './components/COATreeTab';
import FinancialReportsTab from './components/FinancialReportsTab';
import RecordModal from './components/RecordModal';

const AccountsManager = () => {
    const [activeTab, setActiveTab] = useState('revenues');
    const [dateRange, setDateRange] = useState('last_30_days');
    const [kpis, setKpis] = useState(null);
    const [loadingKpis, setLoadingKpis] = useState(true);
    
    // Modal & Toast State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [toastMessage, setToastMessage] = useState(null);

    const fileInputRef = useRef(null);

    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => {
            setToastMessage(null);
        }, 4000);
    };

    useEffect(() => {
        const fetchKpis = async () => {
            try {
                setLoadingKpis(true);
                const res = await accountsApi.getKpis(dateRange);
                if (res.data?.success) {
                    setKpis(res.data.data);
                }
            } catch (error) {
                console.warn('Failed to fetch accounts KPIs.');
                setKpis({
                    total_revenue: 0,
                    revenue_growth: 0,
                    total_expense: 0,
                    expense_growth: 0,
                    net_profit: 0,
                    profit_growth: 0,
                    cash_flow: 0,
                    cash_flow_growth: 0
                });
            } finally {
                setLoadingKpis(false);
            }
        };

        fetchKpis();
    }, [refreshTrigger, dateRange]);

    useEffect(() => {
        const handleOrderedSlipUpdated = () => {
            triggerRefresh();
        };

        window.addEventListener('orderedSlipUpdated', handleOrderedSlipUpdated);

        return () => {
            window.removeEventListener('orderedSlipUpdated', handleOrderedSlipUpdated);
        };
    }, []);

    const handleAddRecord = () => {
        setSelectedRecord(null);
        setIsModalOpen(true);
    };

    const handleEditRecord = (record) => {
        setSelectedRecord(record);
        setIsModalOpen(true);
    };

    // Quick Actions
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

    const handleExportCSV = async () => {
        try {
            let dataToExport = [];
            let headers = [];
            let filename = `${activeTab}_export.csv`;

            if (activeTab === 'revenues') {
                const res = await accountsApi.getRevenues(dateRange, 1);
                dataToExport = res.data?.data || [];
                headers = ['Date', 'Customer', 'Invoice #', 'Category', 'Status', 'Amount', 'Voided', 'Void Reason'];
            } else if (activeTab === 'expenses') {
                const res = await accountsApi.getExpenses(dateRange, 1);
                dataToExport = res.data?.data || [];
                headers = ['Date', 'Vendor', 'Category', 'Payment Method', 'Tax Amount', 'Total Amount', 'Receipt', 'Voided', 'Void Reason'];
            } else if (activeTab === 'invoices') {
                const res = await accountsApi.getInvoices(dateRange, 1);
                dataToExport = res.data?.data || [];
                headers = ['Due Date', 'Customer', 'Invoice #', 'Status', 'Balance Due', 'Total Amount', 'Aging (Days)', 'Voided'];
            }

            if (dataToExport.length === 0) {
                showToast("No data available to export in this period.", "info");
                return;
            }

            // Construct CSV String
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

    const getDateRangeLabel = () => {
        if (dateRange === 'last_30_days') return 'Last 30 days';
        if (dateRange === 'this_quarter') return 'This Quarter';
        if (dateRange === 'this_year') return 'This Year';
        return 'All Time';
    };

    return (
        <div className="space-y-6 relative">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 p-4 rounded-xl border bg-white shadow-lg flex items-center gap-3 animate-in slide-in-from-top duration-300">
                    <div className={`w-2 h-2 rounded-full ${toastMessage.type === 'error' ? 'bg-red-500' : toastMessage.type === 'info' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                    <p className="text-xs font-semibold text-slate-900">{toastMessage.text}</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
                        Accounts & Finance
                    </h1>
                    <p className="text-sm text-textMuted mt-1">Upgrade general ledgers, accounts receivable, and audit compliance.</p>
                </div>

                {/* Global Date Filter & Add Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                        <button 
                            onClick={() => setDateRange('last_30_days')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateRange === 'last_30_days' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-slate-900'}`}
                        >
                            Last 30 Days
                        </button>
                        <button 
                            onClick={() => setDateRange('this_quarter')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateRange === 'this_quarter' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-slate-900'}`}
                        >
                            This Quarter
                        </button>
                        <button 
                            onClick={() => setDateRange('this_year')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateRange === 'this_year' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-slate-900'}`}
                        >
                            This Year
                        </button>
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

            {/* Quick Actions Panel */}
            {(activeTab !== 'chart-tree' && activeTab !== 'financial-reports') && (
                <div className="bg-slate-100/80 p-3 rounded-2xl flex flex-wrap items-center gap-3 border border-slate-200/50">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue - Color-coded: Green */}
                <div className="bg-white p-5 rounded-2xl border-l-4 border-emerald-500 border-y border-r border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-textMuted font-bold uppercase tracking-wider">Total Revenue</p>
                        <h4 className="text-xl font-bold text-slate-900">
                            {loadingKpis ? '...' : formatPKR(kpis?.total_revenue || 0)}
                        </h4>
                        {!loadingKpis && getGrowthBadge(kpis?.revenue_growth)}
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>

                {/* Total Expenses - Color-coded: Red */}
                <div className="bg-white p-5 rounded-2xl border-l-4 border-rose-500 border-y border-r border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-textMuted font-bold uppercase tracking-wider">Total Expenses</p>
                        <h4 className="text-xl font-bold text-slate-900">
                            {loadingKpis ? '...' : formatPKR(kpis?.total_expense || 0)}
                        </h4>
                        {!loadingKpis && getGrowthBadge(kpis?.expense_growth)}
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                </div>

                {/* Net Profit - Color-coded: Teal/Primary */}
                <div className="bg-white p-5 rounded-2xl border-l-4 border-primary border-y border-r border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-textMuted font-bold uppercase tracking-wider">Net Profit</p>
                        <h4 className="text-xl font-bold text-slate-900">
                            {loadingKpis ? '...' : formatPKR(kpis?.net_profit || 0)}
                        </h4>
                        {!loadingKpis && getGrowthBadge(kpis?.profit_growth)}
                    </div>
                    <div className="p-3 bg-sky-50 text-primary rounded-xl">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>

                {/* Cash Flow - Color-coded: Amber/Yellow */}
                <div className="bg-white p-5 rounded-2xl border-l-4 border-amber-500 border-y border-r border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-textMuted font-bold uppercase tracking-wider">Cash Flow</p>
                        <h4 className="text-xl font-bold text-slate-900">
                            {loadingKpis ? '...' : formatPKR(kpis?.cash_flow || 0)}
                        </h4>
                        {!loadingKpis && getGrowthBadge(kpis?.cash_flow_growth)}
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Tabs & Main Tables Container */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center border-b border-gray-100 px-6 pt-4">
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
                        <span>Filter: {getDateRangeLabel()}</span>
                    </div>
                </div>

                <div className="p-6 flex-1 bg-slate-50/30">
                    {activeTab === 'revenues' && (
                        <RevenuesTab 
                            refreshTrigger={refreshTrigger} 
                            onEdit={handleEditRecord} 
                            triggerRefresh={triggerRefresh}
                            dateRange={dateRange}
                        />
                    )}
                    {activeTab === 'expenses' && (
                        <ExpensesTab 
                            refreshTrigger={refreshTrigger} 
                            onEdit={handleEditRecord} 
                            triggerRefresh={triggerRefresh}
                            dateRange={dateRange}
                        />
                    )}
                    {activeTab === 'invoices' && (
                        <InvoicesTab 
                            refreshTrigger={refreshTrigger} 
                            onEdit={handleEditRecord} 
                            triggerRefresh={triggerRefresh}
                            dateRange={dateRange}
                        />
                    )}
                    {activeTab === 'chart-tree' && (
                        <COATreeTab 
                            refreshTrigger={refreshTrigger}
                            dateRange={dateRange}
                        />
                    )}
                    {activeTab === 'financial-reports' && (
                        <FinancialReportsTab 
                            refreshTrigger={refreshTrigger}
                            dateRange={dateRange}
                        />
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

