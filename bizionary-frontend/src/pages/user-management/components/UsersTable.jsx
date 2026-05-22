import React from 'react';
import { Edit2, Ban, ShieldCheck, Mail, Building } from 'lucide-react';

const UsersTable = ({ users, loading, onEdit, onDeactivate }) => {
    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center flex-col gap-4">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <span className="text-sm text-textMuted">Loading users...</span>
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-textMain mb-1">No users found</h3>
                <p className="text-sm text-textMuted max-w-sm">Get started by creating a new system user and assigning them a role.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-textMain">
                <thead className="bg-gray-50/80 border-b border-gray-100 uppercase text-xs font-semibold text-textMuted">
                    <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-textMain">{user.first_name || user.username} {user.last_name || ''}</span>
                                    <div className="flex items-center text-xs text-textMuted mt-1 gap-1">
                                        <Mail className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate max-w-[180px]">{user.email || 'No email'}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-50 p-1.5 rounded-lg text-blue-500">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-700">{user.role_name || 'No Role'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-purple-50 p-1.5 rounded-lg text-purple-500">
                                        <Building className="w-4 h-4" />
                                    </div>
                                    <span className="text-gray-600">{user.department_name || 'No Department'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                    user.status === 'ACTIVE' || user.is_active
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    {user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE')}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button 
                                    onClick={() => onEdit(user)}
                                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-sky-50 rounded-lg transition-all duration-300 hover:scale-110"
                                    title="Edit User"
                                >
                                    <Edit2 className="w-4.5 h-4.5" />
                                </button>
                                <button 
                                    onClick={() => onDeactivate(user)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-300 hover:scale-110"
                                    title="Deactivate User"
                                    disabled={user.status === 'INACTIVE'}
                                >
                                    <Ban className="w-4.5 h-4.5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UsersTable;
