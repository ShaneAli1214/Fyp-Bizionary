import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

const AddEditUserModal = ({ isOpen, onClose, onSave, user, roles, departments }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: '',
        department: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                password: '', // Don't prefill password
                role: user.role || '',
                department: user.department || '',
                status: user.status || 'ACTIVE'
            });
        } else {
            setFormData({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                password: '',
                role: '',
                department: '',
                status: 'ACTIVE'
            });
        }
        setShowPassword(false);
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Construct payload to submit
        const payload = { ...formData };
        if (!payload.password && user) {
            delete payload.password; // Don't send empty password on edit
        }
        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-textMain">
                            {user ? 'Edit User details' : 'Add New System User'}
                        </h2>
                        <p className="text-sm text-textMuted mt-1">
                            {user ? 'Update access levels and personal information.' : 'Provision a new account with specific roles and access.'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
                    <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Username <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    placeholder="e.g. johndoe"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Email Address <span className="text-red-500">*</span></label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    placeholder="john@bizionary.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">First Name</label>
                                <input 
                                    type="text" 
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Last Name</label>
                                <input 
                                    type="text" 
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-gray-700">
                                    Initial Password {user ? '(Leave blank to keep current)' : '<span className="text-red-500">*</span>'}
                                </label>
                            </div>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required={!user}
                                    className="w-full pl-4 pr-12 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">System Role <span className="text-red-500">*</span></label>
                                <select 
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none"
                                >
                                    <option value="" disabled>Select a role...</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Department</label>
                                <select 
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none"
                                >
                                    <option value="">None / Unassigned</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {user && (
                            <div className="space-y-1.5 border-t border-gray-100 pt-5 mt-2">
                                <label className="text-sm font-semibold text-gray-700">Account Status</label>
                                <select 
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full md:w-1/2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none"
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                </select>
                            </div>
                        )}
                    </form>
                </div>
                
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="user-form"
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primaryDark rounded-xl shadow-sm shadow-primary/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/40"
                    >
                        {user ? 'Save Changes' : 'Create User'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddEditUserModal;
