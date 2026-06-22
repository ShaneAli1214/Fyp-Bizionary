import React, { useState, useMemo } from 'react';
import { Edit2, Calendar, FileText, User, Ban } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';
import VoidModal from './VoidModal';

const InvoicesTab = ({ invoices = [], onEdit, triggerRefresh }) => {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Void Modal State
    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [voidTargetId, setVoidTargetId] = useState(null);

    const paginatedInvoices = useMemo(() => {
        const start = (page - 1) * pageSize;
        return invoices.slice(start, start + pageSize);
    }, [invoices, page]);

    const numPages = Math.ceil(invoices.length / pageSize);

    const handleVoidClick = (id) => {
        setVoidTargetId(id);
        setIsVoidModalOpen(true);
    };

    const handleVoidSubmit = async (reason) => {
        await accountsApi.voidInvoice(voidTargetId, reason);
        triggerRefresh();
    };

    const getStatusColor = (status, voided) => {
        if (voided || status === 'CANCELLED') return 'text-primary bg-page';
        switch (status) {
            case 'PAID': return 'text-status-success bg-status-success/20';
            case 'UNPAID': return 'text-status-info bg-status-info/20';
            case 'OVERDUE': return 'text-status-info bg-status-info/20';
            default: return 'text-primary bg-page';
        }
    };

    if (invoices.length === 0) {
        return (
            <div className="empty-state-message text-center py-20 font-bold text-secondary bg-card rounded-2xl border border-card p-6">
                No matching database records found for this period.
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border border-card shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-page border-b border-card">
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
                        {paginatedInvoices.map((item) => (
                            <tr key={item.id} className={`hover:bg-page/50 transition-colors group ${item.voided ? 'bg-page/50 opacity-60' : ''}`}>
                                <td className="px-6 py-4 text-sm font-medium text-primary">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <FileText className="w-4 h-4 text-primary/70" />
                                        {item.invoice_number}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-textMain">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-secondary" />
                                        {item.client_name}
                                    </div>
                                    {item.voided && <span className="ml-2 bg-status-info/20 text-status-info text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Voided</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-secondary">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-secondary" />
                                        {item.due_date}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide inline-block ${getStatusColor(item.status, item.voided)}`}>
                                        {item.voided ? 'Voided' : (item.status_display || item.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-semibold text-primary">
                                    {formatPKR(item.balance_due)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-sm font-bold inline-block ${item.voided ? 'text-secondary line-through bg-page' : 'text-primary'}`}>
                                        {formatPKR(item.amount)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {item.aging > 0 ? (
                                        <span className="text-xs font-bold text-status-info bg-status-info/10 px-2 py-0.5 rounded-full">
                                            {item.aging} days
                                        </span>
                                    ) : (
                                        <span className="text-xs text-secondary font-medium">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {!item.voided && (
                                        <>
                                            <button 
                                                onClick={() => onEdit(item)}
                                                className="p-1.5 text-secondary hover:text-primary hover:bg-sky-50 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleVoidClick(item.id)}
                                                className="p-1.5 text-secondary hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
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
                        ))}
                    </tbody>
                </table>
            </div>

            {numPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 border-t border-card bg-page/50">
                    <span className="text-xs text-secondary font-semibold">
                        Showing page {page} of {numPages} ({invoices.length} records)
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(prev => prev - 1)}
                            className="px-3 py-1.5 text-xs font-bold bg-card border border-card rounded-lg text-primary hover:bg-page disabled:opacity-50 transition-all cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= numPages}
                            onClick={() => setPage(prev => prev + 1)}
                            className="px-3 py-1.5 text-xs font-bold bg-card border border-card rounded-lg text-primary hover:bg-page disabled:opacity-50 transition-all cursor-pointer"
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
