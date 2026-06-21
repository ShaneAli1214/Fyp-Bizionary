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
            return 'bg-rose-50 text-rose-700 border-rose-200';
        } else if (name.includes('accountant') || name.includes('finance')) {
            return 'bg-amber-50 text-amber-700 border-amber-200';
        } else if (name.includes('inventory') || name.includes('keeper')) {
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    // Helper to get status badge classes
    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SUSPENDED':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'INACTIVE':
            default:
                return 'bg-rose-50 text-rose-700 border-rose-200';
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
                <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mb-5 text-gray-400">
                    <ShieldAlert className="w-8 h-8 text-[#1C3A5A]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No users found</h3>
                <p className="text-sm text-gray-500 max-w-sm">No user records match your search criteria. Create a new system user or adjust your filters.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto relative min-h-[300px]">
            <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-xs font-bold text-gray-500 tracking-wider">
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
                        <tr key={user.id} className="hover:bg-gray-50/40 transition-colors group">
                            {/* User Info (Avatar, Name, Email, Phone) */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#1C3A5A]/5 border border-[#1C3A5A]/10 text-[#1C3A5A] flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">
                                        {getInitials(user)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-gray-900 truncate">
                                            {user.first_name || user.username} {user.last_name || ''}
                                        </span>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-2.5 text-xs text-gray-500 mt-0.5 min-w-0">
                                            <span className="flex items-center gap-1 truncate">
                                                <Mail className="w-3 h-3 flex-shrink-0 text-gray-400" />
                                                {user.email || 'No email'}
                                            </span>
                                            {user.phone && (
                                                <span className="hidden sm:inline-block text-gray-300">•</span>
                                            )}
                                            {user.phone && (
                                                <span className="flex items-center gap-1 flex-shrink-0 text-gray-400">
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
                                <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200/80 px-2 py-1 rounded-lg">
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
                                        <span className="text-xs text-gray-500 font-medium pl-0.5">
                                            {user.designation}
                                        </span>
                                    )}
                                </div>
                            </td>

                            {/* Department */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-[#1C3A5A]/5 p-1.5 rounded-lg text-[#1C3A5A]/80">
                                        <Building className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="font-medium text-gray-700 text-xs">
                                        {user.department_name || 'General / None'}
                                    </span>
                                </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeStyle(user.status)}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                        user.status === 'ACTIVE' ? 'bg-emerald-500' : user.status === 'SUSPENDED' ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}></span>
                                    {user.status}
                                </span>
                            </td>

                            {/* Actions Dropdown */}
                            <td className="px-6 py-4 text-right relative">
                                <div className="inline-block text-left">
                                    <button 
                                        onClick={() => toggleMenu(user.id)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
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
                                            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-gray-100 shadow-xl z-30 py-1.5 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                                <button
                                                    onClick={() => { onEdit(user); setOpenMenuId(null); }}
                                                    className="w-full px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                                    Edit Profile
                                                </button>
                                                <button
                                                    onClick={() => { onResetPassword(user); setOpenMenuId(null); }}
                                                    className="w-full px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors"
                                                >
                                                    <Key className="w-3.5 h-3.5 text-gray-400" />
                                                    Reset Password
                                                </button>
                                                
                                                <div className="border-t border-gray-100 my-1" />
                                                
                                                {user.status !== 'ACTIVE' && (
                                                    <button
                                                        onClick={() => { onToggleStatus(user, 'ACTIVE'); setOpenMenuId(null); }}
                                                        className="w-full px-4 py-2.5 text-xs text-emerald-600 hover:bg-emerald-50/40 flex items-center gap-2 font-bold transition-colors"
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
                                                        className="w-full px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50/40 flex items-center gap-2 font-bold transition-colors"
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
