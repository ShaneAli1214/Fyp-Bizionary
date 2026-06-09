import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, Calendar, FileText, Ban } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';
import VoidModal from './VoidModal';

const RevenuesTab = ({ refreshTrigger, onEdit, triggerRefresh, dateRange }) => {
    const [revenues, setRevenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const prevDateRangeRef = useRef(dateRange);
    
    // Void Modal State
    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [voidTargetId, setVoidTargetId] = useState(null);

    useEffect(() => {
        if (prevDateRangeRef.current !== dateRange) {
            prevDateRangeRef.current = dateRange;
            if (page !== 1) {
                setPage(1);
                return;
            }
        }

        const fetchRevenues = async () => {
            try {
                setLoading(true);
                const res = await accountsApi.getRevenues(dateRange, page);
                if (res.data?.success) {
                    setRevenues(res.data.data);
                    setPagination(res.data.pagination);
                }
            } catch (error) {
                console.warn('Failed to fetch revenues.');
                setRevenues([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRevenues();
    }, [refreshTrigger, dateRange, page]);

    const handleStatusChange = async (id, newStatus) => {
        try {
            const item = revenues.find(r => r.id === id);
            if (item) {
                await accountsApi.updateRevenue(id, {
                    ...item,
                    payment_status: newStatus
                });
                triggerRefresh();
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleVoidClick = (id) => {
        setVoidTargetId(id);
        setIsVoidModalOpen(true);
    };

    const handleVoidSubmit = async (reason) => {
        await accountsApi.voidRevenue(voidTargetId, reason);
        triggerRefresh();
    };

    const getCategoryDisplay = (cat) => {
        if (cat === 'SALES_REVENUE') return 'Sales Revenue';
        if (cat === 'SERVICE_INCOME') return 'Service Income';
        return 'Other Income';
    };

    if (loading) return <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;

    return (
        <div className="space-y-4">
            {/* ERP Note Banner */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="mt-0.5 w-4 h-4 text-blue-600 shrink-0">ℹ</div>
                <div>
                    <p className="text-xs font-bold text-blue-900">Revenue KPIs are computed from Sales transactions</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                        The Revenue, COGS, Gross Profit, and Net Profit cards above are calculated dynamically from the <strong>Sales</strong> module.
                        This table shows manually recorded <strong>Revenue entries</strong> (e.g. service income, other income). Add a record here only for non-sale income sources.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Invoice #</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {revenues.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-textMuted text-sm">No revenue records found.</td>
                            </tr>
                        ) : (
                            revenues.map((item) => (
                                <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${item.voided ? 'bg-slate-50/50 opacity-60' : ''}`}>
                                    <td className="px-6 py-4 text-sm font-medium text-textMain">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {item.date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-textMain">
                                        {item.customer}
                                        {item.voided && <span className="ml-2 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Voided</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {item.invoice_number ? (
                                            <div className="flex items-center gap-1">
                                                <FileText className="w-3.5 h-3.5 text-primary" />
                                                {item.invoice_number}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{getCategoryDisplay(item.category)}</td>
                                    <td className="px-6 py-4">
                                        {item.voided ? (
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded uppercase">Voided</span>
                                        ) : (
                                            <select 
                                                value={item.payment_status}
                                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                className="text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded px-2.5 py-1 text-slate-700 outline-none cursor-pointer transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                                            >
                                                <option value="PAID">Paid</option>
                                                <option value="PENDING">Pending</option>
                                                <option value="OVERDUE">Overdue</option>
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-sm font-bold bg-emerald-50 px-2 py-1 rounded inline-block ${item.voided ? 'text-gray-500 line-through bg-gray-100' : 'text-emerald-600'}`}>
                                            {formatPKR(item.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {!item.voided && (
                                            <>
                                                <button 
                                                    onClick={() => onEdit(item)}
                                                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-sky-50 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleVoidClick(item.id)}
                                                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                    title="Void"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {item.voided && (
                                            <span className="text-xs text-textMuted italic font-medium" title={item.void_reason}>
                                                Reason: {item.void_reason}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && pagination.num_pages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-slate-50/50">
                    <span className="text-xs text-gray-500 font-semibold">
                        Showing page {pagination.current_page} of {pagination.num_pages} ({pagination.count} records)
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={pagination.current_page <= 1}
                            onClick={() => setPage(prev => prev - 1)}
                            className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            disabled={pagination.current_page >= pagination.num_pages}
                            onClick={() => setPage(prev => prev + 1)}
                            className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <VoidModal 
                isOpen={isVoidModalOpen} 
                onClose={() => setIsVoidModalOpen(false)} 
                onSubmit={handleVoidSubmit} 
                recordType="revenues" 
            />
            </div>{/* end inner white card */}
        </div>
    );
};

export default RevenuesTab;

