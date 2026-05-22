import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Building2 } from 'lucide-react';
import { userManagementApi } from '../../services/userManagementApi';
import UsersTable from './components/UsersTable';
import AddEditUserModal from './components/AddEditUserModal';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, rolesRes, deptsRes] = await Promise.all([
                userManagementApi.getUsers(),
                userManagementApi.getRoles(),
                userManagementApi.getDepartments()
            ]);
            
            setUsers(usersRes.data?.data || []);
            setRoles(rolesRes.data?.data || []);
            setDepartments(deptsRes.data?.data || []);
        } catch (error) {
            console.error('Failed to fetch user management data:', error);
            setUsers([]);
            setRoles([]);
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDeactivateUser = async (user) => {
        if (window.confirm(`Are you sure you want to deactivate ${user.username}?`)) {
            try {
                await userManagementApi.deactivateUser(user.id);
                fetchData();
            } catch (error) {
                console.error('Failed to deactivate user:', error);
                alert('Failed to deactivate user.');
            }
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
            alert('Failed to save user. Please verify role, department, and password requirements.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">User Management</h1>
                    <p className="text-sm text-textMuted mt-1">Manage system users, roles, and permissions.</p>
                </div>
                <button 
                    onClick={handleAddUser}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg shadow-sm hover:bg-primaryDark hover:shadow-primary/40"
                >
                    <UserPlus className="w-5 h-5" />
                    Add New User
                </button>
            </div>

            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <UsersTable 
                    users={users} 
                    loading={loading} 
                    onEdit={handleEditUser} 
                    onDeactivate={handleDeactivateUser} 
                />
            </div>

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
