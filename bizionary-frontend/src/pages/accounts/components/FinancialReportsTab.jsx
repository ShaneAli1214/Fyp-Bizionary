import React, { useState, useEffect } from 'react';
import { Download, Printer, RefreshCw, FileText, BarChart2 } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';
import Logo from '../../../components/common/Logo';

const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, monthIndex, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const FinancialReportsTab = ({ refreshTrigger, dateRange, startDate, endDate }) => {
    const [reportType, setReportType] = useState('profit-loss'); // 'profit-loss' | 'balance-sheet'
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        try {
            setLoading(true);
            let res;
            if (reportType === 'profit-loss') {
                res = await accountsApi.getProfitLoss(dateRange, startDate, endDate);
            } else {
                res = await accountsApi.getBalanceSheet(dateRange, startDate, endDate);
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
    }, [refreshTrigger, dateRange, reportType, startDate, endDate]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        if (!reportData) return;
        
        let csvRows = [];
        let filename = '';

        if (reportType === 'profit-loss') {
            filename = `Profit_and_Loss_${startDate || 'custom'}_to_${endDate || 'custom'}.csv`;
            csvRows.push(`Profit & Loss Statement - Period: ${startDate || ''} to ${endDate || ''}`);
            csvRows.push('');
            csvRows.push('Account Code,Account Name,Balance (PKR)');
            csvRows.push('REVENUE');
            (reportData.revenue_lines || []).forEach(item => {
                csvRows.push(`${item.code},"${item.name}",${item.balance}`);
            });
            csvRows.push(`,Total Revenue,${reportData.total_revenue}`);
            csvRows.push('');
            csvRows.push('COST OF GOODS SOLD (COGS)');
            (reportData.cogs_lines || []).forEach(item => {
                csvRows.push(`${item.code},"${item.name}",${item.balance}`);
            });
            csvRows.push(`,Total COGS,${reportData.total_cogs}`);
            csvRows.push('');
            csvRows.push(`,GROSS PROFIT (${reportData.gross_profit_margin?.toFixed(1)}% margin),${reportData.gross_profit}`);
            csvRows.push('');
            csvRows.push('OPERATING EXPENSES');
            (reportData.expense_lines || []).forEach(item => {
                csvRows.push(`${item.code},"${item.name}",${item.balance}`);
            });
            csvRows.push(`,Total Operating Expenses,${reportData.total_expense}`);
            csvRows.push('');
            csvRows.push(`,NET PROFIT (${reportData.net_profit_margin?.toFixed(1)}% margin),${reportData.net_profit}`);
        } else {
            filename = `Balance_Sheet_${endDate || 'custom'}.csv`;
            csvRows.push(`Balance Sheet - As of Date: ${reportData.as_of_date || endDate || 'Current'}`);
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
            ) : (!reportData || (reportType === 'profit-loss' && (reportData.revenue || []).length === 0 && (reportData.expense || []).length === 0)) ? (
                <div className="empty-state-message text-center py-20 font-bold text-slate-500 bg-white rounded-2xl border border-slate-100 p-6">
                    No matching database records found for this period.
                </div>
            ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
                    {/* Report Header */}
                    <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6 print:border-b-2 print:border-slate-900">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-widest print:text-slate-500">
                            <span>Bizionary ERP Financial Reporting</span>
                            <span>Confidential - For Internal Use Only</span>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 py-1">
                            <Logo className="h-9 w-auto text-slate-800 dark:text-slate-200 print:text-slate-900" />
                            <span className="text-3xl font-black text-slate-950 dark:text-slate-50 tracking-tight uppercase print:text-slate-950">
                                Bizionary
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
                            {reportType === 'profit-loss' ? 'Profit & Loss Statement' : 'Balance Sheet'}
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {reportType === 'profit-loss' 
                                ? (reportData.start_date && reportData.end_date 
                                    ? `For the Period: ${formatDateLabel(reportData.start_date)} - ${formatDateLabel(reportData.end_date)}`
                                    : `For the Period: ${dateRange.replace(/_/g, ' ')}`) 
                                : `As of Date: ${reportData.as_of_date ? formatDateLabel(reportData.as_of_date) : 'Current'}`}
                        </p>
                    </div>

                    {reportType === 'profit-loss' ? (
                        /* ERP PROFIT & LOSS VIEW */
                        <div className="space-y-6">
                            {/* Section 1: Revenue */}
                            <div className="space-y-2">
                                <div className="bg-blue-600 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded">
                                    1. Revenue (from Sales)
                                </div>
                                <div className="border border-slate-200/60 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                                                <th className="py-2 pl-4 w-24">Code</th>
                                                <th className="py-2">Account</th>
                                                <th className="py-2 pr-4 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(reportData.revenue_lines || []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-2.5 pl-4 font-mono text-slate-500 font-semibold">{item.code}</td>
                                                    <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                                                    <td className="py-2.5 pr-4 text-right font-mono text-blue-700 font-bold">{formatPKR(item.balance)}</td>
                                                </tr>
                                            ))}
                                            <tr className="border-t-2 border-blue-200 bg-blue-50/50 font-bold">
                                                <td className="py-3 pl-4"></td>
                                                <td className="py-3 text-blue-900 uppercase">Total Revenue</td>
                                                <td className="py-3 pr-4 text-right font-mono text-blue-900 text-sm">{formatPKR(reportData.total_revenue)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Section 2: COGS */}
                            <div className="space-y-2">
                                <div className="bg-orange-500 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded">
                                    2. Cost of Goods Sold (COGS)
                                </div>
                                <div className="border border-slate-200/60 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                                                <th className="py-2 pl-4 w-24">Code</th>
                                                <th className="py-2">Account</th>
                                                <th className="py-2 pr-4 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(reportData.cogs_lines || []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-2.5 pl-4 font-mono text-slate-500 font-semibold">{item.code}</td>
                                                    <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                                                    <td className="py-2.5 pr-4 text-right font-mono text-orange-700 font-bold">{formatPKR(item.balance)}</td>
                                                </tr>
                                            ))}
                                            <tr className="border-t-2 border-orange-200 bg-orange-50/50 font-bold">
                                                <td className="py-3 pl-4"></td>
                                                <td className="py-3 text-orange-900 uppercase">Total COGS</td>
                                                <td className="py-3 pr-4 text-right font-mono text-orange-900 text-sm">{formatPKR(reportData.total_cogs)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Section 3: Gross Profit Subtotal */}
                            <div className={`rounded-xl p-4 flex justify-between items-center border-2 ${reportData.gross_profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                <div>
                                    <p className={`text-xs font-black uppercase tracking-wider ${reportData.gross_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        3. Gross Profit
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Revenue minus Cost of Goods Sold</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-black font-mono ${reportData.gross_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {formatPKR(reportData.gross_profit)}
                                    </p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reportData.gross_profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {reportData.gross_profit_margin?.toFixed(1)}% margin
                                    </span>
                                </div>
                            </div>

                            {/* Section 4: Operating Expenses */}
                            <div className="space-y-2">
                                <div className="bg-rose-600 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded">
                                    4. Operating Expenses
                                </div>
                                <div className="border border-slate-200/60 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                                                <th className="py-2 pl-4 w-24">Category</th>
                                                <th className="py-2">Expense Type</th>
                                                <th className="py-2 pr-4 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(reportData.expense_lines || []).length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="py-4 text-center text-slate-400 text-xs italic">No operating expenses recorded for this period.</td>
                                                </tr>
                                            ) : (
                                                (reportData.expense_lines || []).map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="py-2.5 pl-4 font-mono text-slate-500 font-semibold text-[10px]">{item.code}</td>
                                                        <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                                                        <td className="py-2.5 pr-4 text-right font-mono text-rose-700 font-bold">{formatPKR(item.balance)}</td>
                                                    </tr>
                                                ))
                                            )}
                                            <tr className="border-t-2 border-rose-200 bg-rose-50/50 font-bold">
                                                <td className="py-3 pl-4"></td>
                                                <td className="py-3 text-rose-900 uppercase">Total Operating Expenses</td>
                                                <td className="py-3 pr-4 text-right font-mono text-rose-900 text-sm">{formatPKR(reportData.total_expense)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Section 5: Net Profit */}
                            <div className={`rounded-xl p-5 flex justify-between items-center border-2 ${reportData.net_profit >= 0 ? 'bg-emerald-600 border-emerald-700' : 'bg-rose-600 border-rose-700'}`}>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-white/80">
                                        5. Net Profit / Loss
                                    </p>
                                    <p className="text-[10px] text-white/60 mt-0.5">Gross Profit minus Operating Expenses</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black font-mono text-white">
                                        {formatPKR(reportData.net_profit)}
                                    </p>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                                        {reportData.net_profit_margin?.toFixed(1)}% net margin
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* BALANCE SHEET VIEW */
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2">
                            {/* Left Column: Assets */}
                            <div className="space-y-4">
                                <div className="bg-[#003A6B] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded print:bg-slate-100 print:text-slate-900">
                                    Assets
                                </div>
                                <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-xs print:border-slate-300">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider print:bg-slate-50 print:text-slate-600">
                                                <th className="py-2 pl-4 w-24">Account Code</th>
                                                <th className="py-2">Account Name</th>
                                                <th className="py-2 pr-4 text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(reportData.assets || []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-2.5 pl-4 font-mono text-slate-500 font-semibold">{item.code}</td>
                                                    <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                                                    <td className="py-2.5 pr-4 text-right font-mono text-slate-900 font-bold">{formatPKR(item.balance)}</td>
                                                </tr>
                                            ))}
                                            <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/50">
                                                <td className="py-3 pl-4"></td>
                                                <td className="py-3 text-slate-950 uppercase tracking-wide">Total Assets</td>
                                                <td className="py-3 pr-4 text-right font-mono text-slate-950 text-sm border-double-bottom">{formatPKR(reportData.total_assets)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right Column: Liabilities & Equity */}
                            <div className="space-y-6">
                                {/* Liabilities Section */}
                                <div className="space-y-4">
                                    <div className="bg-[#003A6B] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded print:bg-slate-100 print:text-slate-900">
                                        Liabilities
                                    </div>
                                    <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-xs print:border-slate-300">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider print:bg-slate-50 print:text-slate-600">
                                                    <th className="py-2 pl-4 w-24">Account Code</th>
                                                    <th className="py-2">Account Name</th>
                                                    <th className="py-2 pr-4 text-right">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {(reportData.liabilities || []).map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="py-2.5 pl-4 font-mono text-slate-500 font-semibold">{item.code}</td>
                                                        <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                                                        <td className="py-2.5 pr-4 text-right font-mono text-slate-900 font-bold">{formatPKR(item.balance)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/50">
                                                    <td className="py-3 pl-4"></td>
                                                    <td className="py-3 text-slate-950 uppercase">Total Liabilities</td>
                                                    <td className="py-3 pr-4 text-right font-mono text-slate-950">{formatPKR(reportData.total_liabilities)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Equity Section */}
                                <div className="space-y-4">
                                    <div className="bg-[#003A6B] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded print:bg-slate-100 print:text-slate-900">
                                        Owner's Equity
                                    </div>
                                    <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-xs print:border-slate-300">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider print:bg-slate-50 print:text-slate-600">
                                                    <th className="py-2 pl-4 w-24">Account Code</th>
                                                    <th className="py-2">Account Name</th>
                                                    <th className="py-2 pr-4 text-right">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {(reportData.equity || []).map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="py-2.5 pl-4 font-mono text-slate-500 font-semibold">{item.code}</td>
                                                        <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                                                        <td className="py-2.5 pr-4 text-right font-mono text-slate-900 font-bold">{formatPKR(item.balance)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/50">
                                                    <td className="py-3 pl-4"></td>
                                                    <td className="py-3 text-slate-950 uppercase">Total Equity</td>
                                                    <td className="py-3 pr-4 text-right font-mono text-slate-950">{formatPKR(reportData.total_equity)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Total Liabilities & Equity Summary */}
                                <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-slate-100 text-slate-950 print:border-slate-300">
                                    <table className="w-full border-collapse text-xs font-bold">
                                        <tbody>
                                            <tr>
                                                <td className="py-3.5 pl-4 uppercase tracking-wider">Total Liabilities & Owner's Equity</td>
                                                <td className="py-3.5 pr-4 text-right font-mono text-sm border-double-bottom">
                                                    {formatPKR(reportData.total_liabilities_and_equity)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
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
