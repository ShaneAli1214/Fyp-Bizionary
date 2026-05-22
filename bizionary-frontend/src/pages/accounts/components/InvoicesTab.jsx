import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar, FileText, User } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';

const InvoicesTab = ({ refreshTrigger, onEdit, triggerRefresh }) => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                setLoading(true);
                const res = await accountsApi.getInvoices();
                if (res.data?.success) {
                    setInvoices(res.data.data);
                } else if (res.data) {
                    setInvoices(res.data);
                }
            } catch (error) {
                console.warn('Failed to fetch invoices.');
                setInvoices([]);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [refreshTrigger]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
            try {
                await accountsApi.deleteInvoice(id);
                triggerRefresh();
            } catch (error) {
                console.error('Failed to delete invoice:', error);
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PAID': return 'text-emerald-700 bg-emerald-100';
            case 'UNPAID': return 'text-amber-700 bg-amber-100';
            case 'OVERDUE': return 'text-rose-700 bg-rose-100';
            default: return 'text-gray-700 bg-gray-100';
        }
    };

    if (loading) return <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Invoice #</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Client & Due Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {invoices.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-textMuted text-sm">No invoice records found.</td>
                        </tr>
                    ) : (
                        invoices.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 font-bold text-primary text-sm">
                                        <FileText className="w-4 h-4 text-primary/70" />
                                        {item.invoice_number}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 font-semibold text-gray-800 text-sm">
                                        <User className="w-4 h-4 text-gray-400" />
                                        {item.client_name}
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] text-textMuted mt-1 font-medium">
                                        <Calendar className="w-3 h-3" />
                                        Due: {item.due_date}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide inline-block ${getStatusColor(item.status)}`}>
                                        {item.status_display || item.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-sm font-bold text-slate-900">
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

export default InvoicesTab;
