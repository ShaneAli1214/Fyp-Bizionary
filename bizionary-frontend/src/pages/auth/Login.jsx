import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login({ email, password });
            if (result.success) {
                navigate('/');
            } else {
                setError(result.error || 'Failed to login. Please check your credentials.');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] bg-cover opacity-5"></div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative z-10 border border-gray-100">
                <div className="p-8">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-[#1C3A5A] tracking-tight">Bizionary ERP</h1>
                        <p className="text-gray-500 mt-2">Welcome back! Please login to your account.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C3A5A] focus:border-transparent outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white"
                                    placeholder="admin@bizionary.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <a href="#" className="font-medium text-sm text-[#1C3A5A] hover:text-[#2B527E] transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C3A5A] focus:border-transparent outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-[#1C3A5A] focus:ring-[#1C3A5A] border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                Remember me
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#1C3A5A] hover:bg-[#2B527E] active:bg-[#152e4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1C3A5A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            Need help? <a href="#" className="font-medium text-[#1C3A5A] hover:underline">Contact Support</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
