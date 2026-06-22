import React from 'react';
import Breadcrumb from './Breadcrumb';

const PageHeader = ({ title, subtitle, breadcrumbs, actions, className = '' }) => {
    const crumbs = breadcrumbs || (title ? [{ label: title }] : []);

    return (
        <div className={`flex items-start justify-between mb-6 gap-4 ${className}`}>
            <div className="min-w-0">
                <Breadcrumb items={crumbs} />
                <h1 className="text-2xl font-bold text-primary mt-1 leading-tight tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-secondary mt-0.5">{subtitle}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2 shrink-0 mt-1">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
