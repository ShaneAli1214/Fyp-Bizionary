import React from 'react';

const variants = {
    success: 'bg-status-success/10 text-status-success border-emerald-100',
    warning: 'bg-amber-50 text-status-info border-amber-100',
    danger:  'bg-status-info/10 text-status-info border-rose-100',
    info:    'bg-active-pill/20 text-status-info border-blue-100',
    neutral: 'bg-page text-secondary border-card',
    orange:  'bg-orange-50 text-status-info border-orange-100',
};

const dotColors = {
    success: 'bg-status-success',
    warning: 'bg-status-info',
    danger:  'bg-rose-500',
    info:    'bg-status-info',
    neutral: 'bg-slate-400',
    orange:  'bg-orange-500',
};

const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
};

const Badge = ({ variant = 'neutral', size = 'md', dot = false, className = '', children }) => {
    return (
        <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}>
            {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
            {children}
        </span>
    );
};

export default Badge;
