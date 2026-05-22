import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, AlertTriangle, Package, Zap, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { insightsApi } from '../../services/insightsApi';

const AIInsightsWidget = () => {
    const [insights, setInsights] = useState(null);
    const [pricingSuggestions, setPricingSuggestions] = useState([]);
    const [demandAlerts, setDemandAlerts] = useState([]);
    const [stockWarnings, setStockWarnings] = useState([]);
    const [dailyRecommendation, setDailyRecommendation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isVisible, setIsVisible] = useState(true);
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
            <div className="fixed top-24 right-5 z-50 w-80">
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
            <div className="fixed top-24 right-5 z-50 w-80">
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
                className="fixed top-24 right-5 z-50 w-14 h-14 ai-gradient rounded-full text-white shadow-2xl ai-glow flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                title="Show AI Insights"
            >
                <Eye className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className="fixed top-24 right-5 z-50 w-80 max-h-96 overflow-hidden insights-fade-in">
            <div className="ai-gradient rounded-xl shadow-2xl ai-glow backdrop-blur-sm bg-white/10 border border-white/20">
                {/* Header */}
                <div className="p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-lg">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm">AI Insights</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setIsRefreshing(true);
                                fetchInsights().finally(() => setIsRefreshing(false));
                            }}
                            disabled={isRefreshing}
                            className="bg-white/20 hover:bg-white/30 rounded-lg p-1.5 transition-colors disabled:opacity-50"
                            title="Refresh insights"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="bg-white/20 hover:bg-white/30 rounded-lg p-1.5 transition-colors"
                            title="Hide AI Insights"
                        >
                            <EyeOff className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4 space-y-4 max-h-72 overflow-y-auto">
                    <p className="text-xs opacity-90 text-center">
                        Real-time business intelligence {lastUpdated ? `- ${lastUpdated}` : ''}
                    </p>
                    {/* Pricing Optimization */}
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-300" />
                            <h4 className="text-white font-semibold text-xs">Pricing Optimization</h4>
                        </div>
                        {pricingSuggestions.length > 0 ? (
                            <div className="space-y-1">
                                {pricingSuggestions.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-white/90 text-xs flex items-start gap-2">
                                        <TrendingUp className="w-3 h-3 mt-0.5 text-green-300 flex-shrink-0" />
                                        <span>{item.product_name}: {item.reason}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/70 text-xs">No pricing suggestions available</p>
                        )}
                    </div>

                    {/* Demand Alert */}
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-yellow-300" />
                            <h4 className="text-white font-semibold text-xs">Demand Alert</h4>
                        </div>
                        {demandAlerts.length > 0 ? (
                            <div className="space-y-1">
                                {demandAlerts.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-white/90 text-xs flex items-start gap-2">
                                        <Zap className="w-3 h-3 mt-0.5 text-yellow-300 flex-shrink-0" />
                                        <span>{item.product_name}: {item.recommendation}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/70 text-xs">No high-demand items</p>
                        )}
                    </div>

                    {/* Stock Warning */}
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-red-300" />
                            <h4 className="text-white font-semibold text-xs">Stock Warning</h4>
                        </div>
                        {stockWarnings.length > 0 ? (
                            <div className="space-y-1">
                                {stockWarnings.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-white/90 text-xs flex items-start gap-2">
                                        <AlertTriangle className="w-3 h-3 mt-0.5 text-red-300 flex-shrink-0" />
                                        <span>{item.product_name}: {item.current_stock} left ({item.urgency})</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/70 text-xs">All stocks adequate</p>
                        )}
                    </div>

                    {/* Daily AI Recommendation */}
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm space-y-2">
                        <h4 className="text-white font-semibold text-xs">AI Recommendation (Daily)</h4>
                        <p className="text-[11px] text-white/95 bg-white/10 rounded-md p-2">
                            {dailyRecommendation || 'No recommendation available yet.'}
                        </p>
                        <p className="text-[10px] text-white/75">
                            This recommendation is generated automatically from live sales data and updates daily.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIInsightsWidget;