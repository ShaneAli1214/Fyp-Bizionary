import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, AlertTriangle, Package, Zap, Eye, EyeOff, RefreshCw, X } from 'lucide-react';
import { insightsApi } from '../../services/insightsApi';
import useClickOutside from '../../hooks/useClickOutside';

const AIInsightsWidget = ({ isOpen, onClose }) => {
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
    const [lastUpdated, setLastUpdated] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const intervalRef = useRef(null);
    const scrollTimeoutRef = useRef(null);
    const panelRef = useRef(null);

    useClickOutside(panelRef, () => {
        if (isOpen) {
            onClose();
        }
    }, isOpen);

    // Scroll listener to auto-hide the floating button while scrolling
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 400);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

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

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop to dismiss on click outside */}
            <div 
                className="fixed inset-0 z-40 bg-primary/30 backdrop-blur-xs transition-opacity duration-300 print:hidden"
                onClick={onClose}
            />
            
            {/* Slide-out Sidebar Panel */}
            <div 
                ref={panelRef}
                className="fixed top-0 right-0 h-full w-80 sm:w-96 bg-gradient-to-b from-[#2B2620] to-[#0D1E30] text-card shadow-2xl z-50 flex flex-col border-l border-card/50 transition-transform duration-300 ease-in-out transform translate-x-0 animate-slide-in-right print:hidden"
            >
                {/* Header */}
                <div className="p-5 border-b border-card/50 flex items-center justify-between bg-primary/10">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-card/10 p-2 rounded-xl text-yellow-400">
                            <Zap className="w-4.5 h-4.5 fill-yellow-400/20 text-yellow-400 animate-pulse pointer-events-none" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm tracking-wide">AI Insights</h3>
                            <p className="text-[10px] text-card/50">Real-time business intelligence</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setIsRefreshing(true);
                                fetchInsights().finally(() => setIsRefreshing(false));
                            }}
                            disabled={isRefreshing}
                            className="bg-card/10 hover:bg-card/20 rounded-xl p-2 transition-all disabled:opacity-50 text-card"
                            title="Refresh insights"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-card/10 hover:bg-card/20 rounded-xl p-2 transition-all text-card font-bold"
                            title="Minimize Insights"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 overflow-y-auto space-y-5">
                    {error && (
                        <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl p-3 text-card flex items-center gap-2 text-xs">
                            <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                            <span>{error}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="animate-pulse space-y-5">
                            <div className="h-24 bg-card/5 rounded-2xl border border-card/50 p-4">
                                <div className="h-3 bg-card/20 rounded w-1/2 mb-3"></div>
                                <div className="h-2.5 bg-card/10 rounded w-full mb-2"></div>
                                <div className="h-2.5 bg-card/10 rounded w-5/6"></div>
                            </div>
                            <div className="h-24 bg-card/5 rounded-2xl border border-card/50 p-4">
                                <div className="h-3 bg-card/20 rounded w-1/2 mb-3"></div>
                                <div className="h-2.5 bg-card/10 rounded w-full mb-2"></div>
                                <div className="h-2.5 bg-card/10 rounded w-5/6"></div>
                            </div>
                            <div className="h-24 bg-card/5 rounded-2xl border border-card/50 p-4">
                                <div className="h-3 bg-card/20 rounded w-1/2 mb-3"></div>
                                <div className="h-2.5 bg-card/10 rounded w-full mb-2"></div>
                                <div className="h-2.5 bg-card/10 rounded w-5/6"></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-[10px] text-card/50 text-center">
                                Last updated {lastUpdated ? `@ ${lastUpdated}` : 'just now'}
                            </p>
                    
                    {/* Pricing Optimization */}
                    <div className="bg-card/5 border border-card/50 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2.5 mb-3">
                            <TrendingUp className="w-4.5 h-4.5 text-green-400" />
                            <h4 className="text-card font-bold text-xs uppercase tracking-wider">Pricing Optimization</h4>
                        </div>
                        {pricingSuggestions.length > 0 ? (
                            <div className="space-y-2">
                                {pricingSuggestions.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-card/90 text-xs flex items-start gap-2 border-b border-card/5 pb-2 last:border-0 last:pb-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                                        <span><strong className="text-card">{item.product_name}</strong>: {item.reason}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-card/60 text-xs">No pricing suggestions available</p>
                        )}
                    </div>

                    {/* Demand Alert */}
                    <div className="bg-card/5 border border-card/50 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2.5 mb-3">
                            <Zap className="w-4.5 h-4.5 text-yellow-400" />
                            <h4 className="text-card font-bold text-xs uppercase tracking-wider">Demand Alert</h4>
                        </div>
                        {demandAlerts.length > 0 ? (
                            <div className="space-y-2">
                                {demandAlerts.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-card/90 text-xs flex items-start gap-2 border-b border-card/5 pb-2 last:border-0 last:pb-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                                        <span><strong className="text-card">{item.product_name}</strong>: {item.recommendation}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-card/60 text-xs">No high-demand items detected</p>
                        )}
                    </div>

                    {/* Stock Warning */}
                    <div className="bg-card/5 border border-card/50 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2.5 mb-3">
                            <Package className="w-4.5 h-4.5 text-rose-400" />
                            <h4 className="text-card font-bold text-xs uppercase tracking-wider">Stock Warning</h4>
                        </div>
                        {stockWarnings.length > 0 ? (
                                <div className="space-y-2">
                                    {stockWarnings.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="text-card/90 text-xs flex items-start gap-2 border-b border-card/5 pb-2 last:border-0 last:pb-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                                            <span><strong className="text-card">{item.product_name}</strong>: {item.current_stock} units left ({item.urgency})</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-card/60 text-xs">All stocks adequate</p>
                            )}
                        </div>

                            {/* Top 3 period selector */}
                            <div className="flex items-center gap-2 justify-end">
                                <div className="text-[10px] text-card/50 mr-2">Range:</div>
                                {['daily','weekly','monthly'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setTopPeriod(p)}
                                        className={`text-[11px] px-2 py-1 rounded-lg border ${topPeriod===p? 'bg-card/10 border-card/50 text-card font-semibold' : 'bg-transparent border-card/5 text-card/60'}`}>
                                        {p[0].toUpperCase() + p.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Top 3 by Quantity */}
                        <div className="bg-card/5 border border-card/50 rounded-2xl p-4 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <Package className="w-4.5 h-4.5 text-sky-400" />
                                    <h4 className="text-card font-bold text-xs uppercase tracking-wider">Top 3 (Quantity)</h4>
                                </div>
                                {dailyTopByQuantityDate ? <div className="text-[10px] text-card/50">{dailyTopByQuantityDate}</div> : null}
                            </div>
                            {dailyTopByQuantity.length > 0 ? (
                                <div className="space-y-2">
                                            {dailyTopByQuantity.map((item, idx) => (
                                                <div key={idx} className="text-card/90 text-xs flex items-start gap-2 border-b border-card/5 pb-2 last:border-0 last:pb-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                                                    <span>
                                                        <strong className="text-card">{item.product_name}</strong>: Sold {item.units ?? 0} • Left {item.current_stock ?? item.stock_level ?? 0} units
                                                        {item.change_vs_prev_day_percent != null ? (
                                                            <span className="text-card/60"> ({item.change_vs_prev_day_percent}% vs prev)</span>
                                                        ) : null}
                                                    </span>
                                                </div>
                                            ))}
                                </div>
                            ) : (
                                <p className="text-card/60 text-xs">No recent quantity data</p>
                            )}
                        </div>

                        {/* Top 3 by Revenue */}
                        <div className="bg-card/5 border border-card/50 rounded-2xl p-4 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <TrendingUp className="w-4.5 h-4.5 text-green-400" />
                                    <h4 className="text-card font-bold text-xs uppercase tracking-wider">Top 3 (Revenue)</h4>
                                </div>
                                {dailyTopByRevenueDate ? <div className="text-[10px] text-card/50">{dailyTopByRevenueDate}</div> : null}
                            </div>
                            {dailyTopByRevenue.length > 0 ? (
                                <div className="space-y-2">
                                    {dailyTopByRevenue.map((item, idx) => (
                                        <div key={idx} className="text-card/90 text-xs flex items-start gap-2 border-b border-card/5 pb-2 last:border-0 last:pb-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                                            <span>
                                                <strong className="text-card">{item.product_name}</strong>: ₨{(item.revenue || 0).toLocaleString('en-US', {maximumFractionDigits:0})} • Sold {item.units ?? 0} • Left {item.current_stock ?? 0} units
                                                {item.change_vs_prev_day_percent != null ? (
                                                    <span className="text-card/60"> ({item.change_vs_prev_day_percent}% vs prev)</span>
                                                ) : null}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-card/60 text-xs">No recent revenue data</p>
                            )}
                        </div>

                    {/* Daily AI Recommendation */}
                    <div className="bg-card/5 border border-card/50 rounded-2xl p-4 backdrop-blur-md space-y-2.5">
                        <h4 className="text-card font-bold text-xs uppercase tracking-wider">Daily Recommendation</h4>
                        <p className="text-xs text-card/90 leading-relaxed bg-card/5 rounded-xl p-3 border border-card/5">
                            {dailyRecommendation || 'No recommendation available yet.'}
                        </p>
                        <p className="text-[10px] text-card/50 italic leading-snug">
                            This recommendation is generated automatically from live sales data and updates daily.
                        </p>
                    </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default AIInsightsWidget;