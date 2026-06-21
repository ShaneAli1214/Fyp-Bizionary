import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
    '/': 'Dashboard',
    '/products': 'Products',
    '/sales': 'Sales',
    '/purchases': 'Purchases',
    '/invoices': 'Invoices',
    '/accounts': 'Accounts & Finance',
    '/inventory-managment': 'Stock Management',
    '/ordered-slips': 'Create Order',
    '/chatbot': 'AI Chatbot',
    '/user-management': 'Admin',
    '/settings': 'Settings',
    '/insights': 'AI Insights',
    '/smart-reorder': 'Smart Reorder',
};

const Breadcrumb = ({ items }) => {
    const location = useLocation();

    const crumbs = items || (() => {
        const label = ROUTE_LABELS[location.pathname];
        if (!label || location.pathname === '/') return [];
        return [{ label, href: location.pathname }];
    })();

    return (
        <nav className="flex items-center gap-1 text-xs">
            <Link
                to="/"
                className="flex items-center text-textMuted hover:text-primary transition-colors"
                aria-label="Home"
            >
                <Home className="w-3.5 h-3.5" />
            </Link>
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                    <React.Fragment key={crumb.label}>
                        <ChevronRight className="w-3 h-3 text-textMuted/50 shrink-0" />
                        {isLast || !crumb.href ? (
                            <span className="font-semibold text-textMain truncate max-w-[160px]">
                                {crumb.label}
                            </span>
                        ) : (
                            <Link
                                to={crumb.href}
                                className="text-textMuted hover:text-primary transition-colors truncate max-w-[120px]"
                            >
                                {crumb.label}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumb;
