import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Lock, Eye, EyeOff, Key, Check, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

const ResetDefaultPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { logout } = useAuth();
    const navigate = useNavigate();

    // Password validation checks
    const hasMinLength = newPassword.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const passwordsMatch = newPassword && newPassword === confirmPassword;
    const isPasswordValid = hasMinLength && hasLetter && hasNumber;
    const isFormValid = isPasswordValid && passwordsMatch;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('user-management/users/change-password/', {
                new_password: newPassword
            });

            if (response.data?.success) {
                setIsSuccess(true);
                // Clear session tokens and log out after 3 seconds
                setTimeout(async () => {
                    await logout();
                    navigate('/login');
                }, 3500);
            } else {
                setError('Failed to update password. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred while updating your password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] bg-cover opacity-5"></div>

            <div className="w-full max-w-md bg-card rounded-2xl shadow-xl overflow-hidden relative z-10 border border-card m-4">
                {isSuccess ? (
                    <div className="p-8 text-center animate-fade-in">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-status-success/10 text-status-success mb-6">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#2B2620] tracking-tight mb-3">Password Updated!</h1>
                        <p className="text-secondary text-sm leading-relaxed mb-6">
                            Your default security credentials have been updated successfully. 
                            To ensure total account security, your sessions are now being re-authenticated.
                        </p>
                        <div className="flex items-center justify-center space-x-2 text-[#2B2620]">
                            <div className="w-4 h-4 border-2 border-[#2B2620]/30 border-t-[#2B2620] rounded-full animate-spin"></div>
                            <span className="text-xs font-semibold">Redirecting to Login screen...</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-active-pill/20 text-[#2B2620] mb-4">
                                <Key className="h-6 w-6" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#2B2620] tracking-tight">Security Onboarding</h1>
                            <p className="text-secondary mt-2 text-sm">
                                As a new user, you must reset your temporary password before accessing the system.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-status-info/10 text-status-info border border-red-100 text-sm flex items-start space-x-3">
                                <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-primary mb-1.5">New Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-secondary" />
                                    </div>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 border border-card rounded-xl focus:ring-2 focus:ring-[#2B2620] focus:border-transparent outline-none transition-all placeholder-gray-400 bg-page focus:bg-card"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-secondary focus:outline-none"
                                    >
                                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-primary mb-1.5">Confirm Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-secondary" />
                                    </div>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 border border-card rounded-xl focus:ring-2 focus:ring-[#2B2620] focus:border-transparent outline-none transition-all placeholder-gray-400 bg-page focus:bg-card"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-secondary focus:outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Live Validation Requirements */}
                            <div className="bg-page p-4 rounded-xl border border-card space-y-2">
                                <span className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Password Requirements:</span>
                                <div className="flex items-center text-xs space-x-2">
                                    {hasMinLength ? (
                                        <Check className="h-4 w-4 text-status-success" />
                                    ) : (
                                        <X className="h-4 w-4 text-gray-300" />
                                    )}
                                    <span className={hasMinLength ? 'text-status-success font-medium' : 'text-secondary'}>
                                        At least 8 characters long
                                    </span>
                                </div>
                                <div className="flex items-center text-xs space-x-2">
                                    {hasLetter ? (
                                        <Check className="h-4 w-4 text-status-success" />
                                    ) : (
                                        <X className="h-4 w-4 text-gray-300" />
                                    )}
                                    <span className={hasLetter ? 'text-status-success font-medium' : 'text-secondary'}>
                                        Contains at least one letter (a-z)
                                    </span>
                                </div>
                                <div className="flex items-center text-xs space-x-2">
                                    {hasNumber ? (
                                        <Check className="h-4 w-4 text-status-success" />
                                    ) : (
                                        <X className="h-4 w-4 text-gray-300" />
                                    )}
                                    <span className={hasNumber ? 'text-status-success font-medium' : 'text-secondary'}>
                                        Contains at least one number (0-9)
                                    </span>
                                </div>
                                <div className="flex items-center text-xs space-x-2 pt-1 border-t border-card/50 mt-1">
                                    {passwordsMatch ? (
                                        <Check className="h-4 w-4 text-status-success" />
                                    ) : (
                                        <X className="h-4 w-4 text-gray-300" />
                                    )}
                                    <span className={passwordsMatch ? 'text-status-success font-medium' : 'text-secondary'}>
                                        Passwords match
                                    </span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!isFormValid || isLoading}
                                className="w-full flex justify-center py-3.5 px-4 rounded-full shadow-md text-sm font-bold bg-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-card/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    'Update Credentials'
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetDefaultPassword;
