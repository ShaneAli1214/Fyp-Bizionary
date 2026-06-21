import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import useClickOutside from '../../hooks/useClickOutside';
import { 
    LayoutDashboard, 
    CreditCard, 
    Package, 
    Boxes, 
    ShoppingCart, 
    ClipboardList, 
    Lock, 
    X,
    Bot,
    TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';

const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const sidebarRef = useRef(null);

    useClickOutside(sidebarRef, () => {
        if (isOpen && onClose) {
            onClose();
        }
    }, isOpen);

    const isInventoryManager = user?.role_name === 'Inventory Manager';
    const isSalesManager = user?.role_name === 'Sales Manager';
    const isAccountant = user?.role_name === 'Accountant';
    const isUserAdmin = user?.role_name === 'Admin' || user?.role_level === 'ADMIN';

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Accounts', href: '/accounts', icon: CreditCard },
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Stock', href: '/inventory-managment', icon: Boxes },
        { name: 'Sales', href: '/sales', icon: ShoppingCart },
        { name: 'Create Order', href: '/ordered-slips', icon: ClipboardList },
        { name: 'AI Chatbot', href: '/chatbot', icon: Bot },
        { name: 'Admin', href: '/user-management', icon: Lock, adminOnly: true }
    ].filter(item => {
        if (isInventoryManager) {
            return !['Accounts', 'Sales', 'Admin'].includes(item.name);
        }
        if (isSalesManager) {
            return !['Accounts', 'Stock', 'Admin'].includes(item.name);
        }
        if (isAccountant) {
            return !['Products', 'Stock', 'Create Order', 'Admin'].includes(item.name);
        }
        if (item.adminOnly && !isUserAdmin) {
            return false;
        }
        return true;
    });

    return (
        <>
            {/* Mobile Overlay - click to close drawer */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-in fade-in duration-300 ease-out"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
            
            <div 
                ref={sidebarRef}
                className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-[#003A6B] border-r border-white/10 flex flex-col flex-shrink-0 transition-transform duration-300 ease-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Logo Section */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white">
                        <Logo className="h-9 w-auto text-white" />
                        <span className="text-sm font-extrabold tracking-wider uppercase">Bizionary</span>
                    </div>
                    
                    {/* Mobile Close Button */}
                    <button 
                        className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
                        onClick={onClose}
                        aria-label="Close navigation menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-6 px-4">
                    <nav className="space-y-1">
                        {navigation.map((item) => {
                            if (item.adminOnly && !isUserAdmin) {
                                return null;
                            }
                            
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => {
                                        // Auto-close sidebar on mobile/tablet when navigating
                                        if (window.innerWidth < 1024 && onClose) {
                                            onClose();
                                        }
                                    }}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
                                            isActive 
                                            ? 'bg-white/20 text-white font-bold shadow-inner' 
                                            : 'text-white/80 hover:text-white hover:bg-white/10'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-white/85'}`} />
                                            <span className="truncate">{item.name}</span>
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
