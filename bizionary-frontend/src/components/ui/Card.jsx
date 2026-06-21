import React from 'react';

const paddings = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
};

const Card = ({ padding = 'md', className = '', children, ...props }) => (
    <div
        className={`bg-surface rounded-xl border border-gray-100 dark:border-slate-800/60 shadow-sm ${paddings[padding]} ${className}`}
        {...props}
    >
        {children}
    </div>
);

Card.Header = ({ className = '', children }) => (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
        {children}
    </div>
);

Card.Body = ({ className = '', children }) => (
    <div className={className}>{children}</div>
);

Card.Footer = ({ className = '', children }) => (
    <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-slate-800/60 ${className}`}>
        {children}
    </div>
);

export default Card;
