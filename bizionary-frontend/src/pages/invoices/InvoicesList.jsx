import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, Download, Printer } from 'lucide-react';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';

const InvoicesList = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await api.get('invoices/');
            let data = res.data.data || res.data;
            setInvoices(data);
        } catch (error) {
            console.warn('Failed to fetch invoices from backend.');
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (id) => {
        // Mock export functionality
        alert(`Starting download for invoice ID: ${id}. In production, this would hit /api/invoices/${id}/export/`);
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredInvoices = invoices.filter(inv =>
        (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusStyle = (status, isOverdue) => {
        if (isOverdue) return 'bg-red-50 text-danger border-red-100';
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-green-50 text-success border-green-100';
            case 'sent': return 'bg-sky-50 text-sky-700 border-sky-100';
            case 'draft': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-surface shadow-sm text-textMain placeholder-textMuted"
                        placeholder="Search by invoice number or client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button className="flex items-center justify-center px-4 py-2 border border-gray-100 text-textMuted bg-surface rounded-xl hover:bg-slate-50 text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-textMain rounded-xl hover:bg-gray-50 text-sm font-bold transition-all shadow-sm w-full sm:w-auto"
                    >
                        <Printer className="h-4 w-4 mr-2 text-textMuted" />
                        Print View
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-surface rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-textMuted text-xs uppercase tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Invoice #</th>
                                    <th className="px-6 py-4 font-semibold">Client</th>
                                    <th className="px-6 py-4 font-semibold">Issue Date</th>
                                    <th className="px-6 py-4 font-semibold">Due Date</th>
                                    <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                                    <th className="px-6 py-4 font-semibold text-right">Balance Due</th>
                                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-primary text-xs">{inv.invoice_number}</td>
                                        <td className="px-6 py-4 font-medium text-textMain">{inv.customer_name}</td>
                                        <td className="px-6 py-4 text-textMuted">{inv.issue_date}</td>
                                        <td className="px-6 py-4 text-textMuted">{inv.due_date}</td>
                                        <td className="px-6 py-4 font-bold text-textMain text-right">{formatPKR(inv.total_amount)}</td>
                                        <td className="px-6 py-4 font-bold text-danger text-right">{formatPKR(inv.balance_due)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusStyle(inv.status, inv.is_overdue)}`}>
                                                {inv.is_overdue ? 'OVERDUE' : (inv.status || 'N/A').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => handleExport(inv.id)}
                                                    className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-primary bg-gray-50 hover:bg-sky-50 rounded-lg transition-colors border border-gray-100 hover:border-sky-100"
                                                    title="Download PDF"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-textMuted">
                                            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                            <p>No invoices found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoicesList;
