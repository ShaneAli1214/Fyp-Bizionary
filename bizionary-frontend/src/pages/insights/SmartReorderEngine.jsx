import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bot } from 'lucide-react';
import { insightsApi } from '../../services/insightsApi';

const SmartReorderEngine = () => {
    const pageSize = 10;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchSmartReorder = async () => {
        try {
            setLoading(true);
            const response = await insightsApi.getSmartReorderEngine({
                days: 30,
                lead_time_days: 7,
                coverage_days: 14,
            });

            const payload = response.data?.data;
            if (!payload) {
                throw new Error('No smart reorder data returned from API');
            }

            setData(payload);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to load smart reorder data');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSmartReorder();
        const intervalId = setInterval(fetchSmartReorder, 60000);
        return () => clearInterval(intervalId);
    }, []);

    const allProductsPlanning = useMemo(() => data?.product_planning || [], [data]);
    const reorderCandidates = useMemo(() => data?.recommendations || [], [data]);
    const discontinueCandidates = useMemo(() => data?.discontinue_candidates || [], [data]);
    const totalPages = Math.max(1, Math.ceil(allProductsPlanning.length / pageSize));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return allProductsPlanning.slice(start, start + pageSize);
    }, [allProductsPlanning, currentPage]);

    useEffect(() => {
        setCurrentPage((prev) => Math.min(Math.max(prev, 1), totalPages));
    }, [totalPages]);

    const goToPreviousPage = () => {
        setCurrentPage((prev) => Math.max(1, prev - 1));
    };

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-3 animate-spin">
                        <Bot className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-sm text-textMuted">Loading smart reorder recommendations...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-3xl bg-red-50 p-8 border border-red-200">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                        <h3 className="font-semibold text-red-900">Error Loading Smart Reorder Engine</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
                <button
                    onClick={fetchSmartReorder}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl bg-gradient-to-r from-primary/10 to-blue-500/10 p-8 border border-primary/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white">
                        <Bot className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-textMain">Smart Reorder Engine</h1>
                        <p className="text-textMuted mt-1">Live reorder planning from sales velocity and stock coverage.</p>
                        <p className="text-xs text-textMuted mt-1">Data source: db.sqlite3 (live)</p>
                    </div>
                </div>
            </div>

            {data && (
                <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-textMuted">
                        <span className="font-semibold text-textMain">To Reorder:</span> {data.total_products_to_reorder} / {data.total_products_evaluated}
                        <span className="mx-2">|</span>
                        <span className="font-semibold text-textMain">Discontinue Review:</span> {data.total_discontinue_candidates}
                    </div>
                    <div className="text-xs text-textMuted">
                        Window: {data.period_days}d, lead time {data.lead_time_days}d, coverage {data.coverage_days}d
                    </div>
                </div>
            )}

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-textMain mb-2">All Products Planning</h3>
                <p className="text-sm text-textMuted mb-4">Showing all products with demand, stock, reorder quantity, and urgency.</p>
                {allProductsPlanning.length === 0 ? (
                    <p className="text-sm text-textMuted">No product planning data available yet.</p>
                ) : (
                    <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[920px]">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 text-textMuted font-semibold">Product</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Demand</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Current</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Target</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Reorder Qty</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Stockout (Days)</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Urgency</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProducts.map((item) => (
                                    <tr key={`reorder-${item.product_id}`} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 text-textMain font-medium">{item.product_name}</td>
                                        <td className="text-center py-3 text-textMain">{item.demand_band}</td>
                                        <td className="text-center py-3 text-textMain">{item.current_stock}</td>
                                        <td className="text-center py-3 text-textMain">{item.target_stock}</td>
                                        <td className="text-center py-3 text-primary font-bold">{item.recommended_order_quantity}</td>
                                        <td className="text-center py-3 text-textMain">{item.days_to_stockout === null ? 'N/A' : item.days_to_stockout}</td>
                                        <td className="text-center py-3 text-textMain">{item.urgency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-textMuted">
                            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, allProductsPlanning.length)} of {allProductsPlanning.length} products
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-textMain disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>

                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                                        currentPage === page
                                            ? 'bg-primary text-white border-primary'
                                            : 'border-gray-200 text-textMain hover:bg-gray-50'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-textMain disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                    </>
                )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-textMain mb-4">Immediate Reorder Queue</h3>
                {reorderCandidates.length === 0 ? (
                    <p className="text-sm text-green-700">No immediate reorder actions required based on current live data.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 text-textMuted font-semibold">Product</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Reorder Qty</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Urgency</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reorderCandidates.slice(0, 15).map((item) => (
                                    <tr key={`queue-${item.product_id}`} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 text-textMain font-medium">{item.product_name}</td>
                                        <td className="text-center py-3 text-primary font-bold">{item.recommended_order_quantity}</td>
                                        <td className="text-center py-3 text-textMain">{item.urgency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-textMain mb-4">Discontinue / Phase-Down Candidates</h3>
                {discontinueCandidates.length === 0 ? (
                    <p className="text-sm text-green-700">No low-demand discontinue candidates at the moment.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 text-textMuted font-semibold">Product</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Demand</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Units</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Current Stock</th>
                                    <th className="text-center py-3 text-textMuted font-semibold">Recommendation</th>
                                    <th className="text-left py-3 text-textMuted font-semibold">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discontinueCandidates.map((item) => (
                                    <tr key={`discontinue-${item.product_id}`} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 text-textMain font-medium">{item.product_name}</td>
                                        <td className="text-center py-3 text-textMain">{item.demand_band}</td>
                                        <td className="text-center py-3 text-textMain">{item.units_sold_period}</td>
                                        <td className="text-center py-3 text-textMain">{item.current_stock}</td>
                                        <td className="text-center py-3 text-textMain">{item.discontinue_recommendation}</td>
                                        <td className="py-3 text-textMain">{item.discontinue_reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartReorderEngine;
