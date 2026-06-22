import React, { useState } from 'react';
import { Edit2, Key, Ban, UserCheck, Mail, Building, Phone, BadgeCheck, MoreVertical, ShieldAlert } from 'lucide-react';
import Skeleton from '../../../components/ui/Skeleton';

const UsersTable = ({ users, loading, onEdit, onToggleStatus, onResetPassword }) => {
    // Track which user's action dropdown is currently open
    const [openMenuId, setOpenMenuId] = useState(null);

    const toggleMenu = (userId) => {
        if (openMenuId === userId) {
            setOpenMenuId(null);
        } else {
            setOpenMenuId(userId);
        }
    };

    // Helper to get initials for avatar
    const getInitials = (user) => {
        const first = user.first_name || '';
        const last = user.last_name || '';
        if (first || last) {
            return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
        }
        return (user.username || 'U').substring(0, 2).toUpperCase();
    };

    // Helper to get role badge classes
    const getRoleBadgeStyle = (roleName) => {
        const name = (roleName || '').toLowerCase();
        if (name.includes('admin')) {
            return 'bg-status-info/10 text-status-info border-card';
        } else if (name.includes('accountant') || name.includes('finance')) {
            return 'bg-amber-50 text-status-info border-amber-200';
        } else if (name.includes('inventory') || name.includes('keeper')) {
            return 'bg-status-success/10 text-status-success border-card';
        }
        return 'bg-page text-primary border-card';
    };

    // Helper to get status badge classes
    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-status-success/10 text-status-success border-card';
            case 'SUSPENDED':
                return 'bg-amber-50 text-status-info border-amber-200';
            case 'INACTIVE':
            default:
                return 'bg-status-info/10 text-status-info border-card';
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <Skeleton.TableRows count={7} cols={5} />
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-page rounded-2xl border border-card flex items-center justify-center mb-5 text-secondary">
                    <ShieldAlert className="w-8 h-8 text-[#2B2620]" />
                </div>
                <h3 className="text-lg font-bold text-primary mb-1">No users found</h3>
                <p className="text-sm text-secondary max-w-sm">No user records match your search criteria. Create a new system user or adjust your filters.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto relative min-h-[300px]">
            <table className="w-full text-left text-sm text-primary">
                <thead className="bg-page border-b border-card uppercase text-xs font-bold text-secondary tracking-wider">
                    <tr>
                        <th className="px-6 py-4">User Info</th>
                        <th className="px-6 py-4">Employee ID</th>
                        <th className="px-6 py-4">Role / Designation</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-page/40 transition-colors group">
                            {/* User Info (Avatar, Name, Email, Phone) */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-active-pill/20 border border-card text-[#2B2620] flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">
                                        {getInitials(user)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-primary truncate">
                                            {user.first_name || user.username} {user.last_name || ''}
                                        </span>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-2.5 text-xs text-secondary mt-0.5 min-w-0">
                                            <span className="flex items-center gap-1 truncate">
                                                <Mail className="w-3 h-3 flex-shrink-0 text-secondary" />
                                                {user.email || 'No email'}
                                            </span>
                                            {user.phone && (
                                                <span className="hidden sm:inline-block text-gray-300">•</span>
                                            )}
                                            {user.phone && (
                                                <span className="flex items-center gap-1 flex-shrink-0 text-secondary">
                                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                                    {user.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {/* Employee ID */}
                            <td className="px-6 py-4">
                                <span className="font-mono text-xs font-semibold text-secondary bg-page border border-card/80 px-2 py-1 rounded-lg">
                                    {user.employee_id || 'N/A'}
                                </span>
                            </td>

                            {/* Role & Designation */}
                            <td className="px-6 py-4">
                                <div className="flex flex-col items-start gap-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getRoleBadgeStyle(user.role_name)}`}>
                                        {user.role_name || 'Unassigned Role'}
                                    </span>
                                    {user.designation && (
                                        <span className="text-xs text-secondary font-medium pl-0.5">
                                            {user.designation}
                                        </span>
                                    )}
                                </div>
                            </td>

                            {/* Department */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-active-pill/20 p-1.5 rounded-lg text-primary">
                                        <Building className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="font-medium text-primary text-xs">
                                        {user.department_name || 'General / None'}
                                    </span>
                                </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeStyle(user.status)}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                        user.status === 'ACTIVE' ? 'bg-status-success' : user.status === 'SUSPENDED' ? 'bg-status-info' : 'bg-rose-500'
                                    }`}></span>
                                    {user.status}
                                </span>
                            </td>

                            {/* Actions Dropdown */}
                            <td className="px-6 py-4 text-right relative">
                                <div className="inline-block text-left">
                                    <button 
                                        onClick={() => toggleMenu(user.id)}
                                        className="p-2 text-secondary hover:text-secondary hover:bg-page rounded-xl transition-all"
                                        title="User options"
                                    >
                                        <MoreVertical className="w-4.5 h-4.5" />
                                    </button>

                                    {openMenuId === user.id && (
                                        <>
                                            {/* Backdrop to close menu */}
                                            <div 
                                                className="fixed inset-0 z-20" 
                                                onClick={() => setOpenMenuId(null)}
                                            />
                                            <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-card border border-card shadow-xl z-30 py-1.5 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                                <button
                                                    onClick={() => { onEdit(user); setOpenMenuId(null); }}
                                                    className="w-full px-4 py-2.5 text-xs text-primary hover:bg-page flex items-center gap-2 font-medium transition-colors"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5 text-secondary" />
                                                    Edit Profile
                                                </button>
                                                <button
                                                    onClick={() => { onResetPassword(user); setOpenMenuId(null); }}
                                                    className="w-full px-4 py-2.5 text-xs text-primary hover:bg-page flex items-center gap-2 font-medium transition-colors"
                                                >
                                                    <Key className="w-3.5 h-3.5 text-secondary" />
                                                    Reset Password
                                                </button>
                                                
                                                <div className="border-t border-card my-1" />
                                                
                                                {user.status !== 'ACTIVE' && (
                                                    <button
                                                        onClick={() => { onToggleStatus(user, 'ACTIVE'); setOpenMenuId(null); }}
                                                        className="w-full px-4 py-2.5 text-xs text-status-success hover:bg-status-success/10/40 flex items-center gap-2 font-bold transition-colors"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        Activate User
                                                    </button>
                                                )}
                                                
                                                {user.status !== 'SUSPENDED' && (
                                                    <button
                                                        onClick={() => { onToggleStatus(user, 'SUSPENDED'); setOpenMenuId(null); }}
                                                        className="w-full px-4 py-2.5 text-xs text-amber-600 hover:bg-amber-50/40 flex items-center gap-2 font-bold transition-colors"
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                        Suspend User
                                                    </button>
                                                )}
                                                
                                                {user.status !== 'INACTIVE' && (
                                                    <button
                                                        onClick={() => { onToggleStatus(user, 'INACTIVE'); setOpenMenuId(null); }}
                                                        className="w-full px-4 py-2.5 text-xs text-status-info hover:bg-status-info/10/40 flex items-center gap-2 font-bold transition-colors"
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                        Deactivate User
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UsersTable;
