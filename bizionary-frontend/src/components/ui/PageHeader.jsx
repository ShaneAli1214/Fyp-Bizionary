import React from 'react';
import Breadcrumb from './Breadcrumb';

const PageHeader = ({ title, subtitle, breadcrumbs, actions, className = '' }) => {
    const crumbs = breadcrumbs || (title ? [{ label: title }] : []);

    return (
        <div className={`flex items-start justify-between mb-6 gap-4 ${className}`}>
            <div className="min-w-0">
                <Breadcrumb items={crumbs} />
                <h1 className="text-xl font-bold text-textMain mt-1 leading-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-textMuted mt-0.5">{subtitle}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
