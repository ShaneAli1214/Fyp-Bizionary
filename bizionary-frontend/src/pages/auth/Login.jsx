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
        <div className="min-h-screen w-full flex bg-card font-sans">

            {/* Left Column — solid black brand panel */}
            <div className="hidden lg:flex lg:w-[45%] bg-[#111111] relative text-card flex-col justify-between p-12 overflow-hidden select-none">
                {/* Subtle dot grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:22px_22px] pointer-events-none"></div>

                {/* Large background logo watermark */}
                <div className="absolute top-[20%] -right-28 w-[480px] h-[480px] pointer-events-none select-none opacity-[0.04]">
                    <Logo className="w-full h-full stroke-current" />
                </div>

                {/* Top brand header */}
                <div className="flex items-center gap-3 relative z-10">
                    <Logo className="h-9 w-auto text-card" />
                    <span className="text-base font-black tracking-widest uppercase text-card">Bizionary</span>
                </div>

                {/* Middle content */}
                <div className="my-auto relative z-10 max-w-md space-y-5">
                    <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-card">
                        Welcome to<br />Bizionary ERP
                    </h1>
                    <p className="text-sm text-card/60 leading-relaxed font-medium">
                        Streamline your business operations, manage inventory, track orders, and grow with confidence.
                    </p>
                </div>

                {/* Bottom features list */}
                <div className="space-y-6 relative z-10">
                    {[
                        { icon: Package, title: 'Centralized Management', desc: 'Manage products, stock, and orders in one place.' },
                        { icon: TrendingUp, title: 'Real-time Insights', desc: 'Make smarter decisions with real-time analytics.' },
                        { icon: ShieldCheck, title: 'Secure & Reliable', desc: 'Enterprise-grade security for your business data.' },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-4">
                            <div className="bg-card/10 p-2.5 rounded-xl border border-card/8 flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5 text-card" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-card">{title}</h3>
                                <p className="text-xs text-card/50 mt-0.5 font-medium">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column — white form panel */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-12 lg:px-16 bg-card relative">

                <div className="w-full max-w-md space-y-8">

                    {/* Logo block */}
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-center gap-3">
                            <Logo className="h-12 w-auto text-primary" />
                            <span className="text-2xl font-black text-primary tracking-widest uppercase">Bizionary</span>
                        </div>
                        <h2 className="text-xl font-bold text-primary mt-6 tracking-tight">
                            Sign in to your account
                        </h2>
                        <p className="text-secondary mt-2 text-xs font-semibold">
                            {twoFactorRequired
                                ? 'Enter authenticator credentials to verify'
                                : 'Enter your credentials to access your ERP dashboard.'}
                        </p>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="p-4 rounded-xl bg-status-info/10 text-status-info border border-rose-100 text-xs font-semibold">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {twoFactorRequired ? (
                            <div>
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2 pl-0.5">
                                    Authenticator Code
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                        className="block w-full px-4 py-3.5 border border-card rounded-xl outline-none transition-all placeholder-gray-300 bg-page focus:bg-card text-center font-mono font-bold tracking-widest text-lg text-primary shadow-sm"
                                        placeholder="000000"
                                        required
                                    />
                                    <ShieldAlert className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
                                </div>
                                <p className="text-[10px] text-secondary mt-2 text-center font-medium">
                                    Enter the 6-digit verification code from your authenticator app.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Email field */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-primary uppercase tracking-wider pl-0.5">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-4 pr-12 py-3.5 border border-card rounded-xl outline-none transition-all placeholder-gray-300 bg-page focus:bg-card text-primary shadow-sm text-sm"
                                            placeholder="Enter your email"
                                            required
                                        />
                                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Password field */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-primary uppercase tracking-wider pl-0.5">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-4 pr-20 py-3.5 border border-card rounded-xl outline-none transition-all placeholder-gray-300 bg-page focus:bg-card text-primary shadow-sm text-sm"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <Lock className="absolute right-12 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-secondary p-1 focus:outline-none transition-colors"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className="flex justify-end pt-1">
                                        <a
                                            href="#"
                                            className="text-xs font-bold text-secondary hover:text-primary hover:underline transition-colors"
                                        >
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
                            className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-card bg-[#111111] hover:bg-primary active:scale-[0.985] transition-all duration-200 shadow-sm focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-card/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                twoFactorRequired ? 'Verify & Sign In' : 'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Divider + Google */}
                    {!twoFactorRequired && (
                        <>
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-card"></div>
                                <span className="flex-shrink mx-4 text-secondary text-xs font-semibold uppercase tracking-wider">
                                    or continue with
                                </span>
                                <div className="flex-grow border-t border-card"></div>
                            </div>

                            <button
                                type="button"
                                onClick={() => alert('Google Sign-In is managed by the directory administrator. Please request integration or use your corporate credentials.')}
                                className="w-full py-3 px-4 border border-card rounded-xl text-sm font-bold text-primary bg-card hover:bg-page active:scale-[0.985] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-sm"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.09 14.974 0 12 0 7.354 0 3.307 2.69 1.302 6.613l3.964 3.152z" />
                                    <path fill="#4285F4" d="M23.49 12.275c0-.818-.073-1.609-.21-2.373H12v4.582h6.455c-.278 1.482-1.12 2.74-2.38 3.586l3.7 2.87c2.164-1.99 3.415-4.927 3.415-8.085z" />
                                    <path fill="#FBBC05" d="M5.266 14.235A7.077 7.077 0 0 1 4.909 12c0-.791.137-1.55.357-2.265L1.302 6.583A11.914 11.914 0 0 0 0 12c0 1.92.455 3.733 1.258 5.35l4.008-3.115z" />
                                    <path fill="#34A853" d="M12 24c3.24 0 5.956-1.077 7.94-2.925l-3.7-2.87c-1.027.687-2.34 1.096-4.24 1.096-3.265 0-6.035-2.204-7.018-5.176L.974 17.24A11.942 11.942 0 0 0 12 24z" />
                                </svg>
                                <span>Sign in with Google</span>
                            </button>
                        </>
                    )}

                    {/* Footer */}
                    <div className="pt-2 text-center text-xs font-semibold text-secondary">
                        Don't have an account?{' '}
                        <span
                            onClick={() => alert('Please contact your IT department or local system administrator to provision new employee access.')}
                            className="text-primary hover:underline font-bold cursor-pointer transition-colors"
                        >
                            Contact your administrator
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
