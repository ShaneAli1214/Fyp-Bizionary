import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, AlertTriangle, Package, Zap, Eye, EyeOff, RefreshCw, X } from 'lucide-react';
import { insightsApi } from '../../services/insightsApi';

const AIInsightsWidget = () => {
    const [insights, setInsights] = useState(null);
    const [pricingSuggestions, setPricingSuggestions] = useState([]);
    const [demandAlerts, setDemandAlerts] = useState([]);
    const [stockWarnings, setStockWarnings] = useState([]);
    const [dailyRecommendation, setDailyRecommendation] = useState('');
    const [dailyTopByQuantity, setDailyTopByQuantity] = useState([]);
    const [dailyTopByRevenue, setDailyTopByRevenue] = useState([]);
    const [dailyTopByQuantityDate, setDailyTopByQuantityDate] = useState(null);
    const [dailyTopByRevenueDate, setDailyTopByRevenueDate] = useState(null);
    const [topPeriod, setTopPeriod] = useState('daily');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const intervalRef = useRef(null);

    const fetchInsights = async () => {
        try {
            const settled = await Promise.allSettled([
                insightsApi.getLiveInsights(),
                insightsApi.getPricingSuggestions(),
                insightsApi.getDemandAlerts(),
                insightsApi.getStockWarnings(),
            ]);

            const liveRes = settled[0].status === 'fulfilled' ? settled[0].value : null;
            const pricingRes = settled[1].status === 'fulfilled' ? settled[1].value : null;
            const demandRes = settled[2].status === 'fulfilled' ? settled[2].value : null;
            const stockRes = settled[3].status === 'fulfilled' ? settled[3].value : null;

            if (liveRes && liveRes.data && liveRes.data.success) {
                const data = liveRes.data.data || {};
                setInsights(data);
                // Try to load period-based top lists (daily/weekly/monthly)
                try {
                    const topRes = await insightsApi.getTop(topPeriod);
                    if (topRes.data?.success) {
                        const payload = topRes.data.data || {};
                        const qty = payload.top_by_quantity || { top: [] };
                        const rev = payload.top_by_revenue || { top: [] };
                        const normalizedQty = (qty.top || []).map(i => ({
                            product_id: i.product_id,
                            product_name: i.product_name,
                            units: i.units ?? i.total_sales ?? 0,
                            current_stock: i.current_stock ?? i.stock_level ?? 0,
                            change_vs_prev_day_percent: i.change_vs_prev_day_percent ?? null,
                        }));
                        const normalizedRev = (rev.top || []).map(i => ({
                            product_id: i.product_id,
                            product_name: i.product_name,
                            revenue: i.revenue ?? i.total_revenue ?? 0,
                            units: i.units ?? i.total_units ?? i.total_sales ?? 0,
                            current_stock: i.current_stock ?? i.stock_level ?? 0,
                            change_vs_prev_day_percent: i.change_vs_prev_day_percent ?? null,
                        }));
                        setDailyTopByQuantity(normalizedQty.slice(0,3));
                        setDailyTopByRevenue(normalizedRev.slice(0,3));
                        setDailyTopByQuantityDate(`${payload.period} (${payload.days}d)`);
                        setDailyTopByRevenueDate(`${payload.period} (${payload.days}d)`);
                    }
                } catch (e) {
                    // fallback to existing daily extraction when top endpoint unavailable
                }
                // extract latest day's top lists safely
                try {
                    const qtyList = data.daily_top_by_quantity || [];
                    const latestQtyEntry = qtyList.length ? qtyList[qtyList.length - 1] : null;
                    const latestQty = (latestQtyEntry?.top) || [];
                    let finalQty = latestQty.slice(0, 3);
                    // pad to 3 using hot_products if necessary
                    if (finalQty.length < 3 && Array.isArray(data.hot_products)) {
                        const used = new Set(finalQty.map(i => i.product_id));
                        for (const p of data.hot_products) {
                            if (finalQty.length >= 3) break;
                            if (used.has(p.product_id)) continue;
                            finalQty.push({ product_id: p.product_id, product_name: p.product_name, units: p.total_sales, current_stock: p.stock_level ?? p.stock_level ?? 0, change_vs_prev_day_percent: null });
                        }
                    }
                    // only set fallback values when top endpoint not used
                    if (!dailyTopByQuantity || dailyTopByQuantity.length === 0) {
                        setDailyTopByQuantity(finalQty.slice(0, 3));
                        setDailyTopByQuantityDate(latestQtyEntry?.date || null);
                    }
                } catch (e) {
                    setDailyTopByQuantity([]);
                    setDailyTopByQuantityDate(null);
                }

                try {
                    const revList = data.daily_top_by_revenue || [];
                    const latestRevEntry = revList.length ? revList[revList.length - 1] : null;
                    const latestRev = (latestRevEntry?.top) || [];
                    let finalRev = latestRev.slice(0, 3);
                    // ensure revenue list doesn't include quantity items (derive from API quantity list)
                    const qtyApiList = (data.daily_top_by_quantity || []);
                    const qtyLatestApiEntry = qtyApiList.length ? qtyApiList[qtyApiList.length - 1] : null;
                    const qtyApiTop = (qtyLatestApiEntry?.top) || [];
                    const qtyIds = new Set(qtyApiTop.map(i => i.product_id));
                    let filteredRev = latestRev.slice();
                    let finalRevFiltered = filteredRev.slice(0, 3);
                    // pad to 3 using hot_products ordered by revenue, excluding qtyIds and already used
                    if (finalRevFiltered.length < 3 && Array.isArray(data.hot_products)) {
                        const used = new Set(finalRevFiltered.map(i => i.product_id));
                        const byRevenue = [...data.hot_products].sort((a,b) => (b.total_revenue||0) - (a.total_revenue||0));
                        for (const p of byRevenue) {
                            if (finalRevFiltered.length >= 3) break;
                            if (used.has(p.product_id) || qtyIds.has(p.product_id)) continue;
                            finalRevFiltered.push({
                                product_id: p.product_id,
                                product_name: p.product_name,
                                revenue: p.total_revenue || 0,
                                units: p.total_sales ?? p.total_units ?? 0,
                                current_stock: p.stock_level ?? 0,
                                change_vs_prev_day_percent: null,
                            });
                        }
                    }
                    finalRev = finalRevFiltered;
                    if (!dailyTopByRevenue || dailyTopByRevenue.length === 0) {
                        setDailyTopByRevenue(finalRev.slice(0, 3));
                        setDailyTopByRevenueDate(latestRevEntry?.date || null);
                    }
                } catch (e) {
                    setDailyTopByRevenue([]);
                    setDailyTopByRevenueDate(null);
                }
            }
            setPricingSuggestions(pricingRes && pricingRes.data?.data ? pricingRes.data.data : []);
            setDemandAlerts(demandRes && demandRes.data?.data ? demandRes.data.data : []);
            setStockWarnings(stockRes && stockRes.data?.data ? stockRes.data.data : []);
            setDailyRecommendation(liveRes && liveRes.data?.data ? liveRes.data.data.ai_insights : '');
            setLastUpdated(new Date().toLocaleTimeString());
            setError(null);
        } catch (err) {
            // Non-fatal: show a banner but keep any partial data
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

    // Reload top lists when period changes
    useEffect(() => {
        let cancelled = false;
        const loadTop = async () => {
            try {
                const topRes = await insightsApi.getTop(topPeriod);
                if (cancelled) return;
                if (topRes.data?.success) {
                            const payload = topRes.data.data || {};
                            const qty = payload.top_by_quantity || { top: [] };
                            const rev = payload.top_by_revenue || { top: [] };
                            const normalizedQty = (qty.top || []).map(i => ({
                                product_id: i.product_id,
                                product_name: i.product_name,
                                units: i.units ?? i.total_sales ?? 0,
                                current_stock: i.current_stock ?? i.stock_level ?? 0,
                                change_vs_prev_day_percent: i.change_vs_prev_day_percent ?? null,
                            }));
                            const normalizedRev = (rev.top || []).map(i => ({
                                product_id: i.product_id,
                                product_name: i.product_name,
                                revenue: i.revenue ?? i.total_revenue ?? 0,
                                units: i.units ?? i.total_units ?? i.total_sales ?? 0,
                                current_stock: i.current_stock ?? i.stock_level ?? 0,
                                change_vs_prev_day_percent: i.change_vs_prev_day_percent ?? null,
                            }));
                            setDailyTopByQuantity(normalizedQty.slice(0,3));
                            setDailyTopByRevenue(normalizedRev.slice(0,3));
                            setDailyTopByQuantityDate(`${payload.period} (${payload.days}d)`);
                            setDailyTopByRevenueDate(`${payload.period} (${payload.days}d)`);
                        }
            } catch (e) {
                // ignore and keep existing
            }
        };
        loadTop();
        return () => { cancelled = true; };
    }, [topPeriod]);

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

                            {/* Top 3 period selector */}
                            <div className="flex items-center gap-2 justify-end">
                                <div className="text-[10px] text-white/50 mr-2">Range:</div>
                                {['daily','weekly','monthly'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setTopPeriod(p)}
                                        className={`text-[11px] px-2 py-1 rounded-lg border ${topPeriod===p? 'bg-white/10 border-white/20 text-white font-semibold' : 'bg-transparent border-white/5 text-white/60'}`}>
                                        {p[0].toUpperCase() + p.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Top 3 by Quantity */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <Package className="w-4.5 h-4.5 text-sky-400" />
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">Top 3 (Quantity)</h4>
                                </div>
                                {dailyTopByQuantityDate ? <div className="text-[10px] text-white/50">{dailyTopByQuantityDate}</div> : null}
                            </div>
                            {dailyTopByQuantity.length > 0 ? (
                                <div className="space-y-2">
                                            {dailyTopByQuantity.map((item, idx) => (
                                                <div key={idx} className="text-white/90 text-xs flex items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                                                    <span>
                                                        <strong className="text-white">{item.product_name}</strong>: Sold {item.units ?? 0} • Left {item.current_stock ?? item.stock_level ?? 0} units
                                                        {item.change_vs_prev_day_percent != null ? (
                                                            <span className="text-white/60"> ({item.change_vs_prev_day_percent}% vs prev)</span>
                                                        ) : null}
                                                    </span>
                                                </div>
                                            ))}
                                </div>
                            ) : (
                                <p className="text-white/60 text-xs">No recent quantity data</p>
                            )}
                        </div>

                        {/* Top 3 by Revenue */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <TrendingUp className="w-4.5 h-4.5 text-green-400" />
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">Top 3 (Revenue)</h4>
                                </div>
                                {dailyTopByRevenueDate ? <div className="text-[10px] text-white/50">{dailyTopByRevenueDate}</div> : null}
                            </div>
                            {dailyTopByRevenue.length > 0 ? (
                                <div className="space-y-2">
                                    {dailyTopByRevenue.map((item, idx) => (
                                        <div key={idx} className="text-white/90 text-xs flex items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                                            <span>
                                                <strong className="text-white">{item.product_name}</strong>: ₨{(item.revenue || 0).toLocaleString('en-US', {maximumFractionDigits:0})} • Sold {item.units ?? 0} • Left {item.current_stock ?? 0} units
                                                {item.change_vs_prev_day_percent != null ? (
                                                    <span className="text-white/60"> ({item.change_vs_prev_day_percent}% vs prev)</span>
                                                ) : null}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-white/60 text-xs">No recent revenue data</p>
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