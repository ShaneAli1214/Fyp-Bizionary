import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/',
});

// Request interceptor to attach the auth token and disable caching
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        const isPublicAnalyticsEndpoint = (config.url || '').startsWith('insights/') || (config.url || '').startsWith('dashboard/');
        if (token && !isPublicAnalyticsEndpoint) {
            config.headers['Authorization'] = `Bearer ${token}`;
        } else if (config.headers && config.headers['Authorization']) {
            delete config.headers['Authorization'];
        }
        // Add timestamp to prevent caching
        config.params = config.params || {};
        config.params.t = Date.now();
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 Unauthorized and log responses
api.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        console.error(`API Error: ${error.response?.status || 'Unknown'} ${error.config?.url}`);
        console.error('Error details:', error.response?.data || error.message);
        if (error.response && error.response.status === 401) {
            // Handle unauthorized (e.g., redirect to login)
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-expired'));
        }
        return Promise.reject(error);
    }
);

export default api;
