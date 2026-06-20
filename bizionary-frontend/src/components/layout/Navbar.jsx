import React, { useState } from 'react';
import { 
    LayoutDashboard, 
    Users, 
    Package, 
    Boxes, 
    FileText, 
    CreditCard, 
    ShoppingCart, 
    Lock, 
    LogOut, 
    Menu,
    ClipboardList,
    Bot,
    ChevronDown,
    User,
    Settings,
    History,
    Sliders,
    TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../common/Logo';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Resolve display name from backend payload fields (first_name, last_name, username)
    // Works universally for every role — Admin, Accountant, Sales Manager, Inventory Manager
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

    const isInventoryManager = user?.role_name === 'Inventory Manager';
    const isSalesManager = user?.role_name === 'Sales Manager';
    const isAccountant = user?.role_name === 'Accountant';
    const isUserAdmin = user?.role_name === 'Admin' || user?.role_level === 'ADMIN';

    const navItems = [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Accounts', path: '/accounts', icon: CreditCard },
        { label: 'Products', path: '/products', icon: Package },
        { label: 'Stock', path: '/inventory-managment', icon: Boxes },
        { label: 'Sales', path: '/sales', icon: ShoppingCart },
        { label: 'AI Insights', path: '/insights', icon: TrendingUp },
        { label: 'Create Order', path: '/ordered-slips', icon: ClipboardList },
        { label: 'AI Chatbot', path: '/chatbot', icon: Bot },
        { label: 'Admin', path: '/user-management', icon: Lock }
    ].filter(item => {
        if (isInventoryManager) {
            return !['Accounts', 'Sales', 'Admin'].includes(item.label);
        }
        if (isSalesManager) {
            return !['Accounts', 'Stock', 'Admin'].includes(item.label);
        }
        if (isAccountant) {
            return !['Products', 'Stock', 'Create Order', 'Admin'].includes(item.label);
        }
        if (item.label === 'Admin') {
            return isUserAdmin;
        }
        return true;
    });

    return (
        <header className="h-16 text-white flex items-center justify-between px-3 md:px-6 z-40 sticky top-0 transition-colors duration-300 relative">
            {/* Custom Hanging Tab Background */}
            <div className="absolute inset-0 -z-10 overflow-visible pointer-events-none">
                {/* Left hanging tab & slope background */}
                <svg className="absolute left-0 top-0 h-[96px] w-[240px] text-[var(--color-topbar)]" viewBox="0 0 240 96" fill="currentColor">
                    <path d="M 0 0 L 240 0 L 240 64 L 200 96 L 0 96 Z" />
                    <path d="M 0 96 L 200 96 L 240 64" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                </svg>
                {/* Right horizontal header background */}
                <div className="absolute left-[239px] right-0 top-0 h-16 bg-[var(--color-topbar)] border-b border-white/10"></div>
            </div>

            {/* Left Brand: Absolute positioned to hang down centered in the tab */}
            <div className="absolute left-0 top-0 h-24 flex items-center pl-3 md:pl-6 pr-4 gap-2.5 cursor-pointer text-white z-10" onClick={() => navigate('/')}>
                <Logo className="h-12 w-auto text-white" />
                <span className="text-base font-black text-white tracking-wider uppercase">Bizionary</span>
            </div>

            {/* Spacer to push menu and links past the logo tab */}
            <div className="w-[200px] sm:w-[240px] shrink-0 h-full pointer-events-none"></div>

            {/* Mobile Sidebar Toggle - only show on tablet/mobile */}
            <div className="flex justify-center items-center lg:hidden mr-4">
                <button 
                    onClick={onToggleSidebar}
                    aria-label="Toggle navigation menu"
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* Desktop Navigation Links - matching the screenshot exactly */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-1 justify-center max-w-4xl px-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                                isActive 
                                ? 'bg-white/20 text-white font-bold' 
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Right Profile Dropdown Block */}
            <div className="relative">
                {/* Backdrop to close dropdown on click outside */}
                {isDropdownOpen && (
                    <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => setIsDropdownOpen(false)} 
                    />
                )}

                {/* Profile row trigger */}
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all duration-300 ease-in-out cursor-pointer select-none text-xs font-semibold focus:outline-none z-50 relative"
                >
                    <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm border border-white/10">
                        {initials}
                    </div>
                    <span className="hidden sm:inline text-white/90">Welcome, <strong>{user?.first_name || user?.username || 'User'}</strong></span>
                    <ChevronDown className={`h-4 w-4 text-white/80 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Card */}
                <div 
                    className={`absolute right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-[#0b1220] rounded-2xl shadow-2xl border border-slate-200/85 dark:border-slate-800/80 p-4 text-slate-800 dark:text-slate-200 z-50 flex flex-col gap-3.5 transition-all duration-200 origin-top-right ${
                        isDropdownOpen 
                            ? 'scale-100 opacity-100 visible' 
                            : 'scale-95 opacity-0 invisible pointer-events-none'
                    }`}
                >
                    {/* Section 1: User Profile Summary */}
                    <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800/80 pb-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1C3A5A]/10 text-[#1C3A5A] dark:bg-sky-500/10 dark:text-sky-450 flex items-center justify-center font-bold text-sm uppercase">
                            {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{displayName}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email || '—'}</span>
                        </div>
                    </div>

                    {/* Section 2: Quick Actions */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1">Quick Actions</span>
                        <button
                            onClick={() => {
                                setIsDropdownOpen(false);
                                navigate('/settings');
                            }}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:pl-4 transition-all duration-200 ease-in-out"
                        >
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>My Profile</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsDropdownOpen(false);
                                navigate('/settings');
                            }}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:pl-4 transition-all duration-200 ease-in-out"
                        >
                            <Settings className="h-3.5 w-3.5 text-slate-400" />
                            <span>Account Settings</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsDropdownOpen(false);
                                navigate(isAccountant ? '/settings' : '/user-management');
                            }}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:pl-4 transition-all duration-200 ease-in-out"
                        >
                            <History className="h-3.5 w-3.5 text-slate-400" />
                            <span>Activity Log</span>
                        </button>
                    </div>

                    {/* Section 3: Preferences / AI Toggles */}
                    <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-0.5">Preferences</span>
                        
                        {/* Dark Mode toggle */}
                        <div className="flex items-center justify-between px-2 py-1">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dark Mode</span>
                            <button 
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    theme === 'dark' ? 'bg-[#1D4ED8]' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                                aria-label="Toggle theme mode"
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>

                        {/* API Config button */}
                        {!isAccountant && (
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    navigate('/settings');
                                }}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:pl-4 transition-all duration-200 ease-in-out"
                            >
                                <Sliders className="h-3.5 w-3.5 text-slate-400" />
                                <span>API Configuration</span>
                            </button>
                        )}
                    </div>

                    {/* Section 4: Danger Zone */}
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                        <button
                            onClick={() => {
                                setIsDropdownOpen(false);
                                logout();
                            }}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/35 hover:pl-4 transition-all duration-200 ease-in-out"
                        >
                            <LogOut className="h-3.5 w-3.5 text-rose-500" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
