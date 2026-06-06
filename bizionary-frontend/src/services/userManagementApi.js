import api from './api';

export const userManagementApi = {
    // KPI & Analytics
    getKpis: () => api.get('user-management/kpis/'),
    getUsersByRole: () => api.get('user-management/users-by-role/'),
    getUsersByDepartment: () => api.get('user-management/users-by-department/'),
    getRecentActivity: (limit = 20) => api.get(`user-management/recent-activity/?limit=${limit}`),

    // Users
    getUsers: (params) => api.get('user-management/users/', { params }),
    getUser: (id) => api.get(`user-management/users/${id}/`),
    createUser: (data) => api.post('user-management/users/', data),
    updateUser: (id, data) => api.put(`user-management/users/${id}/`, data),
    deactivateUser: (id) => api.delete(`user-management/users/${id}/`),
    toggleStatus: (id, status) => api.patch(`user-management/users/${id}/status/`, { status }),
    resetPassword: (id, password) => api.post(`user-management/users/${id}/reset-password/`, { password }),
    getAuditLogs: (params) => api.get('user-management/audit-logs/', { params }),

    // Roles
    getRoles: () => api.get('user-management/roles/'),

    // Departments
    getDepartments: () => api.get('user-management/departments/'),

    // Permissions
    getUserPermissions: (userId) => api.get(`user-management/users/${userId}/permissions/`),
};
