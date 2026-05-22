import api from './api';

export const accountsApi = {
    // KPIs
    getKpis: () => api.get('accounts/kpis/'),

    // Analytics
    getTrend: () => api.get('accounts/trend/'),
    getRecentInvoices: (limit = 5) => api.get(`accounts/recent-invoices/?limit=${limit}`),
    getExpenseCategories: () => api.get('accounts/expense-categories/'),

    // Revenues
    getRevenues: () => api.get('accounts/revenues/'),
    getRevenue: (id) => api.get(`accounts/revenues/${id}/`),
    createRevenue: (data) => api.post('accounts/revenues/', data),
    updateRevenue: (id, data) => api.put(`accounts/revenues/${id}/`, data),
    deleteRevenue: (id) => api.delete(`accounts/revenues/${id}/`),

    // Expenses
    getExpenses: () => api.get('accounts/expenses/'),
    getExpense: (id) => api.get(`accounts/expenses/${id}/`),
    createExpense: (data) => api.post('accounts/expenses/', data),
    updateExpense: (id, data) => api.put(`accounts/expenses/${id}/`, data),
    deleteExpense: (id) => api.delete(`accounts/expenses/${id}/`),

    // Invoices
    getInvoices: () => api.get('accounts/invoices/'),
    getInvoice: (id) => api.get(`accounts/invoices/${id}/`),
    createInvoice: (data) => api.post('accounts/invoices/', data),
    updateInvoice: (id, data) => api.put(`accounts/invoices/${id}/`, data),
    deleteInvoice: (id) => api.delete(`accounts/invoices/${id}/`),
};
