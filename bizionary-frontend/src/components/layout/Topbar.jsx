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
        <header className="h-12 flex items-center justify-between px-4 md:px-6 bg-page border-b border-card shrink-0 z-30 print:hidden">

            {/* Left — hamburger toggle */}
            <div className="flex items-center gap-2">
                {/* Desktop toggle button + Logo (only visible when sidebar is collapsed) */}
                {isCollapsed && (
                    <div className="hidden lg:flex items-center gap-2 mr-2">
                        <button
                            onClick={toggleCollapsed}
                            className="p-1.5 text-secondary hover:text-primary hover:bg-active-pill/30 rounded-xl transition-colors cursor-pointer"
                            aria-label="Open navigation"
                        >
                            <Menu className="w-4.5 h-4.5" />
                        </button>
                        <Logo className="h-6 w-auto text-primary shrink-0" />
                        <span className="text-sm font-black text-primary tracking-wider uppercase">
                            Bizionary
                        </span>
                    </div>
                )}
                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileOpen(true)}
                    className="lg:hidden p-1.5 text-secondary hover:text-primary hover:bg-active-pill/30 rounded-xl transition-colors"
                    aria-label="Open navigation"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Show page title in topbar when collapsed */}
                {isCollapsed && (
                    <span className="hidden lg:inline text-base font-bold text-primary ml-1">
                        {getActiveWorkspaceName()}
                    </span>
                )}
            </div>

            {/* Center — search */}
            <div className="hidden md:flex items-center flex-1 max-w-xs mx-6">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-card border border-card rounded-xl text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-active-pill focus:border-active-pill transition-all"
                    />
                </div>
            </div>

            {/* Right — profile */}
            <div className="flex items-center gap-2">
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
                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-active-pill/30 transition-colors cursor-pointer select-none focus:outline-none relative z-50"
                    >
                        <div className="w-7 h-7 rounded-full bg-active-pill text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {initials}
                        </div>
                        <span className="hidden sm:inline text-xs font-semibold text-primary max-w-[100px] truncate">
                            {user?.first_name || user?.username || 'User'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-secondary transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    <div className={`
                        absolute right-0 mt-2 w-64 sm:w-72
                        bg-card border border-card
                        rounded-2xl shadow-2xl
                        p-4 text-primary
                        z-50 flex flex-col gap-3.5
                        transition-all duration-200 origin-top-right
                        ${isDropdownOpen ? 'scale-100 opacity-100 visible' : 'scale-95 opacity-0 invisible pointer-events-none'}
                    `}>
                        {/* User summary */}
                        <div className="px-2 pb-3 border-b border-card flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-active-pill text-primary flex items-center justify-center font-bold text-sm uppercase">
                                {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-primary truncate">{displayName}</span>
                                <span className="text-[10px] text-secondary truncate">{user?.email || '—'}</span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-secondary uppercase tracking-wider px-2 mb-1">Quick Actions</span>
                            {[
                                { icon: User, label: 'My Profile', to: '/settings' },
                                { icon: Settings, label: 'Account Settings', to: '/settings' },
                                { icon: History, label: 'Activity Log', to: isAccountant ? '/settings' : '/user-management' },
                            ].map(({ icon: Icon, label, to }) => (
                                <button
                                    key={label}
                                    onClick={() => { setIsDropdownOpen(false); navigate(to); }}
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-left text-xs font-semibold text-primary hover:bg-active-pill/20 hover:pl-4 transition-all duration-200"
                                >
                                    <Icon className="h-3.5 w-3.5 text-secondary" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Preferences */}
                        {!isAccountant && (
                            <div className="flex flex-col gap-1.5 border-t border-card pt-3">
                                <span className="text-[9px] font-bold text-secondary uppercase tracking-wider px-2 mb-0.5">Preferences</span>
                                <button
                                    onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-left text-xs font-semibold text-primary hover:bg-active-pill/20 hover:pl-4 transition-all duration-200"
                                >
                                    <Sliders className="h-3.5 w-3.5 text-secondary" />
                                    <span>API Configuration</span>
                                </button>
                            </div>
                        )}

                        {/* Logout */}
                        <div className="border-t border-card pt-3">
                            <button
                                onClick={() => { setIsDropdownOpen(false); logout(); }}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-left text-xs font-bold text-status-info hover:bg-active-pill/20 hover:pl-4 transition-all duration-200"
                            >
                                <LogOut className="h-3.5 w-3.5 text-status-info" />
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
