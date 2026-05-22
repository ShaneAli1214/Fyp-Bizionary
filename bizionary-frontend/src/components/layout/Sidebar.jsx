import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, Package, ShoppingCart, Boxes, Brain, Bot, Lock, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useAuth();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'AI Insights', href: '/insights', icon: Brain },
        { name: 'Smart Reorder Engine', href: '/smart-reorder', icon: Bot },
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Sales', href: '/sales', icon: ShoppingCart },
        { name: 'Inventory Managment', href: '/inventory-managment', icon: Boxes },
        { name: 'Ordered Slips', href: '/ordered-slips', icon: Package },
        { name: 'Accounts', href: '/accounts', icon: FolderKanban },
        { name: 'User Management', href: '/user-management', icon: Settings, adminOnly: true },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
                    onClick={onClose}
                />
            )}
            
                <div className={`fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 w-64 h-screen bg-surface dark:bg-slate-900 border-r border-surface/20 dark:border-slate-800 flex flex-col flex-shrink-0 transition-transform duration-300 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo Section */}
                <div className="h-24 flex items-center justify-between px-6 border-b border-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm shadow-primary/30">
                            <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-textMain dark:text-white tracking-tight leading-tight">Bizionary</h1>
                            <span className="text-xs text-textMuted dark:text-gray-400 tracking-wide font-medium">CRM Enterprise</span>
                        </div>
                    </div>
                    
                    {/* Mobile Close Button */}
                    <button className="md:hidden text-textMuted hover:text-textMain dark:text-gray-400 dark:hover:text-white p-1" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-6 px-4">
                        <div className="sidebar-section">
                            <span className="sidebar-title">Navigation</span>
                        </div>
                        <nav className="space-y-1.5">
                        {navigation.map((item) => {
                            if (item.adminOnly && user?.role !== 'Admin') {
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
                                            `flex items-center sidebar-link text-sm font-semibold rounded-2xl transition-all duration-200 ${isActive ? 'nav-active' : 'text-textMuted hover:bg-surface/10 hover:text-textMain'}`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-textMuted'}`} />
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
