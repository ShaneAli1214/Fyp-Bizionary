import React, { useState, useEffect } from 'react';
import { Download, Printer, RefreshCw, FileText, BarChart2 } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';

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
                    <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6 print:border-b-2 print:border-slate-900">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-widest print:text-slate-500">
                            <span>Bizionary ERP Financial Reporting</span>
                            <span>Confidential - For Internal Use Only</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight uppercase">
                            [ Bizionary Company ]
                        </h1>
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
                        /* PROFIT & LOSS VIEW */
                        <div className="space-y-8">
                            {/* Revenues Section */}
                            <div className="space-y-3">
                                <div className="bg-slate-100 text-slate-800 px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded print:bg-slate-100 print:text-slate-900">
                                    1. Revenue / Income
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
                                            {(reportData.revenue || []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-2.5 pl-4 font-mono text-slate-500 font-semibold">{item.code}</td>
                                                    <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                                                    <td className="py-2.5 pr-4 text-right font-mono text-slate-900 font-bold">{formatPKR(item.balance)}</td>
                                                </tr>
                                            ))}
                                            <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/50">
                                                <td className="py-3 pl-4"></td>
                                                <td className="py-3 text-slate-900 uppercase">Total Income / Revenue</td>
                                                <td className="py-3 pr-4 text-right font-mono text-slate-950 text-sm">{formatPKR(reportData.total_revenue)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Expenses Section */}
                            <div className="space-y-3">
                                <div className="bg-slate-100 text-slate-800 px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded print:bg-slate-100 print:text-slate-900">
                                    2. Operating & Cost Expenses
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
                                            {(reportData.expense || []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-2.5 pl-4 font-mono text-slate-500 font-semibold">{item.code}</td>
                                                    <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                                                    <td className="py-2.5 pr-4 text-right font-mono text-slate-900 font-bold">{formatPKR(item.balance)}</td>
                                                </tr>
                                            ))}
                                            <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/50">
                                                <td className="py-3 pl-4"></td>
                                                <td className="py-3 text-slate-900 uppercase">Total Expenses</td>
                                                <td className="py-3 pr-4 text-right font-mono text-slate-950 text-sm">{formatPKR(reportData.total_expense)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Net Profit Summary Row */}
                            <div className="pt-4 border-t border-slate-200 print:pt-3">
                                <table className="w-full border-collapse text-xs">
                                    <tbody>
                                        <tr className="font-bold bg-slate-100/80 text-slate-950">
                                            <td className="py-3.5 pl-4 uppercase tracking-wider text-sm">Net Profit / (Loss)</td>
                                            <td className="py-3.5 pr-4 text-right font-mono text-lg border-double-bottom">
                                                <span className={reportData.net_profit >= 0 ? 'text-emerald-700 print:text-emerald-800' : 'text-rose-700 print:text-rose-800'}>
                                                    {formatPKR(reportData.net_profit)}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
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
