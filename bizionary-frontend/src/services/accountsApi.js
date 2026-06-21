import api from './api';

const buildUrl = (baseUrl, dateRange, startDate, endDate, extraParams = []) => {
    const params = [...extraParams];
    if (dateRange && dateRange !== 'custom') params.push(`date_range=${dateRange}`);
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    return baseUrl + (params.length ? `?${params.join('&')}` : '');
};

export const accountsApi = {
    // KPIs
    getKpis: (dateRange, startDate, endDate) => api.get(buildUrl('accounts/kpis/', dateRange, startDate, endDate)),

    // Analytics
    getTrend: (dateRange, startDate, endDate) => api.get(buildUrl('accounts/trend/', dateRange, startDate, endDate)),
    getRecentInvoices: (limit = 5) => api.get(`accounts/recent-invoices/?limit=${limit}`),
    getExpenseCategories: (dateRange, startDate, endDate) => api.get(buildUrl('accounts/expense-categories/', dateRange, startDate, endDate)),

    // Revenues
    getRevenues: (dateRange, page = 1, startDate, endDate) => 
        api.get(buildUrl('accounts/revenues/', dateRange, startDate, endDate, [`page=${page}`])),
    getRevenue: (id) => api.get(`accounts/revenues/${id}/`),
    createRevenue: (data) => api.post('accounts/revenues/', data),
    updateRevenue: (id, data) => api.put(`accounts/revenues/${id}/`, data),
    deleteRevenue: (id) => api.delete(`accounts/revenues/${id}/`),
    voidRevenue: (id, reason) => api.post(`accounts/revenues/${id}/void/`, { reason }),

    // Expenses
    getExpenses: (dateRange, page = 1, startDate, endDate) => 
        api.get(buildUrl('accounts/expenses/', dateRange, startDate, endDate, [`page=${page}`])),
    getExpense: (id) => api.get(`accounts/expenses/${id}/`),
    createExpense: (data) => api.post('accounts/expenses/', data),
    updateExpense: (id, data) => api.put(`accounts/expenses/${id}/`, data),
    deleteExpense: (id) => api.delete(`accounts/expenses/${id}/`),
    voidExpense: (id, reason) => api.post(`accounts/expenses/${id}/void/`, { reason }),

    // Salaries
    getSalaries: (dateRange, startDate, endDate, page = 1) => 
        api.get(buildUrl('accounts/salaries/', dateRange, startDate, endDate, [`page=${page}`])),
    getSalary: (id) => api.get(`accounts/salaries/${id}/`),
    createSalary: (data) => api.post('accounts/salaries/', data),
    updateSalary: (id, data) => api.put(`accounts/salaries/${id}/`, data),
    deleteSalary: (id) => api.delete(`accounts/salaries/${id}/`),

    // Utilities
    getUtilities: (dateRange, startDate, endDate, page = 1) => 
        api.get(buildUrl('accounts/utilities/', dateRange, startDate, endDate, [`page=${page}`])),
    getUtility: (id) => api.get(`accounts/utilities/${id}/`),
    createUtility: (data) => api.post('accounts/utilities/', data),
    updateUtility: (id, data) => api.put(`accounts/utilities/${id}/`, data),
    deleteUtility: (id) => api.delete(`accounts/utilities/${id}/`),

    // Recurring Costs
    getRecurringCosts: (dateRange, startDate, endDate, page = 1) => 
        api.get(buildUrl('accounts/recurring-costs/', dateRange, startDate, endDate, [`page=${page}`])),
    getRecurringCost: (id) => api.get(`accounts/recurring-costs/${id}/`),
    createRecurringCost: (data) => api.post('accounts/recurring-costs/', data),
    updateRecurringCost: (id, data) => api.put(`accounts/recurring-costs/${id}/`, data),
    deleteRecurringCost: (id) => api.delete(`accounts/recurring-costs/${id}/`),

    // Invoices
    getInvoices: (dateRange, page = 1, pageSize = 10, startDate, endDate) => 
        api.get(buildUrl('accounts/invoices/', dateRange, startDate, endDate, [`page=${page}`, `page_size=${pageSize}`])),
    getInvoice: (id) => api.get(`accounts/invoices/${id}/`),
    createInvoice: (data) => api.post('accounts/invoices/', data),
    updateInvoice: (id, data) => api.put(`accounts/invoices/${id}/`, data),
    deleteInvoice: (id) => api.delete(`accounts/invoices/${id}/`),
    voidInvoice: (id, reason) => api.post(`accounts/invoices/${id}/void/`, { reason }),

    // Advanced & Reports
    getCOATree: (dateRange, startDate, endDate) => api.get(buildUrl('accounts/chart-tree/', dateRange, startDate, endDate)),
    getProfitLoss: (dateRange, startDate, endDate) => api.get(buildUrl('accounts/reports/profit-loss/', dateRange, startDate, endDate)),
    getBalanceSheet: (dateRange, startDate, endDate) => api.get(buildUrl('accounts/reports/balance-sheet/', dateRange, startDate, endDate)),
};
