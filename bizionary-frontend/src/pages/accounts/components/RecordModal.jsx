import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';

const RecordModal = ({ isOpen, onClose, recordType, record, triggerRefresh }) => {
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    // Initial state based on recordType and record
    useEffect(() => {
        if (isOpen) {
            if (record) {
                setFormData(record);
            } else {
                // Initialize default empty forms
                const today = new Date().toISOString().split('T')[0];
                if (recordType === 'revenues') {
                    setFormData({ source: '', amount: '', date: today, description: '' });
                } else if (recordType === 'expenses') {
                    setFormData({ category: 'SUPPLIES', amount: '', date: today, description: '', vendor: '' });
                } else if (recordType === 'invoices') {
                    setFormData({ invoice_number: '', client_name: '', amount: '', status: 'PAID', due_date: today, description: '' });
                }
            }
        }
    }, [isOpen, record, recordType]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = { ...formData };
            if (dataToSave.amount) dataToSave.amount = parseFloat(dataToSave.amount);

            if (recordType === 'revenues') {
                record ? await accountsApi.updateRevenue(record.id, dataToSave) : await accountsApi.createRevenue(dataToSave);
            } else if (recordType === 'expenses') {
                record ? await accountsApi.updateExpense(record.id, dataToSave) : await accountsApi.createExpense(dataToSave);
            } else if (recordType === 'invoices') {
                record ? await accountsApi.updateInvoice(record.id, dataToSave) : await accountsApi.createInvoice(dataToSave);
            }
            
            triggerRefresh();
            onClose();
        } catch (error) {
            console.error(`Failed to save ${recordType}:`, error);
        } finally {
            setSaving(false);
        }
    };

    const getTitle = () => {
        const typeStr = recordType === 'revenues' ? 'Revenue' : recordType === 'expenses' ? 'Expense' : 'Invoice';
        return record ? `Edit ${typeStr}` : `Add New ${typeStr}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-900">{getTitle()}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form id="record-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* REVENUES FIELDS */}
                    {recordType === 'revenues' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-textMuted mb-2">Revenue Source *</label>
                                <input 
                                    type="text" name="source" required value={formData.source || ''} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    placeholder="e.g. Product Sales, Consulting"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Amount (Rs) *</label>
                                    <input 
                                        type="number" name="amount" required min="1" step="0.01" value={formData.amount || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Date *</label>
                                    <input 
                                        type="date" name="date" required value={formData.date || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-textMuted mb-2">Description</label>
                                <textarea 
                                    name="description" rows="3" value={formData.description || ''} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                    placeholder="Optional details..."
                                ></textarea>
                            </div>
                        </>
                    )}

                    {/* EXPENSES FIELDS */}
                    {recordType === 'expenses' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Category *</label>
                                    <select 
                                        name="category" required value={formData.category || 'SUPPLIES'} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    >
                                        <option value="SUPPLIES">Supplies</option>
                                        <option value="UTILITIES">Utilities</option>
                                        <option value="RENT">Rent</option>
                                        <option value="PAYROLL">Payroll</option>
                                        <option value="MARKETING">Marketing</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Vendor</label>
                                    <input 
                                        type="text" name="vendor" value={formData.vendor || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                        placeholder="e.g. Office World"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Amount (Rs) *</label>
                                    <input 
                                        type="number" name="amount" required min="1" step="0.01" value={formData.amount || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Date *</label>
                                    <input 
                                        type="date" name="date" required value={formData.date || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-textMuted mb-2">Description</label>
                                <textarea 
                                    name="description" rows="2" value={formData.description || ''} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                />
                            </div>
                        </>
                    )}

                    {/* INVOICES FIELDS */}
                    {recordType === 'invoices' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Invoice # *</label>
                                    <input 
                                        type="text" name="invoice_number" required value={formData.invoice_number || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                        placeholder="e.g. INV-1001"
                                        disabled={!!record}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Client Name *</label>
                                    <input 
                                        type="text" name="client_name" required value={formData.client_name || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Amount *</label>
                                    <input 
                                        type="number" name="amount" required min="1" step="0.01" value={formData.amount || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Status *</label>
                                    <select 
                                        name="status" required value={formData.status || 'PAID'} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    >
                                        <option value="PAID">Paid</option>
                                        <option value="UNPAID">Unpaid</option>
                                        <option value="OVERDUE">Overdue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-textMuted mb-2">Due Date *</label>
                                    <input 
                                        type="date" name="due_date" required value={formData.due_date || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-textMuted mb-2">Description</label>
                                <textarea 
                                    name="description" rows="2" value={formData.description || ''} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                />
                            </div>
                        </>
                    )}
                </form>

                <div className="p-5 border-t border-gray-100 bg-slate-50/50 flex justify-end gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="record-form"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primaryDark rounded-xl shadow-sm shadow-primary/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/40 disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                        {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {record ? 'Save Changes' : 'Add Record'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecordModal;
