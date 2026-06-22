import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Key } from 'lucide-react';

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
        designation: '',
        phone: '',
        employee_id: '',
        date_of_joining: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                password: '', // Don't prefill password on edit
                role: user.role || '',
                department: user.department || '',
                designation: user.designation || '',
                phone: user.phone || '',
                employee_id: user.employee_id || '',
                date_of_joining: user.date_of_joining || '',
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
                designation: '',
                phone: '',
                employee_id: '',
                date_of_joining: new Date().toISOString().split('T')[0],
                status: 'ACTIVE'
            });
        }
        setShowPassword(false);
    }, [user, isOpen]);

    useEffect(() => {
        if (!formData.role || !roles || !departments) return;
        const selectedRoleObj = roles.find(r => String(r.id) === String(formData.role));
        if (!selectedRoleObj) return;

        const roleName = selectedRoleObj.name;
        let allowedDeptNames = [];
        if (roleName === 'Accountant') {
            allowedDeptNames = ['Finance Dept'];
        } else if (roleName === 'Inventory Manager') {
            allowedDeptNames = ['Inventory Dept'];
        } else if (roleName === 'Sales Manager') {
            allowedDeptNames = ['Sales Dept'];
        } else if (roleName === 'Admin') {
            allowedDeptNames = ['Administration', 'QA Dept', 'General Dept'];
        }

        if (allowedDeptNames.length > 0) {
            const currentDeptObj = departments.find(d => String(d.id) === String(formData.department));
            if (!currentDeptObj || !allowedDeptNames.includes(currentDeptObj.name)) {
                const defaultDept = departments.find(d => d.name === allowedDeptNames[0]);
                if (defaultDept) {
                    setFormData(prev => ({ ...prev, department: defaultDept.id }));
                }
            }
        }
    }, [formData.role, roles, departments]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const selectedRoleObj = roles.find(r => String(r.id) === String(formData.role));
    const roleName = selectedRoleObj?.name;

    const filteredDepartments = departments.filter(d => {
        if (!roleName) return true;
        if (roleName === 'Accountant') {
            return d.name === 'Finance Dept';
        }
        if (roleName === 'Inventory Manager') {
            return d.name === 'Inventory Dept';
        }
        if (roleName === 'Sales Manager') {
            return d.name === 'Sales Dept';
        }
        if (roleName === 'Admin') {
            return ['Administration', 'QA Dept', 'General Dept'].includes(d.name);
        }
        return true;
    });

    const isDeptLocked = ['Accountant', 'Inventory Manager', 'Sales Manager'].includes(roleName);

    const handleAutoGeneratePassword = () => {
        // Generate random string
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
        let pass = '';
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password: pass }));
        setShowPassword(true); // Show generated password to user
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Construct payload to submit
        const payload = { ...formData };
        
        // Cleanup empty fields or fields not modified
        if (!payload.password && user) {
            delete payload.password; // Don't send empty password on edit
        }
        if (!payload.employee_id) {
            delete payload.employee_id; // Auto generate on server
        }
        if (!payload.department) {
            payload.department = null;
        }
        if (!payload.role) {
            payload.role = null;
        }

        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-card">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-card bg-[#2B2620]">
                    <div>
                        <h2 className="text-xl font-bold text-card">
                            {user ? 'Edit Corporate User' : 'Provision New System User'}
                        </h2>
                        <p className="text-xs text-card/80 mt-1">
                            {user ? 'Modify profile settings, security states and team placements.' : 'Register a new employee account and set role access permissions.'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-card/70 hover:text-card hover:bg-card/10 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Body (Form) */}
                <div className="p-6 overflow-y-auto flex-1 bg-page/20">
                    <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Section: Account Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary pl-0.5">Account Credentials</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">Username <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm"
                                        placeholder="e.g. zain_ali"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">Email Address <span className="text-red-500">*</span></label>
                                    <input 
                                        type="email" 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm"
                                        placeholder="zain@bizionary.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-primary flex justify-between items-center">
                                    <span>Password {user ? '(Leave blank to keep current)' : <span className="text-red-500">*</span>}</span>
                                    {!user && (
                                        <button 
                                            type="button" 
                                            onClick={handleAutoGeneratePassword}
                                            className="text-xs font-semibold text-[#2B2620] hover:underline flex items-center gap-1"
                                        >
                                            <Key className="w-3 h-3" /> Auto-generate
                                        </button>
                                    )}
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required={!user}
                                        className="w-full pl-4 pr-12 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm"
                                        placeholder={user ? "••••••••" : "Min 8 characters"}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-secondary p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-card/80 my-2" />

                        {/* Section: Profile Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary pl-0.5">Profile Information</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">First Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm"
                                        placeholder="Zain"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">Last Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm"
                                        placeholder="Ali"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">Phone Number</label>
                                    <input 
                                        type="text" 
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm"
                                        placeholder="e.g. 0300-1234567"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">Employee ID <span className="text-xs text-secondary font-normal">(Leave blank to auto-generate)</span></label>
                                    <input 
                                        type="text" 
                                        name="employee_id"
                                        value={formData.employee_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm font-mono"
                                        placeholder="BZ-0002"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-card/80 my-2" />

                        {/* Section: Organizational Placements */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary pl-0.5">Corporate Assignments</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">System Role <span className="text-red-500">*</span></label>
                                    <select 
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm appearance-none"
                                    >
                                        <option value="" disabled>Select a role...</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">Department</label>
                                    <select 
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        disabled={isDeptLocked}
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm appearance-none disabled:bg-page disabled:text-secondary disabled:cursor-not-allowed"
                                    >
                                        {!isDeptLocked && <option value="">None / Unassigned</option>}
                                        {filteredDepartments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">Designation</label>
                                    <input 
                                        type="text" 
                                        name="designation"
                                        value={formData.designation}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm"
                                        placeholder="e.g. Accountant / Sales Manager"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-primary">Date of Joining</label>
                                    <input 
                                        type="date" 
                                        name="date_of_joining"
                                        value={formData.date_of_joining}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm"
                                    />
                                </div>
                            </div>

                            {user && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-primary">Account Status</label>
                                        <select 
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 border border-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-[#2B2620] transition-all bg-card shadow-sm appearance-none"
                                        >
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="INACTIVE">INACTIVE</option>
                                            <option value="SUSPENDED">SUSPENDED</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
                
                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-card flex justify-end gap-3 bg-card">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-xs font-bold text-secondary hover:text-primary bg-card border border-card hover:bg-page rounded-full transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="user-form"
                        className="px-5 py-2.5 text-xs font-bold text-card bg-[#2B2620] hover:bg-[#2B2620] active:bg-[#152e4a] rounded-full shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                        {user ? 'Save Changes' : 'Create User'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddEditUserModal;
