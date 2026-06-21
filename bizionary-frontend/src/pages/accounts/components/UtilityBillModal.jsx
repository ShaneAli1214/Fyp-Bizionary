import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';

const UtilityBillModal = ({ isOpen, onClose, record, triggerRefresh }) => {
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Initial state based on record
    useEffect(() => {
        if (isOpen) {
            setErrors({});
            if (record) {
                setFormData(record);
            } else {
                const today = new Date().toISOString().split('T')[0];
                setFormData({
                    utility_type: 'ELECTRICITY',
                    bill_number: '',
                    billing_period_start: today,
                    billing_period_end: today,
                    due_date: today,
                    amount: '',
                    tax_amount: '0.00',
                    payment_date: today,
                    payment_method: 'CASH',
                    status: 'UNPAID',
                    notes: '',
                    receipt: ''
                });
            }
        }
    }, [isOpen, record]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        const dataToSave = { ...formData };
        if (dataToSave.amount) dataToSave.amount = parseFloat(dataToSave.amount);
        if (dataToSave.tax_amount !== undefined) dataToSave.tax_amount = parseFloat(dataToSave.tax_amount || 0);

        // Validations
        if (!dataToSave.amount || dataToSave.amount <= 0) {
            setErrors({ amount: "Amount must be greater than zero" });
            setSaving(false);
            return;
        }

        if (dataToSave.tax_amount > dataToSave.amount) {
            setErrors({ tax_amount: "Tax amount cannot be greater than total amount" });
            setSaving(false);
            return;
        }

        // Nullify payment_date if UNPAID
        if (dataToSave.status !== 'PAID') {
            dataToSave.payment_date = null;
        }

        try {
            if (record) {
                await accountsApi.updateUtility(record.id, dataToSave);
            } else {
                await accountsApi.createUtility(dataToSave);
            }
            triggerRefresh();
            onClose();
        } catch (error) {
            console.error('Failed to save utility bill:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.error) {
                setErrors({ general: error.response.data.error });
            } else {
                setErrors({ general: "Failed to save utility bill. Please verify your fields." });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-900">{record ? 'Edit Utility Bill' : 'Record Utility Bill'}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="utility-form" onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {errors.general && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
                            {errors.general}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Utility Type *</label>
                            <select
                                name="utility_type"
                                required
                                value={formData.utility_type || 'ELECTRICITY'}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="ELECTRICITY">Electricity</option>
                                <option value="WATER">Water</option>
                                <option value="GAS">Gas</option>
                                <option value="INTERNET">Internet</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Bill Number *</label>
                            <input
                                type="text"
                                name="bill_number"
                                required
                                value={formData.bill_number || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="e.g. ELEC-2026-06"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Billing Period Start *</label>
                            <input
                                type="date"
                                name="billing_period_start"
                                required
                                value={formData.billing_period_start || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Billing Period End *</label>
                            <input
                                type="date"
                                name="billing_period_end"
                                required
                                value={formData.billing_period_end || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Total Amount (Rs) *</label>
                            <input
                                type="number"
                                name="amount"
                                required
                                min="0.01"
                                step="0.01"
                                value={formData.amount || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.amount ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                                placeholder="e.g. 18500"
                            />
                            {errors.amount && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.amount}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Tax Amount (Rs)</label>
                            <input
                                type="number"
                                name="tax_amount"
                                min="0"
                                step="0.01"
                                value={formData.tax_amount !== undefined ? formData.tax_amount : '0.00'}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.tax_amount ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                            />
                            {errors.tax_amount && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.tax_amount}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Due Date *</label>
                            <input
                                type="date"
                                name="due_date"
                                required
                                value={formData.due_date || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Payment Method *</label>
                            <select
                                name="payment_method"
                                required
                                value={formData.payment_method || 'CASH'}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CREDIT_CARD">Credit Card</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Status *</label>
                            <select
                                name="status"
                                required
                                value={formData.status || 'UNPAID'}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="UNPAID">Unpaid</option>
                                <option value="PAID">Paid</option>
                                <option value="OVERDUE">Overdue</option>
                            </select>
                        </div>

                        {formData.status === 'PAID' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">Payment Date *</label>
                                <input
                                    type="date"
                                    name="payment_date"
                                    required
                                    value={formData.payment_date || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">Receipt URL / Attachment Link</label>
                        <input
                            type="text"
                            name="receipt"
                            value={formData.receipt || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="e.g. http://storage.bizionary.com/receipts/bill-01.png"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">Notes</label>
                        <textarea
                            name="notes"
                            rows="2"
                            value={formData.notes || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                            placeholder="Optional bill notes..."
                        />
                    </div>
                </form>

                <div className="p-5 border-t border-gray-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm cursor-pointer"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="utility-form"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primaryDark rounded-xl shadow-sm transition-all disabled:opacity-70 cursor-pointer"
                    >
                        {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {record ? 'Save Changes' : 'Record Bill'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UtilityBillModal;
