import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, CheckCircle2, Calendar, CreditCard, Receipt, FileText } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';

const UtilityBillsTab = ({ onEdit, triggerRefresh, startDate, endDate, refreshTrigger }) => {
    const [utilities, setUtilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const pageSize = 10;

    const fetchUtilities = async () => {
        try {
            setLoading(true);
            setError(null);
            const startStr = startDate ? startDate.split('T')[0] : '';
            const endStr = endDate ? endDate.split('T')[0] : '';
            const res = await accountsApi.getUtilities('custom', startStr, endStr, page);
            
            if (res.data?.success) {
                setUtilities(res.data.data || []);
            } else if (Array.isArray(res.data)) {
                setUtilities(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch utility bills:', err);
            setError(err.message || 'Failed to fetch utility bills.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUtilities();
    }, [page, startDate, endDate, refreshTrigger]);

    const handleMarkAsPaid = async (id, originalRecord) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const updatedRecord = {
                ...originalRecord,
                status: 'PAID',
                payment_date: today
            };
            await accountsApi.updateUtility(id, updatedRecord);
            triggerRefresh();
            fetchUtilities();
        } catch (err) {
            console.error('Failed to mark utility bill as paid:', err);
            alert('Failed to update utility status: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this utility bill?')) {
            try {
                await accountsApi.deleteUtility(id);
                triggerRefresh();
                fetchUtilities();
            } catch (err) {
                console.error('Failed to delete utility bill:', err);
                alert('Failed to delete record: ' + (err.response?.data?.error || err.message));
            }
        }
    };

    const getUtilityTypeDisplay = (type) => {
        if (type === 'ELECTRICITY') return 'Electricity';
        if (type === 'WATER') return 'Water';
        if (type === 'GAS') return 'Gas';
        if (type === 'INTERNET') return 'Internet';
        return 'Other';
    };

    const getPaymentMethodDisplay = (pm) => {
        if (pm === 'BANK_TRANSFER') return 'Bank Transfer';
        if (pm === 'CREDIT_CARD') return 'Credit Card';
        return 'Cash';
    };

    const filteredUtilities = useMemo(() => {
        if (!searchQuery.trim()) return utilities;
        const q = searchQuery.toLowerCase();
        return utilities.filter(item => {
            const billNum = item.bill_number || '';
            const utilType = getUtilityTypeDisplay(item.utility_type);
            const notes = item.notes || '';
            return billNum.toLowerCase().includes(q) || utilType.toLowerCase().includes(q) || notes.toLowerCase().includes(q);
        });
    }, [utilities, searchQuery]);

    const paginatedUtilities = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredUtilities.slice(start, start + pageSize);
    }, [filteredUtilities, page]);

    const numPages = Math.ceil(filteredUtilities.length / pageSize);

    if (loading && utilities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card rounded-xl border border-card shadow-sm">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-secondary font-bold">Loading utilities...</p>
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
                    placeholder="Search by bill number, type, or notes..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                    className="flex-1 max-w-md px-4 py-2 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
            </div>

            {filteredUtilities.length === 0 ? (
                <div className="empty-state-message text-center py-20 font-bold text-secondary bg-card rounded-2xl border border-card p-6">
                    No matching utility bills found.
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-card shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-page border-b border-card">
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Type / Bill #</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Billing Period</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Due / Pay Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Method</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Tax</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Total Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Receipt</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedUtilities.map((item) => (
                                    <tr key={item.id} className="hover:bg-page/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-textMain">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold">{getUtilityTypeDisplay(item.utility_type)}</span>
                                                <span className="text-xs text-textMuted font-mono">
                                                    #{item.bill_number}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <Calendar className="w-3.5 h-3.5 text-secondary" />
                                                {item.billing_period_start} to {item.billing_period_end}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-xs">Due: {item.due_date}</span>
                                                {item.payment_date && (
                                                    <span className="text-[10px] text-status-success font-bold">
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
                                        <td className="px-6 py-4 text-center">
                                            {item.status === 'PAID' ? (
                                                <span className="bg-status-success/10 text-status-success border border-emerald-100 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Paid</span>
                                            ) : item.status === 'OVERDUE' ? (
                                                <span className="bg-status-info/10 text-status-info border border-rose-100 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Overdue</span>
                                            ) : (
                                                <span className="bg-amber-50 text-status-info border border-amber-100 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Unpaid</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right text-secondary">
                                            {item.tax_amount > 0 ? formatPKR(item.tax_amount) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold bg-status-info/10 text-status-info px-2 py-1 rounded inline-block">
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
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 text-secondary hover:text-status-info hover:bg-status-info/10 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
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
                                Showing page {page} of {numPages} ({filteredUtilities.length} records)
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
        </div>
    );
};

export default UtilityBillsTab;
