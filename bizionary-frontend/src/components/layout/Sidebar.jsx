import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
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
        <div className="flex flex-col h-full">
            {/* Logo header */}
            <div className={`h-12 flex items-center border-b border-gray-200 dark:border-white/10 shrink-0 ${isCollapsed ? 'justify-center px-3' : 'px-4 gap-2.5'}`}>
                <Logo className="h-7 w-auto text-gray-900 dark:text-white shrink-0" />
                {!isCollapsed && (
                    <span className="text-sm font-black text-gray-900 dark:text-white tracking-wider uppercase sidebar-label">
                        Bizionary
                    </span>
                )}
                {/* Mobile close button */}
                {mobileOpen && (
                    <button
                        onClick={closeMobile}
                        className="ml-auto text-gray-400 dark:text-white/60 hover:text-gray-700 dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                        aria-label="Close menu"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
                {NAV_GROUPS.map((group) => {
                    const visibleItems = group.items.filter(filterItem);
                    if (!visibleItems.length) return null;

                    return (
                        <div key={group.label} className="mb-1">
                            {!isCollapsed && (
                                <span className="sidebar-group-label px-4 pt-3 pb-1 block">
                                    {group.label}
                                </span>
                            )}
                            <div className={`space-y-0.5 ${isCollapsed ? 'px-2' : 'px-3'}`}>
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
                                                `relative flex items-center rounded-lg transition-all duration-150 group
                                                ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'}
                                                ${isActive
                                                    ? 'bg-gray-100 dark:bg-white/15 text-gray-900 dark:text-white'
                                                    : 'text-gray-500 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                                                }`
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/50'}`} />
                                                    {!isCollapsed && (
                                                        <span className={`text-sm truncate sidebar-label ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                                            {item.name}
                                                        </span>
                                                    )}
                                                    {isCollapsed && <Tooltip label={item.name} />}
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

            {/* Collapse toggle (desktop only) */}
            <div className="hidden lg:flex items-center justify-end p-3 border-t border-gray-200 dark:border-white/10 shrink-0">
                <button
                    onClick={toggleCollapsed}
                    className="w-7 h-7 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors text-gray-400 dark:text-white/60 hover:text-gray-700 dark:hover:text-white"
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed
                        ? <ChevronRight className="w-3.5 h-3.5" />
                        : <ChevronLeft className="w-3.5 h-3.5" />
                    }
                </button>
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
                    bg-white dark:bg-[#060E1C]
                    border-r border-gray-200 dark:border-white/8
                    transition-[width] duration-300 ease-in-out
                    ${isCollapsed ? 'w-14' : 'w-60'}
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
                    bg-white dark:bg-[#060E1C]
                    border-r border-gray-200 dark:border-white/8
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
