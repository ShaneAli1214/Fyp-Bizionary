import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const VoidModal = ({ isOpen, onClose, onSubmit, recordType }) => {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        setSubmitting(true);
        try {
            await onSubmit(reason);
            setReason('');
            onClose();
        } catch (error) {
            console.error("Failed to void record:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeDisplay = () => {
        if (recordType === 'revenues') return 'Revenue Record';
        if (recordType === 'expenses') return 'Expense Record';
        return 'Invoice';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-card bg-page/50">
                    <div className="flex items-center gap-2 text-amber-600 font-bold">
                        <AlertTriangle className="w-5 h-5" />
                        <h2>Void {getTypeDisplay()}</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-secondary hover:text-secondary hover:bg-page rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-secondary font-medium">
                        Voiding is a permanent audit action. A journal entry will be marked as voided to maintain general ledger integrity.
                    </p>
                    
                    <div>
                        <label className="block text-xs font-bold text-secondary mb-2">Reason for Voiding *</label>
                        <textarea 
                            required
                            value={reason} 
                            onChange={(e) => setReason(e.target.value)}
                            rows="3" 
                            className="w-full px-4 py-2.5 bg-page border border-card rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none resize-none"
                            placeholder="Enter the audit reason for voiding this record..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-secondary hover:text-primary bg-card border border-card hover:bg-page rounded-xl transition-all"
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-card bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all disabled:opacity-75"
                            disabled={submitting || !reason.trim()}
                        >
                            {submitting && <div className="w-4 h-4 border-2 border-card/30 border-t-white rounded-full animate-spin"></div>}
                            Confirm Void
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VoidModal;
