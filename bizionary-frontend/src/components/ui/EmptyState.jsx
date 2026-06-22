import React from 'react';
import Button from './Button';

const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
        {Icon && (
            <div className="w-14 h-14 bg-page dark:bg-primary rounded-2xl flex items-center justify-center mb-4">
                <Icon className="w-7 h-7 text-textMuted" />
            </div>
        )}
        {title && (
            <h3 className="text-base font-bold text-textMain mb-1">{title}</h3>
        )}
        {description && (
            <p className="text-sm text-textMuted max-w-xs mb-5">{description}</p>
        )}
        {action && (
            <Button variant="primary" size="md" onClick={action.onClick}>
                {action.label}
            </Button>
        )}
    </div>
);

export default EmptyState;
