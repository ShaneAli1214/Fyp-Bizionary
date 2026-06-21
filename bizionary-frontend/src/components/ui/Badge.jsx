import React from 'react';

const variants = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    danger:  'bg-rose-50 text-rose-700 border-rose-100',
    info:    'bg-blue-50 text-blue-700 border-blue-100',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    orange:  'bg-orange-50 text-orange-700 border-orange-100',
};

const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger:  'bg-rose-500',
    info:    'bg-blue-500',
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
