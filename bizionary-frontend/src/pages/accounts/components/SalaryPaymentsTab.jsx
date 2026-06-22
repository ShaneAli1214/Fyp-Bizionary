import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, CheckCircle2, User, Calendar, CreditCard, FileText } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';

const SalaryPaymentsTab = ({ onEdit, triggerRefresh, startDate, endDate, refreshTrigger }) => {
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const pageSize = 10;

    const fetchSalaries = async () => {
        try {
            setLoading(true);
            setError(null);
            const startStr = startDate ? startDate.split('T')[0] : '';
            const endStr = endDate ? endDate.split('T')[0] : '';
            const res = await accountsApi.getSalaries('custom', startStr, endStr, page);
            
            if (res.data?.success) {
                setSalaries(res.data.data || []);
            } else if (Array.isArray(res.data)) {
                setSalaries(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch salaries list:', err);
            setError(err.message || 'Failed to fetch salaries list.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaries();
    }, [page, startDate, endDate, refreshTrigger]);

    const handleMarkAsPaid = async (id, originalRecord) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const updatedRecord = {
                ...originalRecord,
                employee: originalRecord.employee?.id || originalRecord.employee,
                status: 'PAID',
                payment_date: today
            };
            await accountsApi.updateSalary(id, updatedRecord);
            triggerRefresh();
            fetchSalaries();
        } catch (err) {
            console.error('Failed to mark salary as paid:', err);
            alert('Failed to update payment status: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this salary record?')) {
            try {
                await accountsApi.deleteSalary(id);
                triggerRefresh();
                fetchSalaries();
            } catch (err) {
                console.error('Failed to delete salary record:', err);
                alert('Failed to delete record: ' + (err.response?.data?.error || err.message));
            }
        }
    };

    const getPaymentMethodDisplay = (pm) => {
        if (pm === 'BANK_TRANSFER') return 'Bank Transfer';
        if (pm === 'CREDIT_CARD') return 'Credit Card';
        return 'Cash';
    };

    const filteredSalaries = useMemo(() => {
        if (!searchQuery.trim()) return salaries;
        const q = searchQuery.toLowerCase();
        return salaries.filter(item => {
            const empName = item.employee_name || 
                           (item.employee?.first_name ? `${item.employee.first_name} ${item.employee.last_name}` : '') ||
                           item.employee?.username || '';
            const notes = item.notes || '';
            return empName.toLowerCase().includes(q) || notes.toLowerCase().includes(q);
        });
    }, [salaries, searchQuery]);

    const paginatedSalaries = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredSalaries.slice(start, start + pageSize);
    }, [filteredSalaries, page]);

    const numPages = Math.ceil(filteredSalaries.length / pageSize);

    if (loading && salaries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card rounded-xl border border-card shadow-sm">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-secondary font-bold">Loading salaries...</p>
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
                    placeholder="Search by employee name or notes..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                    className="flex-1 max-w-md px-4 py-2 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
            </div>

            {filteredSalaries.length === 0 ? (
                <div className="empty-state-message text-center py-20 font-bold text-secondary bg-card rounded-2xl border border-card p-6">
                    No matching salary payments found.
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-card shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-page border-b border-card">
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Pay Date / Period</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Method</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Notes</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedSalaries.map((item) => {
                                    const employeeName = item.employee_name || 
                                        (item.employee?.first_name ? `${item.employee.first_name} ${item.employee.last_name}` : '') ||
                                        item.employee?.username || 'N/A';

                                    return (
                                        <tr key={item.id} className="hover:bg-page/50 transition-colors group">
                                            <td className="px-6 py-4 text-sm text-textMain">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4 text-secondary" />
                                                        {item.payment_date || 'Pending Payment'}
                                                    </span>
                                                    <span className="text-xs text-textMuted pl-5">
                                                        Period: {item.pay_period_start} to {item.pay_period_end}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-textMain">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-4 h-4 text-secondary" />
                                                    {employeeName}
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
                                                    <span className="bg-amber-50 text-status-info border border-amber-100 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold bg-status-info/10 text-status-info px-2 py-1 rounded inline-block">
                                                    {formatPKR(item.amount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-1.5">
                                                {item.status === 'PENDING' && (
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {numPages > 1 && (
                        <div className="flex justify-between items-center px-6 py-4 border-t border-card bg-page/50">
                            <span className="text-xs text-secondary font-semibold">
                                Showing page {page} of {numPages} ({filteredSalaries.length} records)
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

export default SalaryPaymentsTab;
