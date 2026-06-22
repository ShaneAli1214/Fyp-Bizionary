import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Menu,
    Search,
    Moon,
    Sun,
    ChevronDown,
    LogOut,
    User,
    Settings,
    History,
    Sliders,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import Logo from '../common/Logo';

const Topbar = () => {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { isCollapsed, toggleCollapsed, setMobileOpen } = useSidebar();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const getActiveWorkspaceName = () => {
        const path = location.pathname;
        if (path === '/') return 'Home';
        if (path.startsWith('/accounts')) return 'Accounting';
        if (path.startsWith('/products')) return 'Products';
        if (path.startsWith('/inventory-managment')) return 'Stock';
        if (path.startsWith('/sales')) return 'Selling';
        if (path.startsWith('/ordered-slips')) return 'Buying';
        if (path.startsWith('/chatbot')) return 'AI Chatbot';
        if (path.startsWith('/user-management')) return 'Admin';
        return 'Home';
    };

    const isAccountant = user?.role_name === 'Accountant';

    const displayName = user?.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : (user?.username || 'User');

    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <header className="h-12 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-[color:var(--dm-topbar,#1f1f1f)] border-b border-gray-100 dark:border-[#242424] shrink-0 z-30 print:hidden">

            {/* Left — hamburger toggle */}
            <div className="flex items-center gap-2">
                {/* Desktop toggle button + Logo (only visible when sidebar is collapsed) */}
                {isCollapsed && (
                    <div className="hidden lg:flex items-center gap-2 mr-2">
                        <button
                            onClick={toggleCollapsed}
                            className="p-1.5 text-textMuted hover:text-textMain hover:bg-gray-100 dark:hover:bg-[#292929] rounded-lg transition-colors cursor-pointer"
                            aria-label="Open navigation"
                        >
                            <Menu className="w-4.5 h-4.5" />
                        </button>
                        <Logo className="h-6 w-auto text-gray-900 dark:text-white shrink-0" />
                        <span className="text-sm font-black text-gray-900 dark:text-[#d9d9d9] tracking-wider uppercase">
                            Bizionary
                        </span>
                    </div>
                )}
                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileOpen(true)}
                    className="lg:hidden p-1.5 text-textMuted hover:text-textMain hover:bg-gray-100 dark:hover:bg-[#292929] rounded-lg transition-colors"
                    aria-label="Open navigation"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Show page title in topbar next to hamburger when collapsed */}
                {isCollapsed && (
                    <span className="hidden lg:inline text-base font-bold text-gray-800 dark:text-[#d9d9d9] ml-1">
                        {getActiveWorkspaceName()}
                    </span>
                )}
            </div>

            {/* Center — search (hidden on small screens) */}
            <div className="hidden md:flex items-center flex-1 max-w-xs mx-6">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-[#292929] border border-gray-200 dark:border-[#383838] rounded-lg text-textMain dark:text-[#d9d9d9] placeholder-textMuted dark:placeholder-[#7a7a7a] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-[#76bef9]/20 focus:border-gray-400 dark:focus:border-[#76bef9] transition-all"
                    />
                </div>
            </div>

            {/* Right — theme toggle + profile */}
            <div className="flex items-center gap-2">
                {/* Dark mode toggle */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-1.5 text-textMuted hover:text-textMain hover:bg-gray-100 dark:hover:bg-[#292929] rounded-lg transition-colors"
                    aria-label="Toggle dark mode"
                >
                    {theme === 'dark'
                        ? <Sun className="w-4 h-4" />
                        : <Moon className="w-4 h-4" />
                    }
                </button>

                {/* Profile dropdown */}
                <div className="relative">
                    {isDropdownOpen && (
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsDropdownOpen(false)}
                        />
                    )}

                    <button
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#292929] transition-colors cursor-pointer select-none focus:outline-none relative z-50"
                    >
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#383838] text-gray-700 dark:text-[#d9d9d9] flex items-center justify-center font-bold text-xs uppercase">
                            {initials}
                        </div>
                        <span className="hidden sm:inline text-xs font-semibold text-textMain max-w-[100px] truncate">
                            {user?.first_name || user?.username || 'User'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-textMuted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    <div className={`
                        absolute right-0 mt-2 w-64 sm:w-72
                        bg-white dark:bg-[color:var(--dm-surface-elevated,#242424)]
                        rounded-2xl shadow-2xl
                        border border-gray-200/80 dark:border-[#383838]
                        p-4 text-gray-800 dark:text-[#d9d9d9]
                        z-50 flex flex-col gap-3.5
                        transition-all duration-200 origin-top-right
                        ${isDropdownOpen ? 'scale-100 opacity-100 visible' : 'scale-95 opacity-0 invisible pointer-events-none'}
                    `}>
                        {/* User summary */}
                        <div className="px-2 pb-3 border-b border-slate-100 dark:border-[#383838] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#383838] text-gray-700 dark:text-[#d9d9d9] flex items-center justify-center font-bold text-sm uppercase">
                                {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-slate-900 dark:text-[#f8f8f8] truncate">{displayName}</span>
                                <span className="text-[10px] text-gray-400 dark:text-[#999999] truncate">{user?.email || '—'}</span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-gray-400 dark:text-[#7a7a7a] uppercase tracking-wider px-2 mb-1">Quick Actions</span>
                            {[
                                { icon: User, label: 'My Profile', to: '/settings' },
                                { icon: Settings, label: 'Account Settings', to: '/settings' },
                                { icon: History, label: 'Activity Log', to: isAccountant ? '/settings' : '/user-management' },
                            ].map(({ icon: Icon, label, to }) => (
                                <button
                                    key={label}
                                    onClick={() => { setIsDropdownOpen(false); navigate(to); }}
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-gray-600 dark:text-[#afafaf] hover:bg-gray-50 dark:hover:bg-[#383838] hover:text-gray-900 dark:hover:text-[#d9d9d9] hover:pl-4 transition-all duration-200"
                                >
                                    <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-[#999999]" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Preferences */}
                        <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-[#383838] pt-3">
                            <span className="text-[9px] font-bold text-gray-400 dark:text-[#7a7a7a] uppercase tracking-wider px-2 mb-0.5">Preferences</span>
                            <div className="flex items-center justify-between px-2 py-1">
                                <span className="text-xs font-semibold text-gray-600 dark:text-[#afafaf]">Dark Mode</span>
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                        theme === 'dark' ? 'bg-[#1c6ec4]' : 'bg-gray-200 dark:bg-[#383838]'
                                    }`}
                                    aria-label="Toggle theme"
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            {!isAccountant && (
                                <button
                                    onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-gray-600 dark:text-[#afafaf] hover:bg-gray-50 dark:hover:bg-[#383838] hover:text-gray-900 dark:hover:text-[#d9d9d9] hover:pl-4 transition-all duration-200"
                                >
                                    <Sliders className="h-3.5 w-3.5 text-gray-400 dark:text-[#999999]" />
                                    <span>API Configuration</span>
                                </button>
                            )}
                        </div>

                        {/* Logout */}
                        <div className="border-t border-slate-100 dark:border-[#383838] pt-3">
                            <button
                                onClick={() => { setIsDropdownOpen(false); logout(); }}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/35 hover:pl-4 transition-all duration-200"
                            >
                                <LogOut className="h-3.5 w-3.5 text-rose-500" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
