import React, { useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import useClickOutside from '../../hooks/useClickOutside';
import Logo from '../common/Logo';

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Operations',
        items: [
            { name: 'Accounts', href: '/accounts', icon: CreditCard },
            { name: 'Products', href: '/products', icon: Package },
            { name: 'Stock', href: '/inventory-managment', icon: Boxes },
            { name: 'Sales', href: '/sales', icon: ShoppingCart },
            { name: 'Create Order', href: '/ordered-slips', icon: ClipboardList },
        ],
    },
    {
        label: 'Intelligence',
        items: [
            { name: 'AI Chatbot', href: '/chatbot', icon: Bot },
        ],
    },
    {
        label: 'Admin',
        items: [
            { name: 'Admin', href: '/user-management', icon: Lock, adminOnly: true },
        ],
    },
];

const Tooltip = ({ label }) => (
    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[100] shadow-xl">
        {label}
    </div>
);

const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen } = useSidebar();
    const sidebarRef = useRef(null);
    const location = useLocation();

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
    const activeWorkspaceName = getActiveWorkspaceName();

    // Support both prop-based (legacy) and context-based mobile open state
    const mobileOpen = isOpen !== undefined ? isOpen : isMobileOpen;
    const closeMobile = onClose || (() => setMobileOpen(false));

    useClickOutside(sidebarRef, () => {
        if (mobileOpen) closeMobile();
    }, mobileOpen);

    const isInventoryManager = user?.role_name === 'Inventory Manager';
    const isSalesManager = user?.role_name === 'Sales Manager';
    const isAccountant = user?.role_name === 'Accountant';
    const isUserAdmin = user?.role_name === 'Admin' || user?.role_level === 'ADMIN';

    const filterItem = (item) => {
        if (isInventoryManager && ['Accounts', 'Sales', 'Admin'].includes(item.name)) return false;
        if (isSalesManager && ['Accounts', 'Stock', 'Admin'].includes(item.name)) return false;
        if (isAccountant && ['Products', 'Stock', 'Create Order', 'Admin'].includes(item.name)) return false;
        if (item.adminOnly && !isUserAdmin) return false;
        return true;
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-[color:var(--dm-sidebar,#1a2535)]">
            {/* Header: logo + toggle */}
            <div className="h-12 flex items-center border-b border-gray-100 dark:border-white/8 shrink-0 px-4 justify-between select-none bg-white dark:bg-[color:var(--dm-sidebar,#1a2535)]">
                <div className="flex items-center gap-2">
                    <Logo className="h-6 w-auto text-gray-900 dark:text-white shrink-0" />
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-wider uppercase sidebar-label">
                        Bizionary
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Hamburger button (toggles sidebar on desktop) */}
                    <button
                        onClick={toggleCollapsed}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                        aria-label="Collapse sidebar"
                    >
                        <Menu className="w-4.5 h-4.5" />
                    </button>
                    {/* Mobile close button */}
                    {mobileOpen && (
                        <button
                            onClick={closeMobile}
                            className="text-gray-400 dark:text-white/60 hover:text-gray-700 dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors lg:hidden cursor-pointer"
                            aria-label="Close menu"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 select-none">
                {NAV_GROUPS.map((group) => {
                    const visibleItems = group.items.filter(filterItem);
                    if (!visibleItems.length) return null;

                    return (
                        <div key={group.label} className="mb-2.5">
                            {!isCollapsed && (
                                <div className="sidebar-group-label px-4 pt-2 pb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                                    <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span>{group.label}</span>
                                </div>
                            )}
                            <div className="space-y-0.5 px-3">
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <NavLink
                                            key={item.name}
                                            to={item.href}
                                            end={item.href === '/'}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) closeMobile();
                                            }}
                                            className={({ isActive }) =>
                                                `relative flex items-center rounded-lg transition-all duration-200 group gap-3 px-3 py-2
                                                ${isActive
                                                    ? 'bg-slate-100 dark:bg-white/[0.09] text-slate-900 dark:text-white font-semibold'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-slate-100 font-normal'
                                                }`
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors duration-200 ${isActive ? 'text-slate-800 dark:text-blue-300' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                                                    <span className={`text-[13px] truncate sidebar-label ${isActive ? 'font-medium' : 'font-normal'}`}>
                                                        {item.name}
                                                    </span>
                                                </>
                                            )}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={closeMobile}
                    aria-hidden="true"
                />
            )}

            {/* Desktop persistent sidebar */}
            <aside
                className={`
                    hidden lg:flex flex-col fixed inset-y-0 left-0 z-50
                    bg-white dark:bg-[color:var(--dm-sidebar,#1a2535)]
                    border-r border-gray-100 dark:border-white/[0.07]
                    transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'w-0 -translate-x-full overflow-hidden border-r-0' : 'w-60 translate-x-0'}
                    print:hidden
                `}
            >
                <SidebarContent />
            </aside>

            {/* Mobile drawer */}
            <aside
                ref={sidebarRef}
                className={`
                    flex flex-col lg:hidden fixed inset-y-0 left-0 z-50 w-60 h-screen
                    bg-white dark:bg-[color:var(--dm-sidebar,#1a2535)]
                    border-r border-gray-100 dark:border-white/[0.07]
                    transition-transform duration-300 ease-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    print:hidden
                `}
            >
                <SidebarContent />
            </aside>
        </>
    );
};

export default Sidebar;
