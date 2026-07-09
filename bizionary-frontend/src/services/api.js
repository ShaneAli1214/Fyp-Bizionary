import axios from 'axios';

// In-memory variable to store the access token (protects against XSS)
let accessToken = '';

export const setAccessToken = (token) => {
    accessToken = token;
};

export const getAccessToken = () => {
    return accessToken;
};

let rawBaseURL = import.meta.env.VITE_API_URL || '/api/';
// Ensure it resolves to the standard /api/ prefix
if (rawBaseURL !== '/api/' && !rawBaseURL.endsWith('/api') && !rawBaseURL.endsWith('/api/')) {
    rawBaseURL = rawBaseURL.endsWith('/') ? `${rawBaseURL}api/` : `${rawBaseURL}/api/`;
} else if (rawBaseURL !== '/api/' && rawBaseURL.endsWith('/api')) {
    rawBaseURL = `${rawBaseURL}/`;
}

export const API_BASE_URL = rawBaseURL;

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Allow cookies to be shared across ports in development
});

// Request interceptor to attach the auth token and disable caching
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
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

// Token refreshing state and queue to hold requests during refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor to handle 401 Unauthorized and log responses
api.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        console.error(`API Error: ${error.response?.status || 'Unknown'} ${error.config?.url}`);
        
        // Intercept 401 errors, excluding the refresh token call itself
        if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('auth/refresh')) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint to fetch a new access token
                const refreshUrl = API_BASE_URL + 'user-management/auth/refresh/';
                const response = await axios.post(refreshUrl, {}, { withCredentials: true });
                const { token: newAccessToken } = response.data;
                
                setAccessToken(newAccessToken);
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                processQueue(null, newAccessToken);
                
                isRefreshing = false;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;
                
                // Clear state on failure and redirect
                setAccessToken('');
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('auth-expired'));
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;
