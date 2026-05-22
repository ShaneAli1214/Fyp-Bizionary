import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';

const RevenuesTab = ({ refreshTrigger, onEdit, triggerRefresh }) => {
    const [revenues, setRevenues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRevenues = async () => {
            try {
                setLoading(true);
                const res = await accountsApi.getRevenues();
                if (res.data?.success) {
                    setRevenues(res.data.data);
                } else if (res.data) {
                    setRevenues(res.data); // in case backend response structure differs
                }
            } catch (error) {
                console.warn('Failed to fetch revenues.');
                setRevenues([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRevenues();
    }, [refreshTrigger]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this revenue record?')) {
            try {
                await accountsApi.deleteRevenue(id);
                triggerRefresh();
            } catch (error) {
                console.error('Failed to delete revenue:', error);
            }
        }
    };

    if (loading) return <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Date & Source</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {revenues.length === 0 ? (
                        <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-textMuted text-sm">No revenue records found.</td>
                        </tr>
                    ) : (
                        revenues.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-textMain">{item.source}</p>
                                    <div className="flex items-center gap-1 text-[11px] text-textMuted mt-1 font-medium">
                                        <Calendar className="w-3 h-3" />
                                        {item.date}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.description || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block">
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

export default RevenuesTab;
