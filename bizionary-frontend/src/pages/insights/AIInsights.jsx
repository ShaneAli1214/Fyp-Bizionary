import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertCircle, Zap, Brain } from 'lucide-react';
import { insightsApi } from '../../services/insightsApi';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';

const NLP_PERIODS = {
    daily: { days: 1, label: 'Daily' },
    weekly: { days: 7, label: 'Weekly' },
    monthly: { days: 30, label: 'Monthly' },
};

const estimateSentimentFromRating = (rating) => {
    if (rating >= 4) {
        return { sentiment_label: 'positive', sentiment_score: 0.7 + ((rating - 4) * 0.2) };
    }
    if (rating <= 2) {
        return { sentiment_label: 'negative', sentiment_score: -0.7 - ((2 - rating) * 0.2) };
    }
    return { sentiment_label: 'neutral', sentiment_score: 0.1 };
};

const applyOptimisticReviewToReport = (currentReport, reviewPayload) => {
    if (!currentReport) {
        return currentReport;
    }

    const existingSummary = currentReport.review_summary || {};
    const previousTotal = Number(existingSummary.total_reviews || 0);
    const previousAverage = Number(existingSummary.average_rating || 0);
    const previousPositive = Number(existingSummary.positive_reviews || 0);
    const previousNeutral = Number(existingSummary.neutral_reviews || 0);
    const previousNegative = Number(existingSummary.negative_reviews || 0);

    const nextTotal = previousTotal + 1;
    const nextAverage = ((previousAverage * previousTotal) + Number(reviewPayload.rating || 0)) / nextTotal;

    const nextPositive = previousPositive + (reviewPayload.sentiment_label === 'positive' ? 1 : 0);
    const nextNeutral = previousNeutral + (reviewPayload.sentiment_label === 'neutral' ? 1 : 0);
    const nextNegative = previousNegative + (reviewPayload.sentiment_label === 'negative' ? 1 : 0);

    const optimisticReview = {
        id: `temp-${Date.now()}`,
        customer_name: reviewPayload.customer_name,
        review_text: reviewPayload.review_text,
        rating: reviewPayload.rating,
        sentiment_label: reviewPayload.sentiment_label,
        sentiment_score: reviewPayload.sentiment_score,
        created_at: new Date().toISOString(),
    };

    return {
        ...currentReport,
        generated_at: new Date().toISOString(),
        review_summary: {
            ...existingSummary,
            total_reviews: nextTotal,
            average_rating: Number(nextAverage.toFixed(2)),
            positive_reviews: nextPositive,
            neutral_reviews: nextNeutral,
            negative_reviews: nextNegative,
            positive_ratio: Number(((nextPositive / nextTotal) * 100).toFixed(2)),
            negative_ratio: Number(((nextNegative / nextTotal) * 100).toFixed(2)),
        },
        recent_reviews: [optimisticReview, ...(currentReport.recent_reviews || [])].slice(0, 20),
    };
};

