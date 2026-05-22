import React, { useState } from 'react';
import { Search, Settings, User, LogOut, FileText, AlertTriangle, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
// Previous AppsStrip replaced by secondary nav bar for quick access

const Navbar = ({ onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    

    return (
        <>
        <header className="h-16 topbar border-b border-surface/20 dark:border-slate-800 flex items-center justify-between px-3 md:px-6 z-40 sticky top-0 transition-colors duration-300">
            {/* Mobile Sidebar Toggle */}
            <div className="flex justify-center items-center md:hidden mr-4">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 text-textMuted dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors focus:outline-none"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* Logo / Project name (always visible) */}
            <div className="flex items-center gap-3 mr-3">
                <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center text-white font-bold">
                    B
                </div>
                <div className="hidden sm:block">
                    <div className="text-sm font-bold text-white">Bizionary</div>
                    <div className="text-[11px] text-white/90">CRM Enterprise</div>
                </div>
            </div>

            {/* Removed long topbar nav - replaced by compact secondary nav below */}

            {/* Search Bar - Left Side */}
            <div className="flex-1 max-w-xl">
                <div className="relative flex items-center w-full h-10 rounded-lg bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary/20 border border-transparent transition-all overflow-hidden">
                    <div className="grid place-items-center h-full w-10 text-textMuted">
                        <Search className="h-4 w-4" />
                    </div>
                    <input
                        className="peer h-full w-full outline-none text-sm text-textMain bg-transparent pr-2 placeholder-textMuted search-input"
                        type="text"
                        id="search"
                        placeholder="Search transactions, customers, stock..."
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-4 pl-4 md:pl-6 relative">
                {/* Settings */}
                <div className="flex items-center space-x-3 relative">
                    <button 
                        onClick={() => navigate('/settings')}
                        className="p-2.5 text-textMuted dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-surface/10 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 bg-background dark:bg-slate-800 border border-surface/20 dark:border-slate-700 shadow-sm"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                    <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>
                </div>

                {/* User Profile */}
                <div className="flex items-center space-x-3 group cursor-pointer relative">
                    <div className="hidden md:flex flex-col items-end text-sm">
                        <p className="font-bold text-white leading-snug">{user?.name || 'User'}</p>
                        <p className="text-xs text-white/90">{user?.email || 'Admin'}</p>
                    </div>

                    <div className="h-10 w-10 rounded-full bg-white/10 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold overflow-hidden relative transition-transform duration-300 group-hover:scale-105">
                        {/* Fallback to simple icon since we don't have an actual image asset */}
                        <User className="h-5 w-5 text-white" />
                    </div>

                    <button
                        onClick={logout}
                        className="absolute -right-2 top-10 mt-2 p-2 text-white bg-danger rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-md invisible group-hover:visible hover:scale-105 active:scale-95 z-50"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </header>

        {/* Secondary apps nav (restored style) */}
        <div className="secondary-nav-bar flex items-center px-4 md:px-6 py-2 gap-2 border-b border-surface/10 overflow-x-auto z-50 sticky top-16">
            {[
                { label: 'Dashboard', path: '/' },
                { label: 'AI Insights', path: '/insights' },
                { label: 'Smart Reorder Engine', path: '/smart-reorder' },
                { label: 'Products', path: '/products' },
                { label: 'Sales', path: '/sales' },
                { label: 'Inventory Management', path: '/inventory-managment' },
                { label: 'Ordered Slips', path: '/ordered-slips' },
                { label: 'Accounts', path: '/accounts' },
                { label: 'User Management', path: '/user-management' }
            ].map(o => (
                <button
                    key={o.path}
                    className={`secondary-nav-link ${location.pathname === o.path ? 'active' : ''}`}
                    onClick={() => navigate(o.path)}
                >
                    {o.label}
                </button>
            ))}
        </div>
        </>
    );
};

export default Navbar;
