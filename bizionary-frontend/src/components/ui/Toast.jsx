import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const CONFIG = {
    success: {
        icon: CheckCircle2,
        bar: 'bg-status-success',
        icon_cls: 'text-emerald-500',
    },
    error: {
        icon: XCircle,
        bar: 'bg-rose-500',
        icon_cls: 'text-rose-500',
    },
    warning: {
        icon: AlertTriangle,
        bar: 'bg-status-info',
        icon_cls: 'text-amber-500',
    },
    info: {
        icon: Info,
        bar: 'bg-status-info',
        icon_cls: 'text-status-info',
    },
};

const ToastItem = ({ toast }) => {
    const { removeToast } = useToast();
    const cfg = CONFIG[toast.type] || CONFIG.info;
    const Icon = cfg.icon;

    return (
        <div className="toast-enter flex items-start gap-3 bg-card dark:bg-primary border border-card dark:border-slate-700 rounded-2xl shadow-xl px-4 py-3 min-w-[300px] max-w-[420px] relative overflow-hidden">
            {/* colored left bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cfg.bar}`} />
            <div className="pl-2 flex items-start gap-3 flex-1">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.icon_cls}`} />
                <p className="text-sm font-medium text-textMain dark:text-slate-200 leading-snug flex-1">
                    {typeof toast.message === 'object' ? (toast.message.message || JSON.stringify(toast.message)) : String(toast.message)}
                </p>
            </div>
            <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-textMuted hover:text-textMain dark:hover:text-slate-200 transition-colors p-0.5 mt-0.5"
                aria-label="Dismiss"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

const ToastContainer = () => {
    const { toasts } = useToast();

    if (!toasts.length) return null;

    return (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none print:hidden">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} />
                </div>
            ))}
        </div>
    );
};

export { ToastContainer };
export default ToastItem;
