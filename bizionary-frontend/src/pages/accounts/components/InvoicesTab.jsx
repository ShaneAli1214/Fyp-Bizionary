import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Calendar, FileText, User, Ban } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';
import VoidModal from './VoidModal';

const InvoicesTab = ({ refreshTrigger, onEdit, triggerRefresh, dateRange }) => {
    const [invoices, setInvoices] = useState([]);
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

        const fetchInvoices = async () => {
            try {
                setLoading(true);
                const res = await accountsApi.getInvoices(dateRange, page);
                if (res.data?.success) {
                    setInvoices(res.data.data);
                    setPagination(res.data.pagination);
                }
            } catch (error) {
                console.warn('Failed to fetch invoices.');
                setInvoices([]);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [refreshTrigger, dateRange, page]);

    const handleVoidClick = (id) => {
        setVoidTargetId(id);
        setIsVoidModalOpen(true);
    };

    const handleVoidSubmit = async (reason) => {
        await accountsApi.voidInvoice(voidTargetId, reason);
        triggerRefresh();
    };

    const getStatusColor = (status, voided) => {
        if (voided || status === 'CANCELLED') return 'text-gray-700 bg-gray-100';
        switch (status) {
            case 'PAID': return 'text-emerald-700 bg-emerald-100';
            case 'UNPAID': return 'text-amber-700 bg-amber-100';
            case 'OVERDUE': return 'text-rose-700 bg-rose-100';
            default: return 'text-gray-700 bg-gray-100';
        }
    };

    if (loading) return <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Invoice #</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Balance Due</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Total Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Aging (Days)</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-8 text-center text-textMuted text-sm">No invoice records found.</td>
                            </tr>
                        ) : (
                            invoices.map((item) => (
                                <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${item.voided ? 'bg-slate-50/50 opacity-60' : ''}`}>
                                    <td className="px-6 py-4 text-sm font-medium text-primary">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <FileText className="w-4 h-4 text-primary/70" />
                                            {item.invoice_number}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-textMain">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-gray-400" />
                                            {item.client_name}
                                        </div>
                                        {item.voided && <span className="ml-2 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Voided</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {item.due_date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide inline-block ${getStatusColor(item.status, item.voided)}`}>
                                            {item.voided ? 'Voided' : (item.status_display || item.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                                        {formatPKR(item.balance_due)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-sm font-bold inline-block ${item.voided ? 'text-gray-400 line-through bg-gray-50' : 'text-slate-900'}`}>
                                            {formatPKR(item.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.aging > 0 ? (
                                            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                                {item.aging} days
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500 font-medium">-</span>
                                        )}
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
                recordType="invoices" 
            />
        </div>
    );
};

export default InvoicesTab;

