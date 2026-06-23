import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';

const OperatingCostModal = ({ isOpen, onClose, record, triggerRefresh }) => {
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
                    cost_type: 'SUBSCRIPTION',
                    name: '',
                    amount: '',
                    due_date: today,
                    payment_date: today,
                    payment_method: 'CREDIT_CARD',
                    status: 'UNPAID',
                    notes: ''
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

        // Validations
        if (!dataToSave.amount || dataToSave.amount <= 0) {
            setErrors({ amount: "Amount must be greater than zero" });
            setSaving(false);
            return;
        }

        if (!dataToSave.name.trim()) {
            setErrors({ name: "Name is required" });
            setSaving(false);
            return;
        }

        // Nullify payment_date if UNPAID
        if (dataToSave.status !== 'PAID') {
            dataToSave.payment_date = null;
        }

        try {
            if (record) {
                await accountsApi.updateRecurringCost(record.id, dataToSave);
            } else {
                await accountsApi.createRecurringCost(dataToSave);
            }
            triggerRefresh();
            onClose();
        } catch (error) {
            console.error('Failed to save operating cost:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.error) {
                setErrors({ general: error.response.data.error });
            } else {
                setErrors({ general: "Failed to save operating cost. Please verify your fields." });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-card bg-page/50">
                    <h2 className="text-lg font-bold text-primary">{record ? 'Edit Operating Cost' : 'Record Operating Cost'}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-secondary hover:text-secondary hover:bg-page rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="operating-cost-form" onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {errors.general && (
                        <div className="p-3 bg-status-info/10 text-status-info text-xs font-bold rounded-xl border border-red-100">
                            {errors.general}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-secondary mb-2">Cost Type *</label>
                            <select
                                name="cost_type"
                                required
                                value={formData.cost_type || 'SUBSCRIPTION'}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="RENT">Rent</option>
                                <option value="SUBSCRIPTION">Subscription</option>
                                <option value="MARKETING_CAMPAIGN">Marketing Campaign</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="INSURANCE">Insurance</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-secondary mb-2">Name / Description *</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-page border ${errors.name ? 'border-red-500' : 'border-card'} rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                                placeholder="e.g. Adobe Creative Cloud"
                            />
                            {errors.name && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.name}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-secondary mb-2">Amount (Rs) *</label>
                            <input
                                type="number"
                                name="amount"
                                required
                                min="0.01"
                                step="0.01"
                                value={formData.amount || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-page border ${errors.amount ? 'border-red-500' : 'border-card'} rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                                placeholder="e.g. 12500"
                            />
                            {errors.amount && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.amount}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-secondary mb-2">Payment Method *</label>
                            <select
                                name="payment_method"
                                required
                                value={formData.payment_method || 'CREDIT_CARD'}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="CREDIT_CARD">Credit Card</option>
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-secondary mb-2">Due Date *</label>
                            <input
                                type="date"
                                name="due_date"
                                required
                                value={formData.due_date || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-secondary mb-2">Status *</label>
                            <select
                                name="status"
                                required
                                value={formData.status || 'UNPAID'}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="UNPAID">Unpaid</option>
                                <option value="PAID">Paid</option>
                            </select>
                        </div>
                    </div>

                    {formData.status === 'PAID' && (
                        <div>
                            <label className="block text-xs font-bold text-secondary mb-2">Payment Date *</label>
                            <input
                                type="date"
                                name="payment_date"
                                required
                                value={formData.payment_date || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-secondary mb-2">Notes</label>
                        <textarea
                            name="notes"
                            rows="2"
                            value={formData.notes || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                            placeholder="Optional operational cost notes..."
                        />
                    </div>
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
                        form="operating-cost-form"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary rounded-full shadow-sm transition-all disabled:opacity-70 cursor-pointer"
                    >
                        {saving && <div className="w-4 h-4 border-2 border-card/30 border-t-white rounded-full animate-spin"></div>}
                        {record ? 'Save Changes' : 'Record Cost'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OperatingCostModal;
