import api from './api';

export const insightsApi = {
    getInsights: () => api.get('insights/'),
    getLiveInsights: () => api.get('insights/live/'),
    getPricingSuggestions: () => api.get('insights/pricing/'),
    getDemandAlerts: () => api.get('insights/demand-alerts/'),
    getStockWarnings: () => api.get('insights/stock-warnings/'),
    getSmartReorderEngine: (params = {}) => {
        const days = params.days ?? 30;
        const leadTimeDays = params.lead_time_days ?? 7;
        const coverageDays = params.coverage_days ?? 14;
        return api.get(`insights/smart-reorder/?days=${days}&lead_time_days=${leadTimeDays}&coverage_days=${coverageDays}`);
    },
    getLiveNlpReport: (days = 30) => api.get(`insights/nlp-report/live/?days=${days}`),
    getCustomerReviews: (limit = 20) => api.get(`insights/customer-reviews/?limit=${limit}`),
    createCustomerReview: (payload) => api.post('insights/customer-reviews/', payload),
};
