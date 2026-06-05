import React from 'react';
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
    ClipboardList
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../common/Logo';

const Navbar = ({ onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Accounts', path: '/accounts', icon: CreditCard },
        { label: 'Products', path: '/products', icon: Package },
        { label: 'Stock', path: '/inventory-managment', icon: Boxes },
        { label: 'Sales', path: '/sales', icon: ShoppingCart },
        { label: 'Create Order', path: '/ordered-slips', icon: ClipboardList },
        { label: 'Admin', path: '/user-management', icon: Lock }
    ];

    return (
        <header className="h-16 topbar border-b border-surface/20 dark:border-slate-800 flex items-center justify-between px-3 md:px-6 z-40 sticky top-0 transition-colors duration-300">
            {/* Left Brand: Custom Logo Component */}
            <div className="flex items-center gap-2 cursor-pointer text-white" onClick={() => navigate('/')}>
                <Logo className="h-9 w-auto text-white" />
                <span className="text-sm font-extrabold text-white tracking-wider uppercase">Bizionary</span>
            </div>

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

            {/* Right Logout Block */}
            <div className="flex items-center gap-4 text-xs">
                {/* User email & Logout button */}
                <div className="hidden sm:flex items-center gap-2">
                    <span className="text-white/70">Welcome, <strong>{user?.name || 'Admin'}</strong></span>
                    <div className="h-4 w-px bg-white/20"></div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all shadow-sm shadow-red-600/20"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout ({user?.email || 'admin@bizionary.com'})</span>
                </button>
            </div>
        </header>
    );
};

export default Navbar;
