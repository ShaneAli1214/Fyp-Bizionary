import React, { useState, useMemo } from 'react';
import { Edit2, Calendar, FileText, Ban, ChevronRight, ChevronDown } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';
import VoidModal from './VoidModal';

const RevenuesTab = ({ revenues = [], onEdit, triggerRefresh }) => {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [voidTargetId, setVoidTargetId] = useState(null);
    const [expandedMonths, setExpandedMonths] = useState({});

    // Group revenues by Year-Month
    const groupedRevenues = useMemo(() => {
        const groups = {};
        revenues.forEach(item => {
            if (!item.date) return;
            const dateObj = new Date(item.date);
            if (isNaN(dateObj.getTime())) return;
            
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const groupKey = `${year}-${month}`;
            
            if (!groups[groupKey]) {
                const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                groups[groupKey] = {
                    key: groupKey,
                    monthLabel,
                    totalAmount: 0,
                    items: []
                };
            }
            
            groups[groupKey].items.push(item);
            if (!item.voided) {
                groups[groupKey].totalAmount += Number(item.amount || 0);
            }
        });
        
        // Return months sorted descending
        return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
    }, [revenues]);

    const paginatedGroups = useMemo(() => {
        const start = (page - 1) * pageSize;
        return groupedRevenues.slice(start, start + pageSize);
    }, [groupedRevenues, page]);

    const numPages = Math.ceil(groupedRevenues.length / pageSize);

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

    const toggleMonth = (key) => {
        setExpandedMonths(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const getCategoryDisplay = (cat) => {
        if (cat === 'SALES_REVENUE' || cat === 'Sales') return 'Sales Revenue';
        if (cat === 'SERVICE_INCOME' || cat === 'Revenue') return 'Service Income';
        return 'Other Income';
    };

    const getStatusBadge = (status) => {
        const s = String(status).toUpperCase();
        if (s === 'PAID') {
            return (
                <span className="bg-status-success/10 text-status-success border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                    Paid
                </span>
            );
        }
        if (s === 'PENDING') {
            return (
                <span className="bg-amber-50 text-status-info border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                    Pending
                </span>
            );
        }
        return (
            <span className="bg-rose-50 text-danger border border-rose-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                Overdue
            </span>
        );
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
            <div className="bg-card rounded-2xl border border-border-card shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border-card bg-page/30">
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-r border-border-card/30">Date / Month</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-r border-border-card/30">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-r border-border-card/30">Invoice #</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-r border-border-card/30">Category</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-r border-border-card/30">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right border-r border-border-card/30">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-card">
                            {paginatedGroups.map((group) => {
                                const isExpanded = !!expandedMonths[group.key];
                                return (
                                    <React.Fragment key={group.key}>
                                        {/* Month Summary Header Row */}
                                        <tr 
                                            onClick={() => toggleMonth(group.key)}
                                            className="bg-page/40 hover:bg-page/60 cursor-pointer font-bold border-b border-border-card select-none group"
                                        >
                                            <td className="px-6 py-4 text-sm text-primary border-r border-border-card/25">
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-secondary shrink-0 transition-all group-hover:scale-110" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-secondary shrink-0 transition-all group-hover:scale-110" />
                                                    )}
                                                    <span>{group.monthLabel}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-secondary border-r border-border-card/25 font-semibold">
                                                {group.items.length} {group.items.length === 1 ? 'record' : 'records'}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-secondary border-r border-border-card/25 font-normal italic">
                                                Monthly Rollup Sheet
                                            </td>
                                            <td className="px-6 py-4 border-r border-border-card/25"></td>
                                            <td className="px-6 py-4 border-r border-border-card/25"></td>
                                            <td className="px-6 py-4 text-right font-bold text-primary border-r border-border-card/25">
                                                {formatPKR(group.totalAmount)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-secondary">
                                                {isExpanded ? 'Click to Collapse' : 'Click to Expand'}
                                            </td>
                                        </tr>

                                        {/* Child Details Rows */}
                                        {isExpanded && group.items.map((item) => (
                                            <tr key={item.id} className={`hover:bg-page/20 transition-colors group ${item.voided ? 'bg-page/50 opacity-60' : ''}`}>
                                                <td className="px-8 py-3.5 text-sm font-medium text-textMain border-r border-border-card/20 pl-10">
                                                    <div className="flex items-center gap-1.5 border-l-2 border-primary/40 pl-2">
                                                        <Calendar className="w-4 h-4 text-secondary" />
                                                        {item.date}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-sm font-bold text-textMain border-r border-border-card/20" title={item.customer || 'General Customer'}>
                                                    <div className="truncate max-w-[180px]">
                                                        {item.customer || 'General Customer'}
                                                    </div>
                                                    {item.voided && <span className="ml-2 text-[10px] font-bold text-text-secondary uppercase">Voided</span>}
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-secondary border-r border-border-card/20" title={item.invoice_number}>
                                                    {item.invoice_number ? (
                                                        <div className="flex items-center gap-1">
                                                            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                                            <span className="truncate max-w-[150px]">
                                                                {item.invoice_number}
                                                            </span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-secondary border-r border-border-card/20">{getCategoryDisplay(item.category)}</td>
                                                <td className="px-6 py-3.5 border-r border-border-card/20">
                                                    {item.voided ? (
                                                        <span className="text-xs font-bold text-secondary bg-page px-2.5 py-1 rounded uppercase">Voided</span>
                                                    ) : !!item.source ? (
                                                        getStatusBadge(item.payment_status)
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
                                                <td className="px-6 py-3.5 text-right border-r border-border-card/20">
                                                    <span className={`text-sm font-bold ${item.voided ? 'text-text-secondary line-through' : 'text-status-success'}`}>
                                                        {formatPKR(item.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-right space-x-2">
                                                    {!item.voided && !item.source && (
                                                        <>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                                                className="p-1.5 text-text-secondary hover:text-text-primary rounded-xl transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleVoidClick(item.id); }}
                                                                className="p-1.5 text-text-secondary hover:text-text-primary rounded-xl transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                                title="Void"
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {!item.voided && !!item.source && (
                                                        <span className="text-xs text-textMuted italic font-medium">Synced</span>
                                                    )}
                                                    {item.voided && (
                                                        <span className="text-xs text-textMuted italic font-medium" title={item.void_reason}>
                                                            Reason: {item.void_reason}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {numPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-card bg-page/50">
                        <span className="text-xs text-secondary font-semibold">
                            Showing page {page} of {numPages} ({groupedRevenues.length} months)
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
