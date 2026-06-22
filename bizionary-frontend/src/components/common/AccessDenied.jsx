import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const AccessDenied = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-in fade-in duration-300">
            <div className="bg-card dark:bg-[color:var(--dm-surface,#243348)] p-8 rounded-2xl border border-card dark:border-card/[0.07] shadow-xl max-w-md w-full flex flex-col items-center justify-center space-y-6 transition-colors duration-300">
                <div className="w-16 h-16 bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-primary dark:text-card">403 Forbidden</h2>
                    <h3 className="text-sm font-bold text-secondary dark:text-slate-350">Access Denied</h3>
                    <p className="text-xs text-secondary dark:text-secondary leading-relaxed font-semibold">
                        Your account credentials do not have permission to view this workspace page. If this is an error, please reach out to your system administrator.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-card bg-status-info hover:bg-rose-700 active:scale-[0.985] transition-all shadow-md shadow-rose-600/10 hover:shadow-rose-700/20 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;
