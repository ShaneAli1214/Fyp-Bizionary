import React, { useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
    ChevronsLeft,
    ChevronDown,
    User,
    LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import useClickOutside from '../../hooks/useClickOutside';
import Logo from '../common/Logo';

const NAV_ITEMS = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Accounts', href: '/accounts', icon: CreditCard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Stock', href: '/inventory-managment', icon: Boxes },
    { name: 'Sales', href: '/sales', icon: ShoppingCart },
    { name: 'Create Order', href: '/ordered-slips', icon: ClipboardList },
    { name: 'AI Chatbot', href: '/chatbot', icon: Bot },
    { name: 'Admin', href: '/user-management', icon: Lock, adminOnly: true }
];

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const { isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen } = useSidebar();
    const sidebarRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

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

    const visibleItems = NAV_ITEMS.filter(filterItem);

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-page select-none relative">
            {/* Header: logo + collapse toggle */}
            <div className="h-16 flex items-center shrink-0 px-4 justify-between bg-page">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <Logo className="h-6 w-auto text-primary shrink-0" />
                    <span className="text-sm font-black text-primary tracking-wider uppercase">
                        Bizionary
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Double Chevron left collapse icon */}
                    <button
                        onClick={toggleCollapsed}
                        className="p-1.5 text-secondary hover:text-primary hover:bg-active-pill/30 rounded-xl transition-colors cursor-pointer"
                        aria-label="Collapse sidebar"
                    >
                        <ChevronsLeft className="w-5 h-5 text-primary" />
                    </button>
                    {/* Mobile close button */}
                    {mobileOpen && (
                        <button
                            onClick={closeMobile}
                            className="text-secondary hover:text-primary p-1.5 hover:bg-active-pill/30 rounded-xl transition-colors lg:hidden cursor-pointer"
                            aria-label="Close menu"
                        >
                            <X className="w-5 h-5 text-primary" />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation items list - vertical spacing ~16px */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-4 space-y-4">
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.name} className="space-y-1">
                            <NavLink
                                to={item.href}
                                end={item.href === '/'}
                                onClick={() => {
                                    if (window.innerWidth < 1024 && !item.subItems) closeMobile();
                                }}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group text-primary
                                    ${isActive
                                        ? 'bg-active-pill font-bold shadow-xs'
                                        : 'hover:bg-active-pill/20'
                                    }`
                                }
                            >
                                <Icon className="w-4.5 h-4.5 shrink-0 text-primary" />
                                <span className="text-[13px] truncate font-semibold">
                                    {item.name}
                                </span>
                            </NavLink>
                            {item.subItems && !isCollapsed && (
                                <div className="pl-9 space-y-1 mt-1 border-l border-card/45 ml-5">
                                    {item.subItems.map((sub) => (
                                        <NavLink
                                            key={sub.name}
                                            to={sub.href}
                                            end={sub.href === item.href}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) closeMobile();
                                            }}
                                            className={({ isActive }) =>
                                                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-150
                                                ${isActive 
                                                    ? 'text-primary font-bold bg-active-pill/10 shadow-xs' 
                                                    : 'text-secondary hover:text-primary hover:bg-active-pill/5'
                                                }`
                                            }
                                        >
                                            <span className="truncate font-semibold">{sub.name}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Profile Section */}
            <div className="relative border-t border-card p-4 bg-page shrink-0">
                {/* Profile row trigger */}
                <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="w-full flex items-center justify-between gap-3 text-left focus:outline-none cursor-pointer"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar Circle */}
                        <div className="w-9 h-9 rounded-full bg-active-pill text-primary flex items-center justify-center font-bold text-xs uppercase shadow-inner shrink-0">
                            {initials}
                        </div>
                        {/* Stacked Name & Email */}
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-primary truncate">
                                {displayName}
                            </span>
                            <span className="text-[10px] text-secondary truncate">
                                {user?.email || 'no-email@example.com'}
                            </span>
                        </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-primary shrink-0 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Card */}
                {isProfileDropdownOpen && (
                    <>
                        {/* Backdrop to close dropdown */}
                        <div 
                            className="fixed inset-0 z-40 bg-transparent" 
                            onClick={() => setIsProfileDropdownOpen(false)} 
                        />
                        <div className="absolute bottom-16 left-4 right-4 bg-card border border-card rounded-2xl shadow-xl p-3 z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <button
                                onClick={() => {
                                    setIsProfileDropdownOpen(false);
                                    navigate('/settings');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-primary hover:bg-active-pill/20 transition-all cursor-pointer"
                            >
                                <User className="w-3.5 h-3.5 text-primary" />
                                <span>My Profile</span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsProfileDropdownOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={closeMobile}
                    aria-hidden="true"
                />
            )}

            {/* Desktop persistent sidebar */}
            <aside
                className={`
                    hidden lg:flex flex-col fixed inset-y-0 left-0 z-50
                    bg-page
                    transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'w-0 -translate-x-full overflow-hidden' : 'w-60 translate-x-0'}
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
                    bg-page
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
