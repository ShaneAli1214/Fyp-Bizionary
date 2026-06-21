import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    Lock, 
    Mail, 
    ShieldAlert, 
    Eye, 
    EyeOff, 
    Package, 
    TrendingUp, 
    ShieldCheck 
} from 'lucide-react';
import Logo from '../../components/common/Logo';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [mfaToken, setMfaToken] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login, loginWithMFA } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (twoFactorRequired) {
                const result = await loginWithMFA(mfaToken, mfaCode);
                if (result.success) {
                    navigate('/');
                }
            } else {
                const result = await login({ email, password });
                if (result.passwordChangeRequired) {
                    navigate('/reset-default-password');
                } else if (result.twoFactorRequired) {
                    setTwoFactorRequired(true);
                    setMfaToken(result.mfaToken);
                } else if (result.success) {
                    navigate('/');
                } else {
                    setError('Failed to login. Please check your credentials.');
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50 dark:bg-[color:var(--dm-bg,#1a2535)] transition-colors duration-300 font-sans">
            {/* Left Column (Brand Showcase) - Visible on lg+ */}
            <div className="hidden lg:flex lg:w-[45%] bg-[#0C1A2E] relative text-white flex-col justify-between p-12 overflow-hidden select-none">
                {/* Backdrop Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none opacity-40"></div>
                
                {/* Large Background Logo Outline */}
                <div className="absolute top-[25%] -right-32 w-[500px] h-[500px] text-white/5 pointer-events-none select-none">
                    <Logo className="w-full h-full text-white/5 stroke-current" />
                </div>
                
                {/* Top Brand Header */}
                <div className="flex items-center gap-3 relative z-10">
                    <Logo className="h-10 w-auto text-white" />
                    <span className="text-lg font-black tracking-wider uppercase">Bizionary</span>
                </div>

                {/* Middle Content */}
                <div className="my-auto relative z-10 max-w-md space-y-5 animate-in slide-in-from-left-6 duration-700 ease-out">
                    <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
                        Welcome to Bizionary ERP
                    </h1>
                    <p className="text-sm text-slate-350 leading-relaxed font-medium">
                        Streamline your business operations, manage inventory, track orders, and grow with confidence.
                    </p>
                </div>

                {/* Bottom Features List */}
                <div className="space-y-6 relative z-10 animate-in slide-in-from-left-8 duration-900 ease-out">
                    {/* Feature 1 */}
                    <div className="flex items-start gap-4">
                        <div className="bg-white/10 p-2.5 rounded-xl border border-white/5 flex items-center justify-center shrink-0 shadow-sm">
                            <Package className="w-5 h-5 text-[#F97316]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Centralized Management</h3>
                            <p className="text-xs text-slate-350 mt-0.5 font-medium">Manage products, stock, and orders in one place.</p>
                        </div>
                    </div>
                    {/* Feature 2 */}
                    <div className="flex items-start gap-4">
                        <div className="bg-white/10 p-2.5 rounded-xl border border-white/5 flex items-center justify-center shrink-0 shadow-sm">
                            <TrendingUp className="w-5 h-5 text-[#F97316]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Real-time Insights</h3>
                            <p className="text-xs text-slate-350 mt-0.5 font-medium">Make smarter decisions with real-time analytics.</p>
                        </div>
                    </div>
                    {/* Feature 3 */}
                    <div className="flex items-start gap-4">
                        <div className="bg-white/10 p-2.5 rounded-xl border border-white/5 flex items-center justify-center shrink-0 shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-[#F97316]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Secure & Reliable</h3>
                            <p className="text-xs text-slate-350 mt-0.5 font-medium">Enterprise-grade security for your business data.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column (Login Form Wrapper) */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-12 lg:px-16 bg-white dark:bg-[color:var(--dm-surface,#243348)] transition-colors duration-300 relative">
                {/* Decorative background glows on mobile/tablet */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#F97316]/5 rounded-full blur-[100px] pointer-events-none lg:hidden"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1D4ED8]/5 rounded-full blur-[100px] pointer-events-none lg:hidden"></div>

                <div className="w-full max-w-md space-y-8 animate-in zoom-in-95 duration-500">
                    {/* Top logo block on Form */}
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-center gap-3">
                            <Logo className="h-14 w-auto text-[#1D4ED8] dark:text-[#F97316]" />
                            <span className="text-2xl font-black text-[#1D4ED8] dark:text-white tracking-wider uppercase">Bizionary</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-6 tracking-tight">
                            Sign in to your account
                        </h2>
                        <p className="text-slate-400 dark:text-slate-500 mt-2 text-xs font-semibold">
                            {twoFactorRequired ? 'Enter authenticator credentials to verify' : 'Enter your credentials to access your ERP dashboard.'}
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35 text-xs font-semibold animate-in shake duration-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {twoFactorRequired ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 pl-0.5">Authenticator Code</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                        className="block w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] outline-none transition-all placeholder-slate-350 dark:placeholder-slate-500 bg-slate-50/50 dark:bg-slate-800/40 focus:bg-white dark:focus:bg-slate-900 text-center font-mono font-bold tracking-widest text-lg text-slate-800 dark:text-slate-100 shadow-sm"
                                        placeholder="000000"
                                        required
                                    />
                                    <ShieldAlert className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                                </div>
                                <p className="text-[10px] text-slate-455 dark:text-slate-400 mt-2 text-center font-medium">
                                    Enter the 6-digit verification code from your authenticator app.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Email / Username Address input */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-0.5">Email Address</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-4 pr-12 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] outline-none transition-all placeholder-slate-350 dark:placeholder-slate-550 bg-slate-50/50 dark:bg-slate-800/40 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm text-sm"
                                            placeholder="Enter your email"
                                            required
                                        />
                                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Password input */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between pl-0.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Password</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-4 pr-20 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] outline-none transition-all placeholder-slate-350 dark:placeholder-slate-550 bg-slate-50/50 dark:bg-slate-800/40 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm text-sm"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <Lock className="absolute right-12 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 focus:outline-none transition-colors"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                        </button>
                                    </div>
                                    <div className="flex justify-end pt-1">
                                        <a href="#" className="font-bold text-xs text-[#F97316] hover:text-[#EA6B0A] hover:underline transition-colors">
                                            Forgot password?
                                        </a>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.985] transition-all duration-300 shadow-md shadow-[#1D4ED8]/20 hover:shadow-[#1E40AF]/30 focus:outline-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                twoFactorRequired ? 'Verify & Sign In' : 'Sign In'
                            )}
                        </button>
                    </form>

                    {/* OAuth Divider */}
                    {!twoFactorRequired && (
                        <>
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                    or continue with
                                </span>
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                            </div>

                            {/* Google Sign In */}
                            <button
                                type="button"
                                onClick={() => alert("Google Sign-In is managed by the directory administrator. Please request integration or use your corporate credentials.")}
                                className="w-full py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-[0.985] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-sm"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#EA4335"
                                        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.09 14.974 0 12 0 7.354 0 3.307 2.69 1.302 6.613l3.964 3.152z"
                                    />
                                    <path
                                        fill="#4285F4"
                                        d="M23.49 12.275c0-.818-.073-1.609-.21-2.373H12v4.582h6.455c-.278 1.482-1.12 2.74-2.38 3.586l3.7 2.87c2.164-1.99 3.415-4.927 3.415-8.085z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.266 14.235A7.077 7.077 0 0 1 4.909 12c0-.791.137-1.55.357-2.265L1.302 6.583A11.914 11.914 0 0 0 0 12c0 1.92.455 3.733 1.258 5.35l4.008-3.115z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 24c3.24 0 5.956-1.077 7.94-2.925l-3.7-2.87c-1.027.687-2.34 1.096-4.24 1.096-3.265 0-6.035-2.204-7.018-5.176L.974 17.24A11.942 11.942 0 0 0 12 24z"
                                    />
                                </svg>
                                <span>Sign in with Google</span>
                            </button>
                        </>
                    )}

                    {/* Footer text */}
                    <div className="pt-2 text-center text-xs font-semibold text-[#64748B] dark:text-[#475569]">
                        Don't have an account? <span onClick={() => alert("Please contact your IT department or local system administrator to provision new employee access.")} className="text-[#F97316] hover:underline font-bold cursor-pointer transition-all">Contact your administrator</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
