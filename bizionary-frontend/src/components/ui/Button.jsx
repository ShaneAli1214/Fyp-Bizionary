import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
    // ── Primary: bg-primary class → global CSS handles color tokens + hover animation ──
    primary: [
        'bg-primary',             // global CSS: white in dark mode, black in light mode
        'shadow-sm',
        'active:scale-[0.97]',
    ].join(' '),

    // ── Secondary: card background, primary text, card border ──
    secondary: [
        'bg-card',
        'text-primary',
        'border border-card',
        'hover:bg-active-pill/20',
        'shadow-sm',
        'active:scale-[0.98]',
    ].join(' '),

    // ── Ghost: transparent, primary text, active-pill hover ──
    ghost: [
        'bg-transparent',
        'text-primary',
        'hover:bg-active-pill/20',
        'active:scale-[0.98]',
    ].join(' '),

    // ── Danger: status-info tint, primary text, border ──
    danger: [
        'bg-card',
        'text-status-info',
        'border border-status-info/20',
        'hover:bg-active-pill/20',
        'shadow-sm',
        'active:scale-[0.98]',
    ].join(' '),
};

const sizes = {
    sm: 'px-4 py-1.5 text-xs rounded-full gap-1.5',    // pill
    md: 'px-5 py-2 text-sm rounded-full gap-2',         // pill
    lg: 'px-6 py-2.5 text-sm rounded-full gap-2',       // pill
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
