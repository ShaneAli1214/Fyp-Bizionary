import React, { useState, useMemo } from 'react';
import { Edit2, Tag, Store, Calendar, CreditCard, Receipt, Ban } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';
import VoidModal from './VoidModal';

const ExpensesTab = ({ expenses = [], onEdit, triggerRefresh }) => {
    const [page, setPage] = useState(1);
    const pageSize = 10;
    
    // Void Modal State
    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [voidTargetId, setVoidTargetId] = useState(null);

    const paginatedExpenses = useMemo(() => {
        const start = (page - 1) * pageSize;
        return expenses.slice(start, start + pageSize);
    }, [expenses, page]);

    const numPages = Math.ceil(expenses.length / pageSize);

    const handleVoidClick = (id) => {
        setVoidTargetId(id);
        setIsVoidModalOpen(true);
    };

    const handleVoidSubmit = async (reason) => {
        await accountsApi.voidExpense(voidTargetId, reason);
        triggerRefresh();
    };

    const getPaymentMethodDisplay = (pm) => {
        if (pm === 'BANK_TRANSFER') return 'Bank Transfer';
        if (pm === 'CREDIT_CARD') return 'Credit Card';
        return 'Cash';
    };

    if (expenses.length === 0) {
        return (
            <div className="empty-state-message text-center py-20 font-bold text-slate-500 bg-white rounded-2xl border border-slate-100 p-6">
                No matching database records found for this period.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Description</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Method</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Tax Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Total Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Receipt</th>
                            <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedExpenses.map((item) => (
                            <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${item.voided ? 'bg-slate-50/50 opacity-60' : ''}`}>
                                <td className="px-6 py-4 text-sm font-medium text-textMain">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        {item.date}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-textMain">
                                    <div className="flex items-center gap-1.5">
                                        <Store className="w-4 h-4 text-gray-400" />
                                        {item.vendor || 'N/A'}
                                    </div>
                                    {item.voided && <span className="ml-2 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Voided</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                                        {item.category_display || item.category}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="truncate max-w-xs text-xs text-textMuted" title={item.description}>
                                        {item.description || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                        {getPaymentMethodDisplay(item.payment_method)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-gray-500">
                                    {item.tax_amount > 0 ? formatPKR(item.tax_amount) : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-sm font-bold bg-rose-50 px-2 py-1 rounded inline-block ${item.voided ? 'text-gray-500 line-through bg-gray-100' : 'text-rose-600'}`}>
                                        {formatPKR(item.amount)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {item.receipt ? (
                                        <a 
                                            href={item.receipt} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primaryDark hover:underline font-bold"
                                        >
                                            <Receipt className="w-4 h-4" />
                                            View Receipt
                                        </a>
                                    ) : '-'}
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
                        ))}
                    </tbody>
                </table>
            </div>

            {numPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-slate-50/50">
                    <span className="text-xs text-gray-500 font-semibold">
                        Showing page {page} of {numPages} ({expenses.length} records)
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(prev => prev - 1)}
                            className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= numPages}
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
                recordType="expenses" 
            />
        </div>
    );
};

export default ExpensesTab;
