import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, CheckCircle2, Calendar, CreditCard, FileText } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';
import ConfirmModal from '../../../components/ui/ConfirmModal';

const OperatingCostsTab = ({ onEdit, triggerRefresh, startDate, endDate, refreshTrigger }) => {
    const [costs, setCosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const pageSize = 10;

    const fetchCosts = async () => {
        try {
            setLoading(true);
            setError(null);
            const startStr = startDate ? startDate.split('T')[0] : '';
            const endStr = endDate ? endDate.split('T')[0] : '';
            const res = await accountsApi.getRecurringCosts('custom', startStr, endStr, page);
            
            if (res.data?.success) {
                setCosts(res.data.data || []);
            } else if (Array.isArray(res.data)) {
                setCosts(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch operating costs:', err);
            setError(err.message || 'Failed to fetch operating costs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCosts();
    }, [page, startDate, endDate, refreshTrigger]);

    const handleMarkAsPaid = async (id, originalRecord) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const updatedRecord = {
                ...originalRecord,
                status: 'PAID',
                payment_date: today
            };
            await accountsApi.updateRecurringCost(id, updatedRecord);
            triggerRefresh();
            fetchCosts();
        } catch (err) {
            console.error('Failed to mark operating cost as paid:', err);
            alert('Failed to update cost status: ' + (err.response?.data?.error || err.message));
        }
    };

    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

    const handleDelete = async (id) => {
        try {
            await accountsApi.deleteRecurringCost(id);
            triggerRefresh();
            fetchCosts();
        } catch (err) {
            console.error('Failed to delete operating cost:', err);
            alert('Failed to delete record: ' + (err.response?.data?.error || err.message));
        }
    };

    const getCostTypeDisplay = (type) => {
        if (type === 'RENT') return 'Rent';
        if (type === 'SUBSCRIPTION') return 'Subscription';
        if (type === 'MARKETING_CAMPAIGN') return 'Marketing Campaign';
        if (type === 'MAINTENANCE') return 'Maintenance';
        if (type === 'INSURANCE') return 'Insurance';
        return 'Other';
    };

    const getPaymentMethodDisplay = (pm) => {
        if (pm === 'BANK_TRANSFER') return 'Bank Transfer';
        if (pm === 'CREDIT_CARD') return 'Credit Card';
        return 'Cash';
    };

    const filteredCosts = useMemo(() => {
        if (!searchQuery.trim()) return costs;
        const q = searchQuery.toLowerCase();
        return costs.filter(item => {
            const name = item.name || '';
            const costType = getCostTypeDisplay(item.cost_type);
            const notes = item.notes || '';
            return name.toLowerCase().includes(q) || costType.toLowerCase().includes(q) || notes.toLowerCase().includes(q);
        });
    }, [costs, searchQuery]);

    const paginatedCosts = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredCosts.slice(start, start + pageSize);
    }, [filteredCosts, page]);

    const numPages = Math.ceil(filteredCosts.length / pageSize);

    if (loading && costs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card rounded-2xl border border-card shadow-sm">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-secondary font-bold">Loading operating costs...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-status-info/10 border border-rose-100 text-status-info p-6 rounded-2xl text-center py-10 font-bold">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search filter bar */}
            <div className="flex justify-between items-center bg-card p-3 rounded-2xl border border-card shadow-sm gap-4">
                <input
                    type="text"
                    placeholder="Search by name, type, or notes..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                    className="flex-1 max-w-md px-4 py-2 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
            </div>

            {filteredCosts.length === 0 ? (
                <div className="empty-state-message text-center py-20 font-bold text-secondary bg-card rounded-2xl border border-card p-6">
                    No matching operating costs found.
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-card shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-page border-b border-card">
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Type / Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Due / Pay Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Method</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Notes</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedCosts.map((item) => (
                                    <tr key={item.id} className="hover:bg-page/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-textMain">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold">{item.name}</span>
                                                <span className="text-xs text-textMuted font-medium">
                                                    Type: {getCostTypeDisplay(item.cost_type)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-xs flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-secondary" />
                                                    Due: {item.due_date}
                                                </span>
                                                {item.payment_date && (
                                                    <span className="text-[10px] text-status-success font-bold pl-5">
                                                        Paid: {item.payment_date}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5 text-secondary" />
                                                {getPaymentMethodDisplay(item.payment_method)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">
                                            <div className="truncate max-w-xs text-xs text-textMuted" title={item.notes}>
                                                {item.notes || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {item.status === 'PAID' ? (
                                                <span className="bg-status-success/10 text-status-success border border-emerald-100 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Paid</span>
                                            ) : (
                                                <span className="bg-amber-50 text-status-info border border-amber-100 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Unpaid</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold bg-status-info/10 text-status-info px-2 py-1 rounded inline-block">
                                                {formatPKR(item.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-1.5">
                                            {item.status !== 'PAID' && (
                                                <button
                                                    onClick={() => handleMarkAsPaid(item.id, item)}
                                                    className="p-1.5 text-secondary hover:text-status-success hover:bg-status-success/10 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                    title="Mark as Paid"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onEdit(item)}
                                                className="p-1.5 text-secondary hover:text-primary hover:bg-sky-50 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ open: true, id: item.id })}
                                                className="p-1.5 text-secondary hover:text-status-info hover:bg-status-info/10 rounded-xl transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {numPages > 1 && (
                        <div className="flex justify-between items-center px-6 py-4 border-t border-card bg-page/50">
                            <span className="text-xs text-secondary font-semibold">
                                Showing page {page} of {numPages} ({filteredCosts.length} records)
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
                </div>
            )}
            <ConfirmModal
                isOpen={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                onConfirm={() => handleDelete(confirmDelete.id)}
                title="Delete Operating Cost?"
                message="This will permanently remove this operating cost record. This cannot be undone."
                confirmLabel="Delete Record"
            />
        </div>
    );
};

export default OperatingCostsTab;
