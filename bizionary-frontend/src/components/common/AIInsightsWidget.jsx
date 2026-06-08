import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, AlertTriangle, Package, Zap, Eye, EyeOff, RefreshCw, X } from 'lucide-react';
import { insightsApi } from '../../services/insightsApi';

const AIInsightsWidget = () => {
    const [insights, setInsights] = useState(null);
    const [pricingSuggestions, setPricingSuggestions] = useState([]);
    const [demandAlerts, setDemandAlerts] = useState([]);
    const [stockWarnings, setStockWarnings] = useState([]);
    const [dailyRecommendation, setDailyRecommendation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const intervalRef = useRef(null);

    const fetchInsights = async () => {
        try {
            const [liveRes, pricingRes, demandRes, stockRes] = await Promise.all([
                insightsApi.getLiveInsights(),
                insightsApi.getPricingSuggestions(),
                insightsApi.getDemandAlerts(),
                insightsApi.getStockWarnings(),
            ]);

            if (liveRes.data.success) {
                setInsights(liveRes.data.data);
            }
            setPricingSuggestions(pricingRes.data?.data || []);
            setDemandAlerts(demandRes.data?.data || []);
            setStockWarnings(stockRes.data?.data || []);
            setDailyRecommendation(liveRes.data?.data?.ai_insights || '');
            setLastUpdated(new Date().toLocaleTimeString());
            setError(null);
        } catch (err) {
            setError('Failed to load insights');
            console.error('Insights fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
        
        // Refresh every 1 minute.
        intervalRef.current = setInterval(fetchInsights, 60000);
        
        // Listen for sale creation events
        const handleSaleCreated = () => {
            console.log('Sale created - refreshing insights immediately');
            fetchInsights();
        };
        
        window.addEventListener('saleCreated', handleSaleCreated);
        
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.removeEventListener('saleCreated', handleSaleCreated);
        };
    }, []);

    if (loading) {
        return (
            <div className="fixed top-24 right-5 z-50 w-80 print:hidden">
                <div className="ai-gradient rounded-xl p-4 text-white shadow-2xl ai-glow">
                    <div className="animate-pulse">
                        <div className="h-4 bg-white/20 rounded mb-2"></div>
                        <div className="h-3 bg-white/20 rounded mb-4"></div>
                        <div className="space-y-2">
                            <div className="h-8 bg-white/20 rounded"></div>
                            <div className="h-8 bg-white/20 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed top-24 right-5 z-50 w-80 print:hidden">
                <div className="bg-red-500 rounded-xl p-4 text-white shadow-2xl">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm">{error}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-[84px] right-6 z-40 flex items-center justify-center sm:justify-start gap-2 w-12 h-12 sm:w-auto px-0 sm:px-4.5 py-0 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full text-white shadow-xl hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out border border-white/20 hover:from-emerald-600 hover:to-teal-700 font-bold text-xs tracking-wider uppercase print:hidden"
                title="Show AI Insights"
            >
                <Zap className="w-4 h-4 fill-emerald-300/40 text-emerald-300 animate-pulse pointer-events-none" />
                <span className="hidden sm:inline">AI Insights</span>
            </button>
        );
    }

    return (
        <>
            {/* Backdrop to dismiss on click outside */}
            <div 
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity duration-300 print:hidden"
                onClick={() => setIsVisible(false)}
            />
            
            {/* Slide-out Sidebar Panel */}
            <div className="fixed top-0 right-0 h-full w-80 sm:w-96 bg-gradient-to-b from-[#1C3A5A] to-[#0D1E30] text-white shadow-2xl z-50 flex flex-col border-l border-white/10 transition-transform duration-300 ease-in-out transform translate-x-0 animate-slide-in-right print:hidden">
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/10">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-white/10 p-2 rounded-xl text-yellow-400">
                            <Zap className="w-4.5 h-4.5 fill-yellow-400/20 text-yellow-400 animate-pulse pointer-events-none" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm tracking-wide">AI Insights</h3>
                            <p className="text-[10px] text-white/50">Real-time business intelligence</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setIsRefreshing(true);
                                fetchInsights().finally(() => setIsRefreshing(false));
                            }}
                            disabled={isRefreshing}
                            className="bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all disabled:opacity-50 text-white"
                            title="Refresh insights"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all text-white font-bold"
                            title="Minimize Insights"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 overflow-y-auto space-y-5">
                    <p className="text-[10px] text-white/50 text-center">
                        Last updated {lastUpdated ? `@ ${lastUpdated}` : 'just now'}
                    </p>
                    
                    {/* Pricing Optimization */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2.5 mb-3">
                            <TrendingUp className="w-4.5 h-4.5 text-green-400" />
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Pricing Optimization</h4>
                        </div>
                        {pricingSuggestions.length > 0 ? (
                            <div className="space-y-2">
                                {pricingSuggestions.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-white/90 text-xs flex items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                                        <span><strong className="text-white">{item.product_name}</strong>: {item.reason}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/60 text-xs">No pricing suggestions available</p>
                        )}
                    </div>

                    {/* Demand Alert */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2.5 mb-3">
                            <Zap className="w-4.5 h-4.5 text-yellow-400" />
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Demand Alert</h4>
                        </div>
                        {demandAlerts.length > 0 ? (
                            <div className="space-y-2">
                                {demandAlerts.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-white/90 text-xs flex items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                                        <span><strong className="text-white">{item.product_name}</strong>: {item.recommendation}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/60 text-xs">No high-demand items detected</p>
                        )}
                    </div>

                    {/* Stock Warning */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2.5 mb-3">
                            <Package className="w-4.5 h-4.5 text-rose-400" />
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Stock Warning</h4>
                        </div>
                        {stockWarnings.length > 0 ? (
                            <div className="space-y-2">
                                {stockWarnings.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-white/90 text-xs flex items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                                        <span><strong className="text-white">{item.product_name}</strong>: {item.current_stock} units left ({item.urgency})</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/60 text-xs">All stocks adequate</p>
                        )}
                    </div>

                    {/* Daily AI Recommendation */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md space-y-2.5">
                        <h4 className="text-white font-bold text-xs uppercase tracking-wider">Daily Recommendation</h4>
                        <p className="text-xs text-white/90 leading-relaxed bg-white/5 rounded-xl p-3 border border-white/5">
                            {dailyRecommendation || 'No recommendation available yet.'}
                        </p>
                        <p className="text-[10px] text-white/50 italic leading-snug">
                            This recommendation is generated automatically from live sales data and updates daily.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIInsightsWidget;