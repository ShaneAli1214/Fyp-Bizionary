import React, { useState, useMemo } from 'react';
import { Edit2, Calendar, FileText, Ban } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';
import VoidModal from './VoidModal';

const RevenuesTab = ({ revenues = [], onEdit, triggerRefresh }) => {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [voidTargetId, setVoidTargetId] = useState(null);

    const paginatedRevenues = useMemo(() => {
        const start = (page - 1) * pageSize;
        return revenues.slice(start, start + pageSize);
    }, [revenues, page]);

    const numPages = Math.ceil(revenues.length / pageSize);

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
        if (cat === 'SALES_REVENUE' || cat === 'Sales') return 'Sales Revenue';
        if (cat === 'SERVICE_INCOME' || cat === 'Revenue') return 'Service Income';
        return 'Other Income';
    };

    if (revenues.length === 0) {
        return (
            <div className="empty-state-message text-center py-20 font-bold text-secondary bg-card rounded-2xl border border-card p-6">
                No matching database records found for this period.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ERP Note Banner */}
            <div className="flex items-start gap-3 bg-surface border border-accent rounded-2xl px-4 py-3">
                <div className="mt-0.5 w-4 h-4 text-accent shrink-0">ℹ</div>
                <div>
                    <p className="text-xs font-bold text-text-primary">Revenue KPIs are computed from Sales transactions</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                        The Revenue, COGS, Gross Profit, and Net Profit cards above are calculated dynamically from the <strong>Sales</strong> module.
                        This table shows manually recorded <strong>Revenue entries</strong> (e.g. service income, other income). Add a record here only for non-sale income sources.
                    </p>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border-card shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border-card">
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-card">
                            {paginatedRevenues.map((item) => (
                                <tr key={item.id} className={`hover:bg-page/50 transition-colors group ${item.voided ? 'bg-page/50 opacity-60' : ''}`}>
                                    <td className="px-6 py-4 text-sm font-medium text-textMain">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-secondary" />
                                            {item.date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-textMain">
                                        {item.customer || 'General Customer'}
                                        {item.voided && <span className="ml-2 text-[10px] font-bold text-text-secondary uppercase">Voided</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-secondary">
                                        {item.invoice_number ? (
                                            <div className="flex items-center gap-1">
                                                <FileText className="w-3.5 h-3.5 text-primary" />
                                                {item.invoice_number}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-secondary">{getCategoryDisplay(item.category)}</td>
                                    <td className="px-6 py-4">
                                        {item.voided ? (
                                            <span className="text-xs font-bold text-secondary bg-page px-2.5 py-1 rounded uppercase">Voided</span>
                                        ) : (
                                            <select
                                                value={item.payment_status}
                                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                className="text-xs font-bold bg-page hover:bg-page border border-card rounded px-2.5 py-1 text-primary outline-none cursor-pointer transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                                            >
                                                <option value="PAID">Paid</option>
                                                <option value="PENDING">Pending</option>
                                                <option value="OVERDUE">Overdue</option>
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-sm font-bold ${item.voided ? 'text-text-secondary line-through' : 'text-status-success'}`}>
                                            {formatPKR(item.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {!item.voided && (
                                            <>
                                                <button
                                                    onClick={() => onEdit(item)}
                                                    className="p-1.5 text-text-secondary hover:text-text-primary rounded-xl transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleVoidClick(item.id)}
                                                    className="p-1.5 text-text-secondary hover:text-text-primary rounded-xl transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
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
                            Showing page {page} of {numPages} ({revenues.length} records)
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(prev => prev - 1)}
                                className="px-3 py-1.5 text-xs font-bold bg-card border border-card rounded-full text-primary hover:bg-page disabled:opacity-50 transition-all cursor-pointer"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= numPages}
                                onClick={() => setPage(prev => prev + 1)}
                                className="px-3 py-1.5 text-xs font-bold bg-card border border-card rounded-full text-primary hover:bg-page disabled:opacity-50 transition-all cursor-pointer"
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
            </div>
        </div>
    );
};

export default RevenuesTab;
