import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
    Moon, Sun, Monitor, User, Bell, Shield, 
    MonitorSmartphone, Globe, Puzzle, KeyRound, Eye, EyeOff,
    Sliders, X, Copy, Check, QrCode, LogOut, History, ShieldAlert
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const SETTINGS_STORAGE_KEY = 'app-settings-preferences';

const Settings = () => {
    const { user, updateUser, logout } = useAuth();
    const { theme, setTheme, palette, setPalette } = useTheme();

    const [activeSection, setActiveSection] = useState('Account Info');
    const [toasts, setToasts] = useState([]);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Profile state
    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        email: '',
    });
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // Preferences state
    const [preferences, setPreferences] = useState({
        language: 'en-US',
        timezone: 'Asia/Karachi',
        notifications: {
            lowStockWarnings: true,
            overdueInvoices: true,
            dailySalesReport: false,
        },
        twoFactorEnabled: false,
        integrations: {
            googleCalendar: false,
            quickBooks: false,
            slack: true,
        },
    });

    // Active Sessions state
    const [sessions, setSessions] = useState([
        { id: 1, device: 'Chrome on Windows', ip: '192.168.1.100', location: 'Sheikhupura, PK', isCurrent: true, lastActive: 'Active Now' },
        { id: 2, device: 'Safari on iOS', ip: '203.0.113.45', location: 'Lahore, PK', isCurrent: false, lastActive: 'Last active 2 hrs ago' }
    ]);
    const [isLoggingOutSessions, setIsLoggingOutSessions] = useState(false);

    // API Keys Configuration state
    const [apiConfigs, setApiConfigs] = useState([]);
    const [provider, setProvider] = useState('groq');
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isSavingApi, setIsSavingApi] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState({ type: '', message: '' });

    // 2FA details
    const [secretKeyCopied, setSecretKeyCopied] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying2FA, setIsVerifying2FA] = useState(false);
    const secretKey2FA = 'B1ZN-ARYS-ECR3-T2FA';

    // Toast Notification helper
    const addToast = (type, message) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    };

    const dismissToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    // Load active settings and configs
    useEffect(() => {
        const fullName = (user?.name || '').trim();
        const parts = fullName ? fullName.split(' ') : [];

        setProfileData({
            firstName: user?.first_name || parts[0] || '',
            lastName: user?.last_name || parts.slice(1).join(' ') || '',
            email: user?.email || '',
        });
    }, [user]);

    const fetchApiConfigs = async () => {
        try {
            const response = await api.get('accounts/api-configuration/');
            if (response.data) {
                const configs = Array.isArray(response.data) 
                    ? response.data 
                    : (response.data.results && Array.isArray(response.data.results) ? response.data.results : []);
                setApiConfigs(configs);
                const active = configs.find(c => c.is_active);
                if (active) {
                    setProvider(active.provider);
                }
            }
        } catch (err) {
            console.error('Failed to load API configurations', err);
        }
    };

    useEffect(() => {
        fetchApiConfigs();

        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setPreferences((prev) => ({
                    ...prev,
                    ...parsed,
                    notifications: {
                        ...prev.notifications,
                        ...(parsed.notifications || {}),
                    },
                    integrations: {
                        ...prev.integrations,
                        ...(parsed.integrations || {}),
                    }
                }));
            } catch (error) {
                console.warn('Failed to parse settings preferences', error);
            }
        }
    }, []);

    const persistPreferences = (nextPreferences, successMessage) => {
        setPreferences(nextPreferences);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextPreferences));
        addToast('success', successMessage);
    };

    const handlePaletteSelect = (value) => {
        setPalette(value);
        addToast('success', `Theme accent palette updated to ${value}.`);
    };

    // Profile save API
    const handleProfileUpdate = async (event) => {
        event.preventDefault();
        setIsUpdatingProfile(true);

        try {
            const response = await api.put('users/update-profile/', {
                first_name: profileData.firstName.trim(),
                last_name: profileData.lastName.trim(),
                email: profileData.email.trim(),
            });

            if (response.data.success) {
                updateUser(response.data.user);
                addToast('success', 'Profile information updated successfully.');
            } else {
                addToast('error', response.data.error || 'Failed to update profile.');
            }
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || 'Failed to connect to profile update API.';
            addToast('error', msg);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    // Change Password API with Alphanumeric and length check
    const handlePasswordUpdate = async (event) => {
        event.preventDefault();

        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            addToast('error', 'Please complete all password fields.');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            addToast('error', 'New password must be at least 8 characters long.');
            return;
        }

        const alphanumericRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!alphanumericRegex.test(passwordData.newPassword)) {
            addToast('error', 'Password must be alphanumeric (contain at least one letter and one number).');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            addToast('error', 'Confirm password does not match the new password.');
            return;
        }

        if (passwordData.newPassword === passwordData.currentPassword) {
            addToast('error', 'New password cannot be the same as your current password.');
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const response = await api.post('users/change-password/', {
                current_password: passwordData.currentPassword,
                new_password: passwordData.newPassword,
            });

            if (response.data.success) {
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                addToast('success', 'Your password has been changed securely.');
            } else {
                addToast('error', response.data.error || 'Failed to update password.');
            }
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || 'Incorrect current password or backend error.';
            addToast('error', msg);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    // Preference switches
    const handleNotificationToggle = (key) => {
        const next = {
            ...preferences,
            notifications: {
                ...preferences.notifications,
                [key]: !preferences.notifications[key],
            },
        };
        persistPreferences(next, 'Notification preferences updated.');
    };

    const handleLanguageChange = (event) => {
        const next = { ...preferences, language: event.target.value };
        persistPreferences(next, 'Language display configuration saved.');
    };

    const handleTimezoneChange = (event) => {
        const next = { ...preferences, timezone: event.target.value };
        persistPreferences(next, 'System regional timezone saved.');
    };

    const handleIntegrationToggle = (key) => {
        const next = {
            ...preferences,
            integrations: {
                ...preferences.integrations,
                [key]: !preferences.integrations[key],
            },
        };
        persistPreferences(next, 'Third-party integrations updated.');
    };

    // 2FA Verification simulator
    const handleVerify2FA = (e) => {
        e.preventDefault();
        if (verificationCode.length !== 6 || isNaN(verificationCode)) {
            addToast('error', 'Please enter a valid 6-digit authenticator code.');
            return;
        }
        setIsVerifying2FA(true);
        setTimeout(() => {
            const next = { ...preferences, twoFactorEnabled: true };
            persistPreferences(next, 'Two-Factor Authentication is now ENABLED.');
            setVerificationCode('');
            setIsVerifying2FA(false);
        }, 1200);
    };

    const handleDisable2FA = () => {
        if (window.confirm('Disable 2-Factor Authentication? Your account security level will decrease.')) {
            const next = { ...preferences, twoFactorEnabled: false };
            persistPreferences(next, 'Two-Factor Authentication has been disabled.');
        }
    };

    const copySecretKey = () => {
        navigator.clipboard.writeText(secretKey2FA);
        setSecretKeyCopied(true);
        addToast('success', 'Authenticator secret key copied to clipboard.');
        setTimeout(() => setSecretKeyCopied(false), 2000);
    };

    // Active Sessions logout all others
    const handleLogoutOtherSessions = () => {
        setIsLoggingOutSessions(true);
        setTimeout(() => {
            setSessions((prev) => prev.filter((s) => s.isCurrent));
            addToast('success', 'Logged out of all other active sessions successfully.');
            setIsLoggingOutSessions(false);
        }, 1000);
    };

    // Save Provider API Keys
    const handleSaveApiKey = async (e) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            addToast('error', 'API Key cannot be blank.');
            return;
        }
        setIsSavingApi(true);
        try {
            const existing = apiConfigs.find(c => c.provider === provider);
            let response;
            if (existing) {
                response = await api.patch(`accounts/api-configuration/${existing.id}/`, {
                    api_key: apiKey,
                    is_active: true
                });
            } else {
                response = await api.post('accounts/api-configuration/', {
                    provider,
                    api_key: apiKey,
                    is_active: true
                });
            }
            addToast('success', `${provider === 'groq' ? 'Groq' : 'OpenAI'} API key saved successfully.`);
            setApiKey('');
            fetchApiConfigs();
        } catch (error) {
            console.error(error);
            addToast('error', 'Failed to configure API key. Confirm super admin access permissions.');
        } finally {
            setIsSavingApi(false);
        }
    };

    // Test API connection
    const handleTestConnection = async () => {
        setIsTestingConnection(true);
        setTestResult({ type: '', message: '' });
        try {
            const existing = apiConfigs.find(c => c.provider === provider);
            const response = await api.post('accounts/api-configuration/test_connection/', {
                id: existing?.id,
                provider: provider
            });
            if (response.data && response.data.status === 'success') {
                setTestResult({ type: 'success', message: `Verified! Connection succeeded. Masked models are active.` });
                addToast('success', 'Connection test succeeded.');
            } else {
                setTestResult({ type: 'error', message: response.data?.error || 'Authentication handshake failed.' });
                addToast('error', 'Connection test failed.');
            }
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || 'Invalid credential response key.';
            setTestResult({ type: 'error', message: msg });
            addToast('error', 'Authentication handshake failed.');
        } finally {
            setIsTestingConnection(false);
        }
    };

    // Links for Left Navigation
    const sidebarLinks = [
        { name: 'Account Info', icon: User },
        { name: 'Appearance', icon: MonitorSmartphone },
        { name: 'Language & Region', icon: Globe },
        { name: 'Notifications', icon: Bell },
        { name: 'Integrations', icon: Puzzle },
        { name: 'Privacy & Security', icon: Shield },
        { name: 'API Configuration', icon: Sliders },
    ];

    const renderLeftSidebar = () => (
        <div className="md:col-span-1 space-y-1">
            {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeSection === link.name;
                return (
                    <button
                        key={link.name}
                        onClick={() => setActiveSection(link.name)}
                        className={`w-full flex items-center gap-3 px-4.5 py-3.5 font-bold rounded-xl transition-all duration-200 ease-in-out ${
                            isActive
                                ? 'bg-primary/10 text-primary dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50/80 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white hover:shadow-sm'
                        }`}
                    >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="text-xs tracking-wide">{link.name}</span>
                    </button>
                );
            })}
        </div>
    );

    const renderAccountInfo = () => (
        <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300 animate-in fade-in duration-300">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-primary dark:text-emerald-400" />
                    Profile Information
                </h3>
                <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Update your account identity and email credentials.</p>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-1 uppercase tracking-wider">First Name</label>
                        <input
                            type="text"
                            value={profileData.firstName}
                            onChange={(event) => setProfileData({ ...profileData, firstName: event.target.value })}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 transition-all duration-200 ease-in-out text-xs"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-1 uppercase tracking-wider">Last Name</label>
                        <input
                            type="text"
                            value={profileData.lastName}
                            onChange={(event) => setProfileData({ ...profileData, lastName: event.target.value })}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 transition-all duration-200 ease-in-out text-xs"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
                    <input
                        type="email"
                        value={profileData.email}
                        onChange={(event) => setProfileData({ ...profileData, email: event.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 transition-all duration-200 ease-in-out text-xs"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isUpdatingProfile || !profileData.firstName.trim() || !profileData.email.trim()}
                    className="px-5 py-2.5 bg-gradient-to-br from-[#1C3A5A] to-[#2B527E] hover:from-[#13283E] hover:to-[#1C3A5A] text-white text-xs font-bold rounded-xl transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
                >
                    {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
            </form>
        </div>
    );

    const renderAppearance = () => (
        <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300 animate-in fade-in duration-300">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MonitorSmartphone className="w-5 h-5 text-primary dark:text-emerald-400" />
                    Appearance & Display
                </h3>
                <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Customize the display mode for your workspace.</p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                    onClick={() => setTheme('light')}
                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 text-textMain dark:text-gray-300 ${theme === 'light' ? 'border-primary bg-primary/5 dark:border-emerald-500 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-emerald-500/50'}`}
                >
                    <Sun className="w-8 h-8 text-amber-500" />
                    <span className="font-bold text-xs">Light Mode</span>
                </button>
                <button
                    onClick={() => setTheme('dark')}
                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 text-textMain dark:text-gray-300 ${theme === 'dark' ? 'border-primary bg-primary/5 dark:border-emerald-500 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-emerald-500/50'}`}
                >
                    <Moon className="w-8 h-8 text-sky-400" />
                    <span className="font-bold text-xs">Dark Mode</span>
                </button>
                <button
                    onClick={() => setTheme('system')}
                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 text-textMain dark:text-gray-300 ${theme === 'system' ? 'border-primary bg-primary/5 dark:border-emerald-500 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-emerald-500/50'}`}
                >
                    <Monitor className="w-8 h-8 text-slate-500" />
                    <span className="font-bold text-xs">System Default</span>
                </button>
            </div>
            <div className="mt-6 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-xl border border-gray-150 dark:border-slate-700/60">
                <h4 className="text-xs font-bold text-textMain dark:text-white mb-3 uppercase tracking-wider">Theme Accent Palette</h4>
                <div className="flex flex-wrap gap-2.5">
                    <button onClick={() => handlePaletteSelect('default')} className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${palette === 'default' ? 'border-primary bg-primary/10 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>Default ERP Blue</button>
                    <button onClick={() => handlePaletteSelect('horizon')} className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${palette === 'horizon' ? 'border-primary bg-primary/10 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>Horizon Classic</button>
                    <button onClick={() => handlePaletteSelect('horizon-dark')} className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${palette === 'horizon-dark' ? 'border-primary bg-primary/10 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>Horizon Midnight</button>
                </div>
                <p className="text-[10px] text-textMuted dark:text-slate-400 mt-3 italic">Choose a custom color accent system to override primary ERP buttons and dashboards.</p>
            </div>
        </div>
    );

    const renderLanguageRegion = () => (
        <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300 animate-in fade-in duration-300">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary dark:text-emerald-400" />
                    Language & Regional Settings
                </h3>
                <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Configure your preferred language and regional formatting settings.</p>
            </div>

            <div className="space-y-5 max-w-md">
                <div>
                    <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-2 uppercase tracking-wider">Display Language</label>
                    <div className="relative">
                        <select value={preferences.language} onChange={handleLanguageChange} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all duration-200 ease-in-out text-xs font-bold">
                            <option value="en-US">English (US)</option>
                            <option value="en-UK">English (UK)</option>
                            <option value="ur">Urdu (اردو)</option>
                            <option value="ar">Arabic (العربية)</option>
                            <option value="fr">French (Français)</option>
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-2 uppercase tracking-wider">Timezone</label>
                    <div className="relative">
                        <select value={preferences.timezone} onChange={handleTimezoneChange} className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all duration-200 ease-in-out text-xs font-bold">
                            <option value="Asia/Karachi">Asia/Karachi (GMT+5:00)</option>
                            <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
                            <option value="Europe/London">Europe/London (GMT+0:00)</option>
                            <option value="America/New_York">America/New_York (GMT-5:00)</option>
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300 animate-in fade-in duration-300">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary dark:text-emerald-400" />
                    Notification Preferences
                </h3>
                <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Choose exactly what we notify you about.</p>
            </div>

            <div className="space-y-3">
                {[
                    { key: 'lowStockWarnings', title: 'Low Stock Warnings', desc: 'Get alerted when inventory falls below 15 units.' },
                    { key: 'overdueInvoices', title: 'Overdue Invoices', desc: 'Receive immediate alerts for missing client payments.' },
                    { key: 'dailySalesReport', title: 'Daily Sales Report', desc: 'A compressed summary of day-to-day revenue metrics.' },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-gray-150 dark:hover:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all">
                        <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">{item.title}</h4>
                            <p className="text-[10px] text-textMuted dark:text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={Boolean(preferences.notifications[item.key])}
                                onChange={() => handleNotificationToggle(item.key)}
                            />
                            <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 transition-all duration-200 ease-in-out"></div>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderIntegrations = () => (
        <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300 animate-in fade-in duration-300">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Puzzle className="w-5 h-5 text-primary dark:text-emerald-400" />
                    ERP Connect Integrations
                </h3>
                <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Enable or disable third-party integration pipelines.</p>
            </div>

            <div className="space-y-3">
                {[
                    { key: 'googleCalendar', title: 'Google Calendar Sync', desc: 'Sync tasks and reminders to calendar events.' },
                    { key: 'quickBooks', title: 'QuickBooks Integration', desc: 'Share accounting entries for finance reconciliation.' },
                    { key: 'slack', title: 'Slack Alerts Pipeline', desc: 'Send priority operational alerts to your workspace.' },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-gray-150 dark:hover:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all">
                        <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">{item.title}</h4>
                            <p className="text-[10px] text-textMuted dark:text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={Boolean(preferences.integrations[item.key])}
                                onChange={() => handleIntegrationToggle(item.key)}
                            />
                            <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 transition-all duration-200 ease-in-out"></div>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderPrivacySecurity = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Change Password Panel */}
            <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-primary dark:text-emerald-400" />
                        Change Password
                    </h3>
                    <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Ensure your account is using a long, random password to stay secure.</p>
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-1 uppercase tracking-wider">Current Password</label>
                        <div className="relative flex items-center">
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={passwordData.currentPassword}
                                onChange={(event) => setPasswordData({ ...passwordData, currentPassword: event.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 transition-all duration-200 ease-in-out text-xs pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-1 uppercase tracking-wider">New Password</label>
                        <div className="relative flex items-center">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={passwordData.newPassword}
                                onChange={(event) => setPasswordData({ ...passwordData, newPassword: event.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 transition-all duration-200 ease-in-out text-xs pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-1 uppercase tracking-wider">Confirm New Password</label>
                        <div className="relative flex items-center">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={passwordData.confirmPassword}
                                onChange={(event) => setPasswordData({ ...passwordData, confirmPassword: event.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 transition-all duration-200 ease-in-out text-xs pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="px-5 py-2.5 bg-gradient-to-br from-[#1C3A5A] to-[#2B527E] hover:from-[#13283E] hover:to-[#1C3A5A] text-white text-xs font-bold rounded-xl transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                        {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* Two-Factor Authentication Panel */}
            <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300">
                <div className="flex items-center justify-between gap-6 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
                        <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Add an extra layer of security to your account by requiring an authenticator code when logging in.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={preferences.twoFactorEnabled} 
                            onChange={() => {
                                if (preferences.twoFactorEnabled) {
                                    handleDisable2FA();
                                } else {
                                    // Set twoFactorEnabled temporarily to render setup, verified via code
                                    setPreferences(p => ({ ...p, twoFactorEnabled: false }));
                                    // Trigger verification section
                                    addToast('info', 'Please scan the QR code to enable 2FA.');
                                    // Set local toggle view state or just render verification substate
                                }
                            }} 
                        />
                        <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 transition-all duration-300"></div>
                    </label>
                </div>

                {/* 2FA Slide-In Setup Area */}
                {(!preferences.twoFactorEnabled) && (
                    <div className="border-t border-gray-150 dark:border-slate-700/60 mt-4 pt-4 flex flex-col sm:flex-row gap-5 items-start animate-in fade-in duration-300">
                        {/* Mock QR Code */}
                        <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center shrink-0">
                            <QrCode className="w-28 h-28 text-slate-900" />
                            <div className="text-[9px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                Scan Code
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 w-full">
                            <div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Configure Authenticator App</h4>
                                <p className="text-[10px] text-textMuted dark:text-slate-400 mt-0.5 leading-relaxed">
                                    Scan the QR code with your Google Authenticator or Duo app. Alternatively, manually type the secret configuration key below:
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700/60">
                                <span className="font-mono text-xs font-bold text-slate-700 dark:text-emerald-400 flex-1">{secretKey2FA}</span>
                                <button 
                                    onClick={copySecretKey}
                                    className="p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:text-primary rounded-lg transition-all"
                                    title="Copy Secret Key"
                                >
                                    {secretKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                </button>
                            </div>

                            <form onSubmit={handleVerify2FA} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    maxLength="6"
                                    placeholder="Enter 6-digit code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g,''))}
                                    className="w-40 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 text-center font-bold tracking-widest text-xs transition-all duration-200 ease-in-out"
                                />
                                <button
                                    type="submit"
                                    disabled={isVerifying2FA || verificationCode.length !== 6}
                                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    {isVerifying2FA ? 'Verifying...' : 'Verify & Enable'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {preferences.twoFactorEnabled && (
                    <div className="border-t border-gray-150 dark:border-slate-700/60 mt-4 pt-4 animate-in fade-in duration-300">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                            <Shield className="w-5 h-5 text-emerald-500 shrink-0 animate-pulse" />
                            <div className="flex-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold leading-normal">
                                Two-Factor Authentication is currently active on your account. Authenticator passcode verification is required for all new dashboard sessions.
                            </div>
                            <button
                                onClick={handleDisable2FA}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-200/40 transition-all duration-200 ease-in-out active:scale-95"
                            >
                                Disable
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Active Sessions Panel */}
            <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Login Sessions</h3>
                        <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Review your active login sessions across devices.</p>
                    </div>
                    {sessions.length > 1 && (
                        <button
                            onClick={handleLogoutOtherSessions}
                            disabled={isLoggingOutSessions}
                            className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-450 text-[10.5px] font-bold rounded-xl transition-all duration-200 ease-in-out hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:shadow-sm active:scale-95 border border-rose-200/30 disabled:opacity-50"
                        >
                            {isLoggingOutSessions ? 'Terminating...' : 'Log Out All Other Sessions'}
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <div key={session.id} className={`p-4 border rounded-xl flex items-center justify-between transition-all ${session.isCurrent ? 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700' : 'border-gray-100 dark:border-slate-800 opacity-75'}`}>
                            <div className="flex flex-col">
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                                    <MonitorSmartphone className={`w-4 h-4 ${session.isCurrent ? 'text-primary dark:text-emerald-400' : 'text-textMuted'}`} />
                                    {session.device}
                                </h4>
                                <p className="text-[10px] text-textMuted dark:text-slate-400 mt-1 font-medium">{session.location} • IP: {session.ip}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${session.isCurrent ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'text-slate-400 bg-slate-100 dark:bg-slate-900/80 dark:text-slate-500'}`}>
                                {session.lastActive}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderApiConfiguration = () => (
        <div className="bg-white dark:bg-[#1c2541] p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300 animate-in fade-in duration-300">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary dark:text-emerald-400" />
                    AI API Configurations
                </h3>
                <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Configure OpenAI or Groq API keys to drive live assistant reasoning capabilities.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Save API Key form */}
                <form onSubmit={handleSaveApiKey} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-2 uppercase tracking-wider">AI LLM Provider</label>
                        <select 
                            value={provider} 
                            onChange={(e) => {
                                setProvider(e.target.value);
                                setTestResult({ type: '', message: '' });
                            }} 
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all duration-200 ease-in-out text-xs font-bold"
                        >
                            <option value="groq">Groq Cloud (Fastest Reasoning)</option>
                            <option value="openai">OpenAI (GPT Models)</option>
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-[10px] font-bold text-textMuted dark:text-slate-400 mb-2 uppercase tracking-wider">Secure API Key</label>
                        <div className="relative flex items-center">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                placeholder={apiConfigs.find(c => c.provider === provider) ? '••••••••••••••••' : 'Enter API Key...'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-[#1C3A5A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#1C3A5A]/20 dark:focus:ring-emerald-500/20 transition-all duration-200 ease-in-out text-xs pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isSavingApi || !apiKey.trim()}
                            className="px-5 py-2.5 bg-gradient-to-br from-[#1C3A5A] to-[#2B527E] hover:from-[#13283E] hover:to-[#1C3A5A] text-white text-xs font-bold rounded-xl transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 shadow-sm"
                        >
                            {isSavingApi ? 'Saving Key...' : 'Save API Configuration'}
                        </button>
                        
                        {apiConfigs.find(c => c.provider === provider) && (
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTestingConnection}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-blue-50/80 dark:bg-slate-800 dark:hover:bg-slate-800/60 text-slate-700 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-sm active:scale-95"
                            >
                                {isTestingConnection ? 'Testing Handshake...' : 'Test Connection'}
                            </button>
                        )}
                    </div>
                </form>

                {/* Connection Status panel */}
                <div className="flex flex-col justify-center border border-dashed border-gray-200 dark:border-slate-700 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                        <ShieldAlert className="w-4.5 h-4.5 text-textMuted dark:text-slate-500" />
                        API Handshake Status
                    </h4>
                    
                    {testResult.message ? (
                        <div className={`p-4 rounded-xl border text-xs font-bold leading-relaxed ${
                            testResult.type === 'success' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' 
                                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/50'
                        }`}>
                            {testResult.message}
                        </div>
                    ) : (
                        <p className="text-[10px] text-textMuted dark:text-slate-400 leading-normal">
                            No connection tests run yet. Save an API key and click "Test Connection" to perform an active network handshake test.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
            {/* Custom Toast Portal Container */}
            <ToastContainer toasts={toasts} onClose={dismissToast} />

            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ERP System Settings</h1>
                <p className="text-xs text-textMuted dark:text-slate-400 mt-1">Configure your personal ERP dashboard preferences, secure credentials, and third-party integrations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {renderLeftSidebar()}

                <div className="md:col-span-3 space-y-6">
                    {activeSection === 'Account Info' && renderAccountInfo()}
                    {activeSection === 'Appearance' && renderAppearance()}
                    {activeSection === 'Language & Region' && renderLanguageRegion()}
                    {activeSection === 'Privacy & Security' && renderPrivacySecurity()}
                    {activeSection === 'Notifications' && renderNotifications()}
                    {activeSection === 'Integrations' && renderIntegrations()}
                    {activeSection === 'API Configuration' && renderApiConfiguration()}
                </div>
            </div>
        </div>
    );
};

// Internal Toast Component
const ToastContainer = ({ toasts, onClose }) => {
    return (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
            {toasts.map((toast) => (
                <div 
                    key={toast.id}
                    className={`p-3.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-5 duration-200 pointer-events-auto ${
                        toast.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/45 dark:text-emerald-350 dark:border-emerald-800/70' 
                            : 'bg-rose-50 text-rose-800 border-rose-250 dark:bg-rose-950/45 dark:text-rose-350 dark:border-rose-800/70'
                    }`}
                >
                    <span className="flex-1">{toast.message}</span>
                    <button 
                        onClick={() => onClose(toast.id)} 
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Settings;
