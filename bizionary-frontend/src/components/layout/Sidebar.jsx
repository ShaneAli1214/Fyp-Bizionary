import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, 
    CreditCard, 
    Package, 
    Boxes, 
    ShoppingCart, 
    ClipboardList, 
    Lock, 
    X 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';

const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useAuth();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Accounts', href: '/accounts', icon: CreditCard },
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Stock', href: '/inventory-managment', icon: Boxes },
        { name: 'Sales', href: '/sales', icon: ShoppingCart },
        { name: 'Create Order', href: '/ordered-slips', icon: ClipboardList },
        { name: 'Admin', href: '/user-management', icon: Lock, adminOnly: true }
    ];

    const isUserAdmin = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role_name === 'Super Admin' || user?.role_name === 'Admin';

    return (
        <>
            {/* Mobile Overlay - click to close drawer */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in duration-300 ease-out"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
            
            <div className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-[#003A6B] border-r border-white/10 flex flex-col flex-shrink-0 transition-transform duration-300 ease-out md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
                                        // Auto-close sidebar on mobile when navigating
                                        if (window.innerWidth < 768 && onClose) {
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
