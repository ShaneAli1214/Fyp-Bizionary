import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';

const RecordModal = ({ isOpen, onClose, recordType, record, triggerRefresh }) => {
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Initial state based on recordType and record
    useEffect(() => {
        if (isOpen) {
            setErrors({});
            if (record) {
                setFormData(record);
            } else {
                // Initialize default empty forms
                const today = new Date().toISOString().split('T')[0];
                if (recordType === 'revenues') {
                    setFormData({ customer: '', invoice_number: '', payment_status: 'PAID', category: 'SALES_REVENUE', amount: '', date: today, description: '' });
                } else if (recordType === 'expenses') {
                    setFormData({ category: 'SUPPLIES', amount: '', tax_amount: '0', payment_method: 'CASH', receipt: '', date: today, description: '', vendor: '' });
                } else if (recordType === 'invoices') {
                    setFormData({ invoice_number: '', client_name: '', amount: '', balance_due: '0', status: 'PENDING', due_date: today, description: '' });
                }
            }
        }
    }, [isOpen, record, recordType]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear field error
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const dataToSave = { ...formData };
            if (dataToSave.amount) dataToSave.amount = parseFloat(dataToSave.amount);
            if (dataToSave.tax_amount !== undefined) dataToSave.tax_amount = parseFloat(dataToSave.tax_amount || 0);
            if (dataToSave.balance_due !== undefined) dataToSave.balance_due = parseFloat(dataToSave.balance_due || 0);

            // Client side validations
            if (recordType === 'expenses' && dataToSave.tax_amount > dataToSave.amount) {
                setErrors({ tax_amount: "Tax amount cannot be greater than the total amount" });
                setSaving(false);
                return;
            }

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
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.error) {
                setErrors({ general: error.response.data.error });
            } else {
                setErrors({ general: `Failed to save ${recordType}. Please verify your fields.` });
            }
        } finally {
            setSaving(false);
        }
    };

    const getTitle = () => {
        const typeStr = recordType === 'revenues' ? 'Revenue' : recordType === 'expenses' ? 'Expense' : 'Invoice';
        return record ? `Edit ${typeStr}` : `Add New ${typeStr}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-card bg-page/50">
                    <h2 className="text-lg font-bold text-primary">{getTitle()}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-secondary hover:text-secondary hover:bg-page rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form id="record-form" onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {errors.general && (
                        <div className="p-3 bg-status-info/10 text-status-info text-xs font-bold rounded-xl border border-red-100">
                            {errors.general}
                        </div>
                    )}

                    {/* REVENUES FIELDS */}
                    {recordType === 'revenues' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Customer Name *</label>
                                    <input 
                                        type="text" name="customer" required value={formData.customer || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Invoice #</label>
                                    <input 
                                        type="text" name="invoice_number" value={formData.invoice_number || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="e.g. INV-1234 (optional)"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Category *</label>
                                    <select 
                                        name="category" required value={formData.category || 'SALES_REVENUE'} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value="SALES_REVENUE">Sales Revenue</option>
                                        <option value="SERVICE_INCOME">Service Income</option>
                                        <option value="OTHER_INCOME">Other Income</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Payment Status *</label>
                                    <select 
                                        name="payment_status" required value={formData.payment_status || 'PAID'} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value="PAID">Paid</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="OVERDUE">Overdue</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Amount (Rs) *</label>
                                    <input 
                                        type="number" name="amount" required min="0.01" step="0.01" value={formData.amount || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Date *</label>
                                    <input 
                                        type="date" name="date" required value={formData.date || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">Description</label>
                                <textarea 
                                    name="description" rows="2" value={formData.description || ''} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                                    placeholder="Optional transaction description..."
                                ></textarea>
                            </div>
                        </>
                    )}

                    {/* EXPENSES FIELDS */}
                    {recordType === 'expenses' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Category *</label>
                                    <select 
                                        name="category" required value={formData.category || 'SUPPLIES'} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value="SUPPLIES">Supplies</option>
                                        <option value="RENT_UTILITIES">Rent & Utilities</option>
                                        <option value="PAYROLL">Payroll</option>
                                        <option value="MARKETING">Marketing</option>
                                        <option value="TECHNOLOGY">Technology</option>
                                        <option value="TRAVEL">Travel</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Vendor Name</label>
                                    <input 
                                        type="text" name="vendor" value={formData.vendor || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="e.g. Office Depot"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Payment Method *</label>
                                    <select 
                                        name="payment_method" required value={formData.payment_method || 'CASH'} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CREDIT_CARD">Credit Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Date *</label>
                                    <input 
                                        type="date" name="date" required value={formData.date || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Total Amount (Rs) *</label>
                                    <input 
                                        type="number" name="amount" required min="0.01" step="0.01" value={formData.amount || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Tax Amount (Rs)</label>
                                    <input 
                                        type="number" name="tax_amount" min="0" step="0.01" value={formData.tax_amount !== undefined ? formData.tax_amount : '0'} onChange={handleChange}
                                        className={`w-full px-4 py-2.5 bg-page border ${errors.tax_amount ? 'border-red-500' : 'border-card'} rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                                    />
                                    {errors.tax_amount && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.tax_amount}</span>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">Receipt URL / Attachment Link</label>
                                <input 
                                    type="text" name="receipt" value={formData.receipt || ''} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="e.g. http://storage.bizionary.com/receipts/exp-001.png"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">Description</label>
                                <textarea 
                                    name="description" rows="2" value={formData.description || ''} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                                />
                            </div>
                        </>
                    )}

                    {/* INVOICES FIELDS */}
                    {recordType === 'invoices' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Invoice # *</label>
                                    <input 
                                        type="text" name="invoice_number" required value={formData.invoice_number || ''} onChange={handleChange}
                                        className={`w-full px-4 py-2.5 bg-page border ${errors.invoice_number ? 'border-red-500' : 'border-card'} rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                                        placeholder="e.g. INV-1001"
                                        disabled={!!record}
                                    />
                                    {errors.invoice_number && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.invoice_number}</span>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Client Name *</label>
                                    <input 
                                        type="text" name="client_name" required value={formData.client_name || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Total Amount (Rs) *</label>
                                    <input 
                                        type="number" name="amount" required min="0.01" step="0.01" value={formData.amount || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Balance Due (Rs) *</label>
                                    <input 
                                        type="number" name="balance_due" required min="0" step="0.01" value={formData.balance_due !== undefined ? formData.balance_due : '0'} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Status *</label>
                                    <select 
                                        name="status" required value={formData.status || 'PENDING'} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value="PAID">Paid</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="OVERDUE">Overdue</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary mb-2">Due Date *</label>
                                    <input 
                                        type="date" name="due_date" required value={formData.due_date || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">Description</label>
                                <textarea 
                                    name="description" rows="2" value={formData.description || ''} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                                />
                            </div>
                        </>
                    )}
                </form>
                
                <div className="p-5 border-t border-card bg-page/50 flex justify-end gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-secondary hover:text-primary bg-card border border-card hover:bg-page rounded-full transition-all shadow-sm cursor-pointer"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="record-form"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary rounded-full shadow-sm transition-all disabled:opacity-70 cursor-pointer"
                    >
                        {saving && <div className="w-4 h-4 border-2 border-card/30 border-t-white rounded-full animate-spin"></div>}
                        {record ? 'Save Changes' : 'Add Record'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecordModal;