const AIInsights = () => {
    const { user } = useAuth();
    const isAccountant = user?.role_name === 'Accountant';
    const [activeTab, setActiveTab] = useState('live');
    const [selectedNlpPeriod, setSelectedNlpPeriod] = useState('monthly');
    const [insights, setInsights] = useState(null);
    const [nlpReport, setNlpReport] = useState(null);
    const [reviewForm, setReviewForm] = useState({
        customer_name: '',
        review_text: '',
        rating: 5,
    });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewStatus, setReviewStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [insightsError, setInsightsError] = useState('');
    const [nlpReportError, setNlpReportError] = useState('');

    const fetchInsights = async (showLoader = false) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
            const response = await insightsApi.getInsights();
            const insightsData = response.data?.data;

            if (!insightsData) {
                throw new Error('No data returned from API');
            }

            setInsights(insightsData);
            setInsightsError('');
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed to load insights';
            setInsightsError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const fetchNlpReport = async (periodKey = selectedNlpPeriod) => {
        try {
            const period = NLP_PERIODS[periodKey] || NLP_PERIODS.monthly;
            const response = await insightsApi.getLiveNlpReport(period.days);
            const reportData = response.data?.data;
            if (!reportData) {
                throw new Error('No NLP report data returned from API');
            }
            setNlpReport(reportData);
            setNlpReportError('');
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed to load NLP report';
            setNlpReportError(errorMsg);
        }
    };

    useEffect(() => {
        let isAlive = true;

        const runFetch = async (showLoader = false) => {
            if (!isAlive) return;
            await fetchInsights(showLoader);
            await fetchNlpReport(selectedNlpPeriod);
        };

        const handleRecommendationUpdate = () => {
            runFetch(false);
        };

        runFetch(true);
        const intervalId = setInterval(() => runFetch(false), 60000);
        window.addEventListener('insightsRecommendationUpdated', handleRecommendationUpdate);

        return () => {
            isAlive = false;
            clearInterval(intervalId);
            window.removeEventListener('insightsRecommendationUpdated', handleRecommendationUpdate);
        };
    }, [selectedNlpPeriod]);

    const downloadNlpReportCsv = () => {
        if (!nlpReport) return;

        const csvRows = [
            ['Section', 'Metric', 'Value'],
            ['Meta', 'Generated At', nlpReport.generated_at || ''],
            ['Meta', 'Period', (NLP_PERIODS[selectedNlpPeriod] || NLP_PERIODS.monthly).label],
            ['Sales', 'Total Sales', nlpReport.sales_summary?.total_sales || 0],
            ['Sales', 'Total Revenue', nlpReport.sales_summary?.total_revenue || 0],
            ['Sales', 'Average Order Value', nlpReport.sales_summary?.average_order_value || 0],
            ['Reviews', 'Total Reviews', nlpReport.review_summary?.total_reviews || 0],
            ['Reviews', 'Average Rating', nlpReport.review_summary?.average_rating || 0],
            ['Reviews', 'Positive Reviews', nlpReport.review_summary?.positive_reviews || 0],
            ['Reviews', 'Neutral Reviews', nlpReport.review_summary?.neutral_reviews || 0],
            ['Reviews', 'Negative Reviews', nlpReport.review_summary?.negative_reviews || 0],
            ['Reviews', 'Positive Ratio (%)', nlpReport.review_summary?.positive_ratio || 0],
            ['Reviews', 'Negative Ratio (%)', nlpReport.review_summary?.negative_ratio || 0],
            ['Recommendation', 'Text', nlpReport.recommendation || ''],
        ];

        (nlpReport.key_findings || []).forEach((finding, index) => {
            csvRows.push(['Finding', `Item ${index + 1}`, finding]);
        });

        csvRows.push([]);
        csvRows.push(['Recent Reviews']);
        csvRows.push(['Customer', 'Review', 'Rating', 'Sentiment', 'Sentiment Score']);

        (nlpReport.recent_reviews || []).forEach((review) => {
            csvRows.push([
                review.customer_name || '',
                review.review_text || '',
                review.rating || 0,
                review.sentiment_label || '',
                review.sentiment_score || 0,
            ]);
        });

        const csvText = csvRows
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nlp-report-${selectedNlpPeriod}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const submitCustomerReview = async (event) => {
        event.preventDefault();

        const payload = {
            customer_name: reviewForm.customer_name.trim(),
            review_text: reviewForm.review_text.trim(),
            rating: Number(reviewForm.rating),
        };

        if (!payload.customer_name || !payload.review_text) {
            setReviewStatus('Please add your name and review text.');
            return;
        }

        const optimisticSentiment = estimateSentimentFromRating(payload.rating);
        setReviewStatus('Submitting review...');
        setIsSubmittingReview(true);

        setNlpReport((prevReport) => applyOptimisticReviewToReport(prevReport, {
            ...payload,
            ...optimisticSentiment,
        }));

        try {
            await insightsApi.createCustomerReview(payload);

            setReviewForm((prevForm) => ({
                ...prevForm,
                review_text: '',
                rating: 5,
            }));

            await fetchNlpReport(selectedNlpPeriod);
            setReviewStatus('Review submitted. NLP report updated with live data.');
        } catch (err) {
            await fetchNlpReport(selectedNlpPeriod);
            setReviewStatus(err.response?.data?.error || err.message || 'Failed to submit review. Please try again.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const COLORS = ['#A6764F', '#6B8E4E', '#C99A4A', '#B5533C', '#8A7F6E'];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 animate-spin">
                        <Brain className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-textMain">Analyzing your data...</p>
                    <p className="text-sm text-textMuted mt-1">AI is generating insights</p>
                </div>
            </div>
        );
    }

    const errorBanner = insightsError ? (
        <div className="rounded-3xl bg-status-info/10 p-4 border border-card mb-4">
            <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-status-info" />
                <div>
                    <div className="font-semibold text-red-900">Error Loading Insights</div>
                    <div className="text-sm text-status-info">{insightsError}</div>
                </div>
            </div>
        </div>
    ) : null;

    const displayedInsights = insights || {
        total_revenue: 0,
        total_sales: 0,
        average_order_value: 0,
        hot_products: [],
        cold_products: [],
        restocking_needed: [],
        sales_trend: [],
        ai_insights: 'AI insights unavailable',
        daily_top_by_quantity: [],
        daily_top_by_revenue: [],
    };

    const hotProductsChartData = displayedInsights.hot_products?.map(p => ({
        name: p.product_name?.substring(0, 12),
        sales: p.total_sales,
        revenue: p.total_revenue,
    })) || [];

    const coldProductsChartData = displayedInsights.cold_products?.map(p => ({
        name: p.product_name?.substring(0, 12),
        sales: p.total_sales,
        revenue: p.total_revenue,
    })) || [];

    const restockingChartData = displayedInsights.restocking_needed?.map(p => ({
        name: p.product_name?.substring(0, 12),
        current: p.stock_level,
        recommended: p.reorder_level,
    })) || [];

    const salesTrendData = displayedInsights.sales_trend || [];

    const dailyTopByQuantity = displayedInsights.daily_top_by_quantity || [];
    const latestQuantity = dailyTopByQuantity.length ? dailyTopByQuantity[dailyTopByQuantity.length - 1] : null;

    const dailyTopByRevenue = displayedInsights.daily_top_by_revenue || [];
    const latestRevenue = dailyTopByRevenue.length ? dailyTopByRevenue[dailyTopByRevenue.length - 1] : null;

    const hasInsights = insights && (Number(insights.total_revenue || 0) > 0 || Number(insights.total_sales || 0) > 0);

    if (!hasInsights) {
        return (
            <div className="space-y-6">
                <PageHeader title="AI Insights" subtitle="Powered by Advanced Analytics & AI" />
                {/* Feature Banner */}
                <div className="rounded-3xl bg-gradient-to-r from-primary/10 to-accent/20 p-8 border border-primary/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-card">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">AI Insights Dashboard</h2>
                            <p className="text-text-secondary mt-0.5 text-sm">Powered by Advanced Analytics & AI</p>
                        </div>
                    </div>
                </div>

                {/* Empty State / Compilation Placeholder */}
                <div className="rounded-3xl bg-card border border-card p-12 text-center flex flex-col items-center justify-center min-h-[350px] shadow-sm">
                    <div className="w-16 h-16 bg-page border border-slate-150 rounded-2xl flex items-center justify-center mb-5 animate-pulse">
                        <Brain className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="text-lg font-bold text-primary">AI Financial Insights Compiling</h3>
                    <p className="text-sm text-textMuted max-w-md mt-2 leading-relaxed">
                        Bizionary AI is currently analyzing your general ledger accounts. Predictive modeling, revenue diagnostics, and cash flow warnings will automatically activate once sales and revenue records are created.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl bg-gradient-to-r from-primary/10 to-accent/20 p-8 border border-primary/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-card">
                        <Brain className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">AI Insights Dashboard</h1>
                        <p className="text-text-secondary mt-1">Powered by Advanced Analytics & AI</p>
                        <p className="text-xs text-text-secondary mt-1">Data source: db.sqlite3 (live)</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            {!isAccountant && (
                <div className="rounded-2xl bg-surface p-2 border border-border shadow-sm inline-flex gap-2">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                            activeTab === 'live'
                                ? 'bg-primary text-card'
                                : 'bg-background text-text-primary hover:bg-border'
                        }`}
                    >
                        Live Insights
                    </button>
                    <button
                        onClick={() => setActiveTab('nlp')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                            activeTab === 'nlp'
                                ? 'bg-primary text-card'
                                : 'bg-background text-text-primary hover:bg-border'
                        }`}
                    >
                        NLP Report
                    </button>
                </div>
            )}

            {activeTab === 'nlp' ? (
                <div className="space-y-6">
                    {nlpReportError ? (
                        <div className="rounded-3xl bg-status-info/10 p-8 border border-card">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle className="w-6 h-6 text-status-info" />
                                <div>
                                    <h3 className="font-semibold text-red-900">Error Loading NLP Report</h3>
                                    <p className="text-sm text-status-info mt-1">{nlpReportError}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setNlpReportError('');
                                    fetchNlpReport(selectedNlpPeriod);
                                }}
                                className="px-4 py-2 bg-status-info text-card rounded-lg hover:bg-red-700 transition"
                            >
                                Retry
                            </button>
                        </div>
                    ) : !nlpReport ? (
                        <div className="rounded-3xl bg-yellow-50 p-8 border border-yellow-200">
                            <p className="text-yellow-800">NLP report is not available right now.</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                                <h3 className="text-lg font-bold text-textMain mb-4">Customer Reviews</h3>
                                <p className="text-sm text-textMuted mb-5">Submit a live review and it will flow into NLP report metrics immediately.</p>
                                <form onSubmit={submitCustomerReview} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-textMain mb-2">Customer Name</label>
                                        <input
                                            type="text"
                                            value={reviewForm.customer_name}
                                            onChange={(e) => setReviewForm((prev) => ({ ...prev, customer_name: e.target.value }))}
                                            placeholder="Enter your name"
                                            className="w-full px-3 py-2 rounded-lg border border-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            maxLength={255}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-semibold text-textMain mb-2">Rating</label>
                                        <select
                                            value={reviewForm.rating}
                                            onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                                            className="w-full px-3 py-2 rounded-lg border border-card bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        >
                                            {[5, 4, 3, 2, 1].map((r) => (
                                                <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-semibold text-textMain mb-2">Review</label>
                                        <textarea
                                            value={reviewForm.review_text}
                                            onChange={(e) => setReviewForm((prev) => ({ ...prev, review_text: e.target.value }))}
                                            placeholder="Share your feedback"
                                            className="w-full px-3 py-2 rounded-lg border border-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            rows={3}
                                            maxLength={2000}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-6 flex items-center gap-3">
                                        <button
                                            type="submit"
                                            disabled={isSubmittingReview}
                                            className="px-4 py-2 rounded-lg bg-primary text-card text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                                        >
                                            {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                                        </button>
                                        {reviewStatus && (
                                            <p className="text-sm text-textMuted">{reviewStatus}</p>
                                        )}
                                    </div>
                                </form>
                            </div>

                            <div className="rounded-3xl bg-card p-5 shadow-sm border border-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-textMain">NLP Report Controls</h3>
                                    <p className="text-sm text-textMuted mt-1">View and export live report data by period.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={selectedNlpPeriod}
                                        onChange={(e) => setSelectedNlpPeriod(e.target.value)}
                                        className="px-3 py-2 rounded-lg border border-card bg-card text-sm text-textMain"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                    <button
                                        onClick={downloadNlpReportCsv}
                                        className="px-4 py-2 rounded-lg bg-primary text-card text-sm font-semibold hover:bg-primary/90 transition"
                                    >
                                        Download CSV
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                                    <p className="text-sm text-textMuted font-semibold">Reviews ({(NLP_PERIODS[selectedNlpPeriod] || NLP_PERIODS.monthly).label})</p>
                                    <p className="text-3xl font-bold text-primary mt-2">{nlpReport.review_summary?.total_reviews || 0}</p>
                                </div>
                                <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                                    <p className="text-sm text-textMuted font-semibold">Avg Rating</p>
                                    <p className="text-3xl font-bold text-success mt-2">{nlpReport.review_summary?.average_rating || 0}/5</p>
                                </div>
                                <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                                    <p className="text-sm text-textMuted font-semibold">Positive Ratio</p>
                                    <p className="text-3xl font-bold text-success mt-2">{nlpReport.review_summary?.positive_ratio || 0}%</p>
                                </div>
                                <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                                    <p className="text-sm text-textMuted font-semibold">Sales in Report</p>
                                    <p className="text-3xl font-bold text-warning mt-2">{nlpReport.sales_summary?.total_sales || 0}</p>
                                </div>
                            </div>

                            <div className="rounded-3xl bg-gradient-to-br from-primary/5 via-accent/5 to-warning/5 p-8 border border-primary/20">
                                <h3 className="text-lg font-bold text-textMain mb-3">NLP Recommendation</h3>
                                <p className="text-textMain leading-7">{nlpReport.recommendation}</p>
                            </div>

                            <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                                <h3 className="text-lg font-bold text-textMain mb-4">Key Findings</h3>
                                <ul className="space-y-3">
                                    {(nlpReport.key_findings || []).map((item, idx) => (
                                        <li key={idx} className="text-textMain bg-page border border-card rounded-xl p-3">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                                <h3 className="text-lg font-bold text-textMain mb-4">Recent Customer Reviews</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-card">
                                                <th className="text-left py-3 text-textMuted font-semibold">Customer</th>
                                                <th className="text-left py-3 text-textMuted font-semibold">Review</th>
                                                <th className="text-center py-3 text-textMuted font-semibold">Rating</th>
                                                <th className="text-center py-3 text-textMuted font-semibold">Sentiment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(nlpReport.recent_reviews || []).map((review) => (
                                                <tr key={review.id} className="border-b border-card">
                                                    <td className="py-3 text-textMain font-medium">{review.customer_name}</td>
                                                    <td className="py-3 text-textMain">{review.review_text}</td>
                                                    <td className="py-3 text-center text-textMain">{review.rating}</td>
                                                    <td className="py-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                            review.sentiment_label === 'positive'
                                                                ? 'bg-success/15 text-success'
                                                                : review.sentiment_label === 'negative'
                                                                    ? 'bg-danger/15 text-danger'
                                                                    : 'bg-background text-text-secondary'
                                                        }`}>
                                                            {review.sentiment_label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-textMuted font-semibold">Total Revenue (30d)</p>
                            <p className="text-3xl font-bold text-primary mt-2">
                                ₨{(displayedInsights.total_revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-accent/15 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-accent" />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-textMuted font-semibold">Total Sales</p>
                            <p className="text-3xl font-bold text-success mt-2">{displayedInsights.total_sales || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center">
                            <Zap className="w-6 h-6 text-success" />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-textMuted font-semibold">Avg Order Value</p>
                            <p className="text-3xl font-bold text-warning mt-2">
                                ₨{(displayedInsights.average_order_value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-warning" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className={`grid grid-cols-1 ${isAccountant ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
                {/* Sales Trend */}
                <div className={`rounded-3xl bg-card p-6 shadow-sm border border-card ${isAccountant ? 'col-span-full' : ''}`}>
                    <h3 className="text-lg font-bold text-textMain mb-4">Sales Trend (30 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D3" />
                            <XAxis dataKey="date" tick={{ fill: '#8A7F6E', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#8A7F6E', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#FFFCF7', color: '#2E2620', border: '1px solid #E8E0D3', borderRadius: '12px' }} />
                            <Line type="monotone" dataKey="sales" stroke="#A6764F" strokeWidth={2} dot={{ fill: '#A6764F', r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Hot Selling Products */}
                {!isAccountant && (
                    <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                        <h3 className="text-lg font-bold text-textMain mb-4">🔥 Hot Selling Products</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={hotProductsChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D3" />
                                <XAxis dataKey="name" tick={{ fill: '#8A7F6E', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#8A7F6E', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#FFFCF7', color: '#2E2620', border: '1px solid #E8E0D3', borderRadius: '12px' }} />
                                <Bar dataKey="sales" fill="#6B8E4E" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Charts Row 2 */}
            {!isAccountant && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cold Selling Products */}
                    <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                        <h3 className="text-lg font-bold text-textMain mb-4">❄️ Low Selling Products</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={coldProductsChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D3" />
                                <XAxis dataKey="name" tick={{ fill: '#8A7F6E', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#8A7F6E', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#FFFCF7', color: '#2E2620', border: '1px solid #E8E0D3', borderRadius: '12px' }} />
                                <Bar dataKey="sales" fill="#C99A4A" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Restocking Needed */}
                    <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                        <h3 className="text-lg font-bold text-textMain mb-4">⚠️ Products Needing Restocking</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={restockingChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D3" />
                                <XAxis dataKey="name" tick={{ fill: '#8A7F6E', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#8A7F6E', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#FFFCF7', color: '#2E2620', border: '1px solid #E8E0D3', borderRadius: '12px' }} />
                                <Bar dataKey="current" fill="#B5533C" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="recommended" fill="#8A7F6E" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* AI Analysis */}
            <div className="rounded-3xl bg-gradient-to-br from-primary/5 via-accent/5 to-warning/5 p-8 border border-primary/20">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-textMain mb-3">🤖 AI Recommendations</h3>
                        <p className="text-textMain leading-7 whitespace-pre-wrap">{displayedInsights.ai_insights}</p>
                    </div>
                </div>
            </div>

                {errorBanner}

            {/* Daily Top Products (Quantity & Revenue) */}
            {!isAccountant && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                        <h3 className="text-lg font-bold text-textMain mb-3">Top Products (Daily by Quantity)</h3>
                        <p className="text-sm text-textMuted mb-3">Date: {latestQuantity?.date || 'N/A'}</p>
                        <ul className="space-y-2">
                            {(latestQuantity?.top || []).map((item, idx) => (
                                <li key={idx} className="flex items-center justify-between p-3 rounded-xl bg-page border border-card">
                                    <div>
                                        <div className="font-medium text-textMain">{item.product_name}</div>
                                        <div className="text-sm text-textMuted">Units: {item.units}</div>
                                    </div>
                                    <div className="text-sm font-semibold">
                                        {item.change_vs_prev_day_percent == null ? '-' : `${item.change_vs_prev_day_percent}%`}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                        <h3 className="text-lg font-bold text-textMain mb-3">Top Products (Daily by Revenue)</h3>
                        <p className="text-sm text-textMuted mb-3">Date: {latestRevenue?.date || 'N/A'}</p>
                        <ul className="space-y-2">
                            {(latestRevenue?.top || []).map((item, idx) => (
                                <li key={idx} className="flex items-center justify-between p-3 rounded-xl bg-page border border-card">
                                    <div>
                                        <div className="font-medium text-textMain">{item.product_name}</div>
                                        <div className="text-sm text-textMuted">Revenue: ₨{Number(item.revenue || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="text-sm font-semibold">
                                        {item.change_vs_prev_day_percent == null ? '-' : `${item.change_vs_prev_day_percent}%`}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Product Details Tables */}
            {!isAccountant && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Hot Products Table */}
                    <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                        <h3 className="text-lg font-bold text-textMain mb-4">Top Performers</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-card">
                                        <th className="text-left py-3 text-textMuted font-semibold">Product</th>
                                        <th className="text-right py-3 text-textMuted font-semibold">Sales</th>
                                        <th className="text-right py-3 text-textMuted font-semibold">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedInsights.hot_products?.map((product, idx) => (
                                        <tr key={idx} className="border-b border-card hover:bg-page">
                                            <td className="py-3 text-textMain font-medium">{product.product_name}</td>
                                            <td className="text-right py-3 text-textMain">{product.total_sales}</td>
                                            <td className="text-right py-3 text-status-success font-semibold">
                                                ₨{product.total_revenue?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Restocking Table */}
                    <div className="rounded-3xl bg-card p-6 shadow-sm border border-card">
                        <h3 className="text-lg font-bold text-textMain mb-4">Urgent: Low Stock</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-card">
                                        <th className="text-left py-3 text-textMuted font-semibold">Product</th>
                                        <th className="text-center py-3 text-textMuted font-semibold">Current</th>
                                        <th className="text-center py-3 text-textMuted font-semibold">Min</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedInsights.restocking_needed?.map((product, idx) => (
                                        <tr key={idx} className="border-b border-card hover:bg-status-info/10">
                                            <td className="py-3 text-textMain font-medium">{product.product_name}</td>
                                            <td className="text-center py-3 text-status-info font-bold">{product.stock_level}</td>
                                            <td className="text-center py-3 text-textMuted">{product.reorder_level}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
                </>
            )}
        </div>
    );
};

export default AIInsights;
