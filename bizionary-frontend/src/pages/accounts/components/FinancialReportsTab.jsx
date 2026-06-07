import React, { useState, useEffect } from 'react';
import { Download, Printer, RefreshCw, FileText, BarChart2 } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';

const FinancialReportsTab = ({ refreshTrigger, dateRange }) => {
    const [reportType, setReportType] = useState('profit-loss'); // 'profit-loss' | 'balance-sheet'
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        try {
            setLoading(true);
            let res;
            if (reportType === 'profit-loss') {
                res = await accountsApi.getProfitLoss(dateRange);
            } else {
                res = await accountsApi.getBalanceSheet(dateRange);
            }
            if (res.data?.success) {
                setReportData(res.data.data);
            }
        } catch (error) {
            console.error(`Failed to fetch ${reportType} report:`, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [refreshTrigger, dateRange, reportType]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        if (!reportData) return;
        
        let csvRows = [];
        let filename = '';

        if (reportType === 'profit-loss') {
            filename = `Profit_and_Loss_${dateRange}.csv`;
            csvRows.push(`Profit & Loss Statement - Period: ${dateRange}`);
            csvRows.push('');
            csvRows.push('Account Code,Account Name,Balance (PKR)');
            csvRows.push('REVENUE');
            (reportData.revenue || []).forEach(item => {
                csvRows.push(`${item.code},"${item.name}",${item.balance}`);
            });
            csvRows.push(`,Total Revenue,${reportData.total_revenue}`);
            csvRows.push('');
            csvRows.push('EXPENSES');
            (reportData.expense || []).forEach(item => {
                csvRows.push(`${item.code},"${item.name}",${item.balance}`);
            });
            csvRows.push(`,Total Expense,${reportData.total_expense}`);
            csvRows.push('');
            csvRows.push(`,NET PROFIT,${reportData.net_profit}`);
        } else {
            filename = `Balance_Sheet_${dateRange}.csv`;
            csvRows.push(`Balance Sheet - As of Date: ${reportData.as_of_date || 'Current'}`);
            csvRows.push('');
            csvRows.push('Account Code,Account Name,Balance (PKR)');
            csvRows.push('ASSETS');
            (reportData.assets || []).forEach(item => {
                csvRows.push(`${item.code},"${item.name}",${item.balance}`);
            });
            csvRows.push(`,Total Assets,${reportData.total_assets}`);
            csvRows.push('');
            csvRows.push('LIABILITIES');
            (reportData.liabilities || []).forEach(item => {
                csvRows.push(`${item.code},"${item.name}",${item.balance}`);
            });
            csvRows.push(`,Total Liabilities,${reportData.total_liabilities}`);
            csvRows.push('');
            csvRows.push('EQUITY');
            (reportData.equity || []).forEach(item => {
                csvRows.push(`${item.code},"${item.name}",${item.balance}`);
            });
            csvRows.push(`,Total Equity,${reportData.total_equity}`);
            csvRows.push('');
            csvRows.push(`,TOTAL LIABILITIES & EQUITY,${reportData.total_liabilities_and_equity}`);
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 print:space-y-2 print:p-0">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm gap-3 print:hidden">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setReportType('profit-loss')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${reportType === 'profit-loss' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <BarChart2 className="w-3.5 h-3.5" />
                        Profit & Loss
                    </button>
                    <button 
                        onClick={() => setReportType('balance-sheet')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${reportType === 'balance-sheet' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Balance Sheet
                    </button>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Print Report
                    </button>
                    <button 
                        onClick={fetchReport}
                        className="flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-slate-500 font-bold">Compiling ledger balances and report lines...</p>
                </div>
            ) : !reportData ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 p-6">
                    <p className="text-slate-500 font-bold text-sm">Failed to generate financial statement.</p>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
                    {/* Report Header */}
                    <div className="text-center space-y-1.5 border-b border-slate-100 pb-6">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {reportType === 'profit-loss' ? 'Profit & Loss Statement' : 'Balance Sheet'}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {reportType === 'profit-loss' ? `Period: ${dateRange.replace(/_/g, ' ')}` : `As of: ${reportData.as_of_date || 'Current'}`}
                        </p>
                    </div>

                    {reportType === 'profit-loss' ? (
                        /* PROFIT & LOSS VIEW */
                        <div className="space-y-6">
                            {/* Revenues Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">1. Revenue / Income</h3>
                                <div className="space-y-1">
                                    {(reportData.revenue || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm py-1">
                                            <span className="text-slate-600 font-semibold flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-slate-50 text-slate-400 px-1 py-0.5 rounded border border-slate-100">{item.code}</span>
                                                {item.name}
                                            </span>
                                            <span className="font-mono text-slate-800 font-bold">{formatPKR(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-2.5 mt-2">
                                        <span className="text-slate-900 uppercase">Total Income</span>
                                        <span className="font-mono text-slate-900">{formatPKR(reportData.total_revenue)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Expenses Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">2. Operating & Cost Expenses</h3>
                                <div className="space-y-1">
                                    {(reportData.expense || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm py-1">
                                            <span className="text-slate-600 font-semibold flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-slate-50 text-slate-400 px-1 py-0.5 rounded border border-slate-100">{item.code}</span>
                                                {item.name}
                                            </span>
                                            <span className="font-mono text-slate-800 font-bold">{formatPKR(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-2.5 mt-2">
                                        <span className="text-slate-900 uppercase">Total Expenses</span>
                                        <span className="font-mono text-slate-900">{formatPKR(reportData.total_expense)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Profit Summary */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center">
                                <div className="space-y-0.5">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Net Profit / Loss</h4>
                                    <p className="text-xxs font-bold text-slate-400">Total Income minus Operating Expenses</p>
                                </div>
                                <span className={`text-xl font-black font-mono ${reportData.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatPKR(reportData.net_profit)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* BALANCE SHEET VIEW */
                        <div className="space-y-6">
                            {/* Assets Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">1. Assets</h3>
                                <div className="space-y-1">
                                    {(reportData.assets || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm py-1">
                                            <span className="text-slate-600 font-semibold flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-slate-50 text-slate-400 px-1 py-0.5 rounded border border-slate-100">{item.code}</span>
                                                {item.name}
                                            </span>
                                            <span className="font-mono text-slate-800 font-bold">{formatPKR(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-2.5 mt-2">
                                        <span className="text-slate-900 uppercase">Total Assets</span>
                                        <span className="font-mono text-slate-900">{formatPKR(reportData.total_assets)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Liabilities Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">2. Liabilities</h3>
                                <div className="space-y-1">
                                    {(reportData.liabilities || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm py-1">
                                            <span className="text-slate-600 font-semibold flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-slate-50 text-slate-400 px-1 py-0.5 rounded border border-slate-100">{item.code}</span>
                                                {item.name}
                                            </span>
                                            <span className="font-mono text-slate-800 font-bold">{formatPKR(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-2.5 mt-2">
                                        <span className="text-slate-900 uppercase">Total Liabilities</span>
                                        <span className="font-mono text-slate-900">{formatPKR(reportData.total_liabilities)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Equity Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">3. Equity</h3>
                                <div className="space-y-1">
                                    {(reportData.equity || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm py-1">
                                            <span className="text-slate-600 font-semibold flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-slate-50 text-slate-400 px-1 py-0.5 rounded border border-slate-100">{item.code}</span>
                                                {item.name}
                                            </span>
                                            <span className="font-mono text-slate-800 font-bold">{formatPKR(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-2.5 mt-2">
                                        <span className="text-slate-900 uppercase">Total Equity</span>
                                        <span className="font-mono text-slate-900">{formatPKR(reportData.total_equity)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Totals Integrity Row */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-stretch">
                                <div className="flex-1 flex justify-between items-center border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-6">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Assets</span>
                                        <p className="text-xxs font-bold text-slate-400">Total debit balances</p>
                                    </div>
                                    <span className="text-lg font-black font-mono text-slate-950">{formatPKR(reportData.total_assets)}</span>
                                </div>
                                <div className="flex-1 flex justify-between items-center md:pl-6">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Liabilities & Equity</span>
                                        <p className="text-xxs font-bold text-slate-400">Balanced total credit items</p>
                                    </div>
                                    <span className="text-lg font-black font-mono text-slate-950">{formatPKR(reportData.total_liabilities_and_equity)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FinancialReportsTab;
