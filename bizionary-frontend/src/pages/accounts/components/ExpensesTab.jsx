import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar, Tag, Store } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';

const ExpensesTab = ({ refreshTrigger, onEdit, triggerRefresh }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExpenses = async () => {
            try {
                setLoading(true);
                const res = await accountsApi.getExpenses();
                if (res.data?.success) {
                    setExpenses(res.data.data);
                } else if (res.data) {
                    setExpenses(res.data);
                }
            } catch (error) {
                console.warn('Failed to fetch expenses.');
                setExpenses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchExpenses();
    }, [refreshTrigger]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this expense record?')) {
            try {
                await accountsApi.deleteExpense(id);
                triggerRefresh();
            } catch (error) {
                console.error('Failed to delete expense:', error);
            }
        }
    };

    if (loading) return <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Date & Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Vendor & Desc</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {expenses.length === 0 ? (
                        <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-textMuted text-sm">No expense records found.</td>
                        </tr>
                    ) : (
                        expenses.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 font-bold text-textMain text-sm">
                                        <Tag className="w-4 h-4 text-gray-400" />
                                        {item.category_display || item.category}
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] text-textMuted mt-1 font-medium">
                                        <Calendar className="w-3 h-3" />
                                        {item.date}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 font-semibold text-gray-800 text-sm">
                                        <Store className="w-4 h-4 text-gray-400" />
                                        {item.vendor || 'N/A'}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">{item.description || '-'}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-sm font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded inline-block">
                                        {formatPKR(item.amount)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button 
                                        onClick={() => onEdit(item)}
                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-sky-50 rounded-lg transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ExpensesTab;
