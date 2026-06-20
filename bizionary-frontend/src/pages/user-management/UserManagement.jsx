import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Building2, Search, RotateCcw, AlertCircle } from 'lucide-react';
import { userManagementApi } from '../../services/userManagementApi';
import UsersTable from './components/UsersTable';
import AuditLogsTable from './components/AuditLogsTable';
import AddEditUserModal from './components/AddEditUserModal';

const UserManagement = () => {
    // Data lists
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    // States for search and filtering
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState('users');

    const fetchData = async () => {
        try {
            setLoading(true);
            setErrorMsg('');
            
            const params = {
                search: search || undefined,
                role: roleFilter || undefined,
                department: deptFilter || undefined,
                status: statusFilter || undefined,
                page: currentPage,
                limit: pageSize
            };
            
            const [usersRes, rolesRes, deptsRes] = await Promise.all([
                userManagementApi.getUsers(params),
                userManagementApi.getRoles(),
                userManagementApi.getDepartments()
            ]);
            
            setUsers(usersRes.data?.data || []);
            setTotalCount(usersRes.data?.count || 0);
            setTotalPages(usersRes.data?.total_pages || 1);
            
            setRoles(rolesRes.data?.data || []);
            setDepartments(deptsRes.data?.data || []);
        } catch (error) {
            console.error('Failed to fetch user management data:', error);
            setErrorMsg(error.response?.data?.error || 'Failed to fetch user data. Please ensure you are logged in as a Super Admin.');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    // Trigger fetch on query param changes
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchData();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [search, roleFilter, deptFilter, statusFilter, currentPage, pageSize]);

    const handleResetFilters = () => {
        setSearch('');
        setRoleFilter('');
        setDeptFilter('');
        setStatusFilter('');
        setCurrentPage(1);
    };

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (user, newStatus) => {
        const actionText = newStatus === 'SUSPENDED' ? 'suspend' : newStatus === 'INACTIVE' ? 'deactivate' : 'activate';
        if (window.confirm(`Are you sure you want to ${actionText} user: ${user.username}?`)) {
            try {
                await userManagementApi.toggleStatus(user.id, newStatus);
                fetchData();
            } catch (error) {
                console.error('Failed to update status:', error);
                alert(error.response?.data?.error || 'Failed to update user status.');
            }
        }
    };

    const handleResetPassword = async (user) => {
        const newPass = window.prompt(`Enter a new password for ${user.username} (leave blank to auto-generate a strong password):`);
        if (newPass === null) return; // User cancelled prompt
        
        try {
            const payload = newPass.trim() ? { password: newPass.trim() } : {};
            const res = await userManagementApi.resetPassword(user.id, payload.password);
            
            if (res.data?.success) {
                if (res.data.auto_generated) {
                    window.alert(`Password reset successful!\n\nAuto-generated password is:\n${res.data.password}\n\nPlease copy this password and share securely.`);
                } else {
                    window.alert('Password reset successful!');
                }
            }
            fetchData();
        } catch (error) {
            console.error('Failed to reset password:', error);
            alert(error.response?.data?.error || 'Failed to reset password.');
        }
    };

    const handleSaveUser = async (formData) => {
        try {
            if (selectedUser) {
                await userManagementApi.updateUser(selectedUser.id, formData);
            } else {
                await userManagementApi.createUser(formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save user:', error);
            const errMsg = error.response?.data?.errors 
                ? Object.entries(error.response.data.errors).map(([k, v]) => `${k}: ${v}`).join('\n')
                : error.response?.data?.error || 'Failed to save user. Verify details and password requirements.';
            alert(errMsg);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C3A5A] tracking-tight">User Management</h1>
                    <p className="text-sm text-textMuted mt-1">Manage corporate system users, role-based access control (RBAC), and departments.</p>
                </div>
                {activeTab === 'users' && (
                    <button 
                        onClick={handleAddUser}
                        className="flex items-center justify-center gap-2 bg-[#1C3A5A] hover:bg-[#2B527E] text-white px-5 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm active:translate-y-0"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add New User
                    </button>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all -mb-px ${
                        activeTab === 'users'
                            ? 'border-[#1C3A5A] text-[#1C3A5A]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    User Directory
                </button>
                <button
                    onClick={() => setActiveTab('audit_logs')}
                    className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all -mb-px ${
                        activeTab === 'audit_logs'
                            ? 'border-[#1C3A5A] text-[#1C3A5A]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Shield className="w-4 h-4" />
                    Security Audit Logs
                </button>
            </div>

            {activeTab === 'users' ? (
                <>
                    {/* Error Message */}
                    {errorMsg && (
                        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 flex items-center gap-3 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Filter Bar */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                            {/* Search field */}
                            <div className="relative md:col-span-2">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                    placeholder="Search by name, username, or email..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] transition-all bg-white"
                                />
                            </div>

                            {/* Role Filter */}
                            <div>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] transition-all bg-white appearance-none"
                                >
                                    <option value="">All Roles</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dept Filter */}
                            <div>
                                <select
                                    value={deptFilter}
                                    onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] transition-all bg-white appearance-none"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="flex gap-2">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] transition-all bg-white appearance-none"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="SUSPENDED">Suspended</option>
                                </select>
                                <button
                                    onClick={handleResetFilters}
                                    title="Reset filters"
                                    className="p-2.5 text-gray-500 hover:text-[#1C3A5A] bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all flex items-center justify-center flex-shrink-0"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <UsersTable 
                            users={users} 
                            loading={loading} 
                            onEdit={handleEditUser} 
                            onToggleStatus={handleToggleStatus} 
                            onResetPassword={handleResetPassword}
                        />
                        
                        {/* Pagination Controls */}
                        {users.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                <span className="text-xs text-textMuted">
                                    Showing <span className="font-semibold text-textMain">{users.length}</span> of <span className="font-semibold text-textMain">{totalCount}</span> users
                                </span>
                                
                                <div className="flex items-center gap-4">
                                    {/* Rows per page selector */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-textMuted">Rows:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                            className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1C3A5A]"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>
                                    
                                    {/* Navigation Buttons */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-textMuted font-medium">
                                            Page <span className="text-textMain font-semibold">{currentPage}</span> of <span className="text-textMain font-semibold">{totalPages}</span>
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <AuditLogsTable />
            )}

            {/* Modal Dialog */}
            <AddEditUserModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveUser}
                user={selectedUser}
                roles={roles}
                departments={departments}
            />
        </div>
    );
};

export default UserManagement;
