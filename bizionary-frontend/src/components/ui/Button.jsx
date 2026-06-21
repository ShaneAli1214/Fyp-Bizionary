import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
    primary: 'bg-primary text-white hover:bg-[#1E40AF] shadow-sm hover:shadow-md active:scale-[0.98]',
    secondary: 'bg-white text-textMain border border-gray-200 hover:bg-gray-50 shadow-sm active:scale-[0.98]',
    ghost: 'bg-transparent text-textMain hover:bg-gray-100 active:scale-[0.98]',
    danger: 'bg-white text-danger border border-danger/20 hover:bg-danger hover:text-white shadow-sm active:scale-[0.98]',
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
};

const Button = React.forwardRef(({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    disabled,
    className = '',
    children,
    ...props
}, ref) => {
    const isDisabled = disabled || loading;

    return (
        <button
            ref={ref}
            disabled={isDisabled}
            className={`
                inline-flex items-center justify-center font-semibold
                transition-all duration-200 cursor-pointer select-none
                disabled:opacity-60 disabled:cursor-not-allowed
                ${variants[variant]}
                ${sizes[size]}
                ${className}
            `.replace(/\s+/g, ' ').trim()}
            {...props}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : LeftIcon ? (
                <LeftIcon className="w-3.5 h-3.5 shrink-0" />
            ) : null}
            {children}
            {!loading && RightIcon && <RightIcon className="w-3.5 h-3.5 shrink-0" />}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;
