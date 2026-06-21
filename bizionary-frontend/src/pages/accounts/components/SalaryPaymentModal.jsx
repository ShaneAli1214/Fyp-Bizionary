import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { userManagementApi } from '../../../services/userManagementApi';

const SalaryPaymentModal = ({ isOpen, onClose, record, triggerRefresh }) => {
    const [formData, setFormData] = useState({});
    const [employees, setEmployees] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [errors, setErrors] = useState({});

    // Fetch employee list on open
    useEffect(() => {
        if (isOpen) {
            const fetchEmployees = async () => {
                setLoadingEmployees(true);
                try {
                    const res = await userManagementApi.getUsers({ status: 'ACTIVE' });
                    if (res.data?.success) {
                        setEmployees(res.data.data || []);
                    } else if (Array.isArray(res.data)) {
                        setEmployees(res.data);
                    }
                } catch (err) {
                    console.error('Failed to fetch employees list:', err);
                } finally {
                    setLoadingEmployees(false);
                }
            };
            fetchEmployees();
        }
    }, [isOpen]);

    // Initial state based on record
    useEffect(() => {
        if (isOpen) {
            setErrors({});
            if (record) {
                // Ensure correct fields mapped
                setFormData({
                    ...record,
                    employee: record.employee?.id || record.employee || ''
                });
            } else {
                const today = new Date().toISOString().split('T')[0];
                setFormData({
                    employee: '',
                    amount: '',
                    pay_period_start: today,
                    pay_period_end: today,
                    payment_date: today,
                    payment_method: 'BANK_TRANSFER',
                    status: 'PENDING',
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
        if (dataToSave.amount) {
            dataToSave.amount = parseFloat(dataToSave.amount);
        }

        // Validations
        if (!dataToSave.amount || dataToSave.amount <= 0) {
            setErrors({ amount: "Amount must be greater than zero" });
            setSaving(false);
            return;
        }

        if (!dataToSave.employee) {
            setErrors({ employee: "Please select an employee" });
            setSaving(false);
            return;
        }

        // Nullify payment_date if PENDING
        if (dataToSave.status === 'PENDING') {
            dataToSave.payment_date = null;
        }

        try {
            if (record) {
                await accountsApi.updateSalary(record.id, dataToSave);
            } else {
                await accountsApi.createSalary(dataToSave);
            }
            triggerRefresh();
            onClose();
        } catch (error) {
            console.error('Failed to save salary payment:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.error) {
                setErrors({ general: error.response.data.error });
            } else {
                setErrors({ general: "Failed to save salary payment. Please verify your fields." });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-900">{record ? 'Edit Salary Payment' : 'Record Salary Payment'}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="salary-form" onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {errors.general && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
                            {errors.general}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">Employee *</label>
                        <select
                            name="employee"
                            required
                            value={formData.employee || ''}
                            onChange={handleChange}
                            className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.employee ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                            disabled={loadingEmployees}
                        >
                            <option value="">{loadingEmployees ? 'Loading Employees...' : 'Select Employee'}</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.first_name || emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.username} ({emp.email})
                                </option>
                            ))}
                        </select>
                        {errors.employee && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.employee}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Amount (Rs) *</label>
                            <input
                                type="number"
                                name="amount"
                                required
                                min="0.01"
                                step="0.01"
                                value={formData.amount || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.amount ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                                placeholder="e.g. 85000"
                            />
                            {errors.amount && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.amount}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Payment Method *</label>
                            <select
                                name="payment_method"
                                required
                                value={formData.payment_method || 'BANK_TRANSFER'}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CASH">Cash</option>
                                <option value="CREDIT_CARD">Credit Card</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Pay Period Start *</label>
                            <input
                                type="date"
                                name="pay_period_start"
                                required
                                value={formData.pay_period_start || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Pay Period End *</label>
                            <input
                                type="date"
                                name="pay_period_end"
                                required
                                value={formData.pay_period_end || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Status *</label>
                            <select
                                name="status"
                                required
                                value={formData.status || 'PENDING'}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="PENDING">Pending</option>
                                <option value="PAID">Paid</option>
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
                        <label className="block text-xs font-bold text-gray-500 mb-2">Notes</label>
                        <textarea
                            name="notes"
                            rows="2"
                            value={formData.notes || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                            placeholder="Optional payment notes..."
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
                        form="salary-form"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primaryDark rounded-xl shadow-sm transition-all disabled:opacity-70 cursor-pointer"
                    >
                        {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {record ? 'Save Changes' : 'Record Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalaryPaymentModal;
