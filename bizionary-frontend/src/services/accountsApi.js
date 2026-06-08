import api from './api';

export const accountsApi = {
    // KPIs
    getKpis: (dateRange) => api.get(`accounts/kpis/${dateRange ? `?date_range=${dateRange}` : ''}`),

    // Analytics
    getTrend: (dateRange) => api.get(`accounts/trend/${dateRange ? `?date_range=${dateRange}` : ''}`),
    getRecentInvoices: (limit = 5) => api.get(`accounts/recent-invoices/?limit=${limit}`),
    getExpenseCategories: (dateRange) => api.get(`accounts/expense-categories/${dateRange ? `?date_range=${dateRange}` : ''}`),

    // Revenues
    getRevenues: (dateRange, page = 1) => api.get(`accounts/revenues/?page=${page}${dateRange ? `&date_range=${dateRange}` : ''}`),
    getRevenue: (id) => api.get(`accounts/revenues/${id}/`),
    createRevenue: (data) => api.post('accounts/revenues/', data),
    updateRevenue: (id, data) => api.put(`accounts/revenues/${id}/`, data),
    deleteRevenue: (id) => api.delete(`accounts/revenues/${id}/`),
    voidRevenue: (id, reason) => api.post(`accounts/revenues/${id}/void/`, { reason }),

    // Expenses
    getExpenses: (dateRange, page = 1) => api.get(`accounts/expenses/?page=${page}${dateRange ? `&date_range=${dateRange}` : ''}`),
    getExpense: (id) => api.get(`accounts/expenses/${id}/`),
    createExpense: (data) => api.post('accounts/expenses/', data),
    updateExpense: (id, data) => api.put(`accounts/expenses/${id}/`, data),
    deleteExpense: (id) => api.delete(`accounts/expenses/${id}/`),
    voidExpense: (id, reason) => api.post(`accounts/expenses/${id}/void/`, { reason }),

    // Invoices
    getInvoices: (dateRange, page = 1, pageSize = 10) => api.get(`accounts/invoices/?page=${page}&page_size=${pageSize}${dateRange ? `&date_range=${dateRange}` : ''}`),
    getInvoice: (id) => api.get(`accounts/invoices/${id}/`),
    createInvoice: (data) => api.post('accounts/invoices/', data),
    updateInvoice: (id, data) => api.put(`accounts/invoices/${id}/`, data),
    deleteInvoice: (id) => api.delete(`accounts/invoices/${id}/`),
    voidInvoice: (id, reason) => api.post(`accounts/invoices/${id}/void/`, { reason }),

    // Advanced & Reports
    getCOATree: (dateRange) => api.get(`accounts/chart-tree/${dateRange ? `?date_range=${dateRange}` : ''}`),
    getProfitLoss: (dateRange) => api.get(`accounts/reports/profit-loss/${dateRange ? `?date_range=${dateRange}` : ''}`),
    getBalanceSheet: (dateRange) => api.get(`accounts/reports/balance-sheet/${dateRange ? `?date_range=${dateRange}` : ''}`),
};

