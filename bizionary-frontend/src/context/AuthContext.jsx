import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const silentRefresh = async () => {
        try {
            // Attempt to fetch fresh access token using HttpOnly cookie
            const response = await api.post('user-management/auth/refresh/');
            const { token, user: userData } = response.data;
            
            setAccessToken(token);
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
            console.warn("Silent refresh failed on boot. Session expired or unauthenticated.");
            setAccessToken('');
            setUser(null);
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Run silent refresh on application startup to restore session
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            silentRefresh();
        } else {
            setLoading(false);
        }

        // Listen for auth expiration events from Axios interceptor
        const handleAuthExpired = () => {
            setAccessToken('');
            setUser(null);
            localStorage.removeItem('user');
        };

        window.addEventListener('auth-expired', handleAuthExpired);

        return () => {
            window.removeEventListener('auth-expired', handleAuthExpired);
        };
    }, []);

    const login = async (credentials) => {
        try {
            // Hit auth login endpoint
            const response = await api.post('user-management/auth/login/', credentials);
            
            // Handle password change required state
            if (response.data?.password_change_required) {
                const { token, user: userData } = response.data;
                setAccessToken(token);
                const forcedUser = { ...userData, requires_password_change: true };
                localStorage.setItem('user', JSON.stringify(forcedUser));
                setUser(forcedUser);
                return {
                    success: true,
                    passwordChangeRequired: true,
                    token: token
                };
            }

            // Handle 2FA intermediate state
            if (response.data?.two_factor_required) {
                return { 
                    success: true, 
                    twoFactorRequired: true, 
                    mfaToken: response.data.mfa_token 
                };
            }

            const { token, user: userData } = response.data;
            
            // Store access token in memory, not localStorage
            setAccessToken(token);
            
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true };
        } catch (error) {
            console.error("API login failed:", error);
            throw error;
        }
    };

    const loginWithMFA = async (mfaToken, code) => {
        try {
            const response = await api.post('user-management/auth/verify-2fa/', {
                mfa_token: mfaToken,
                code: code
            });

            const { token, user: userData } = response.data;
            
            setAccessToken(token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true };
        } catch (error) {
            console.error("MFA verification login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await api.post('user-management/auth/logout/', {});
        } catch (error) {
            console.warn("API logout call failed:", error);
        } finally {
            setAccessToken('');
            setUser(null);
            localStorage.removeItem('user');
        }
    };

    const updateUser = (nextUser) => {
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
    };

    const value = {
        user,
        loading,
        login,
        loginWithMFA,
        logout,
        updateUser
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
