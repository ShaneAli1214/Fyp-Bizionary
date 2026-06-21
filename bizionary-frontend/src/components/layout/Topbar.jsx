import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const Topbar = () => {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { setMobileOpen } = useSidebar();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        <header className="h-12 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-[#0A1628] border-b border-gray-100 dark:border-slate-800/60 shrink-0 z-30 print:hidden">

            {/* Left — mobile hamburger only */}
            <div className="flex items-center">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="lg:hidden p-1.5 text-textMuted hover:text-textMain hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label="Open navigation"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Center — search (hidden on small screens) */}
            <div className="hidden md:flex items-center flex-1 max-w-xs mx-6">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
            </div>

            {/* Right — theme toggle + profile */}
            <div className="flex items-center gap-2">
                {/* Dark mode toggle */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-1.5 text-textMuted hover:text-textMain hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none focus:outline-none relative z-50"
                    >
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-xs uppercase">
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
                        bg-white dark:bg-[#0b1220]
                        rounded-2xl shadow-2xl
                        border border-slate-200/85 dark:border-slate-800/80
                        p-4 text-slate-800 dark:text-slate-200
                        z-50 flex flex-col gap-3.5
                        transition-all duration-200 origin-top-right
                        ${isDropdownOpen ? 'scale-100 opacity-100 visible' : 'scale-95 opacity-0 invisible pointer-events-none'}
                    `}>
                        {/* User summary */}
                        <div className="px-2 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-sm uppercase">
                                {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{displayName}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email || '—'}</span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1">Quick Actions</span>
                            {[
                                { icon: User, label: 'My Profile', to: '/settings' },
                                { icon: Settings, label: 'Account Settings', to: '/settings' },
                                { icon: History, label: 'Activity Log', to: isAccountant ? '/settings' : '/user-management' },
                            ].map(({ icon: Icon, label, to }) => (
                                <button
                                    key={label}
                                    onClick={() => { setIsDropdownOpen(false); navigate(to); }}
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:pl-4 transition-all duration-200"
                                >
                                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Preferences */}
                        <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-0.5">Preferences</span>
                            <div className="flex items-center justify-between px-2 py-1">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dark Mode</span>
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                        theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                                    }`}
                                    aria-label="Toggle theme"
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            {!isAccountant && (
                                <button
                                    onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:pl-4 transition-all duration-200"
                                >
                                    <Sliders className="h-3.5 w-3.5 text-slate-400" />
                                    <span>API Configuration</span>
                                </button>
                            )}
                        </div>

                        {/* Logout */}
                        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
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
