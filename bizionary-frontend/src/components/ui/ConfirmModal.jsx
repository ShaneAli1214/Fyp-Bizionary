import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * Reusable confirmation dialog.
 *
 * Props:
 *   isOpen      – boolean
 *   onClose     – () => void  (cancel)
 *   onConfirm   – () => void  (destructive action)
 *   title       – string
 *   message     – string | ReactNode
 *   confirmLabel – string  (default "Delete")
 *   variant     – "danger" | "warning"  (default "danger")
 */
const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmLabel = 'Delete',
    variant = 'danger',
}) => {
    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative bg-card rounded-2xl border border-border-card shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-secondary hover:text-primary rounded-xl transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isDanger ? 'bg-status-info/10' : 'bg-status-info/10'}`}>
                    {isDanger
                        ? <Trash2 className="w-5 h-5 text-status-info" />
                        : <AlertTriangle className="w-5 h-5 text-status-info" />
                    }
                </div>

                {/* Text */}
                <div>
                    <h3 className="text-base font-bold text-primary">{title}</h3>
                    <p className="text-sm text-secondary mt-1 leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-1">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-secondary bg-page hover:bg-active-pill border border-border-card rounded-full transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="px-4 py-2 text-sm font-bold text-card bg-primary hover:opacity-85 rounded-full transition-all"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
