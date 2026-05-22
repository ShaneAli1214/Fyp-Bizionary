import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import ReactECharts from 'echarts-for-react';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, Receipt } from 'lucide-react';
import SalesByProduct from '../../components/dashboard/SalesByProduct';
import SalesHistory from '../../components/dashboard/SalesHistory';
// Removed InventoryTurnover, DSOCard, ProductHeatmap per user request
import CalendarWidget from '../../components/dashboard/CalendarWidget';

const Dashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [data, setData] = useState({
        kpis: null,
        monthlyPerformance: [],
        dailyPerformance: [],
        recentSales: [],
        lowStock: []
    });

    useEffect(() => {
        const normalizeKpis = (raw = {}) => ({
            total_revenue: raw.total_revenue ?? 0,
            inventory_value: raw.total_inventory_value ?? 0,
            total_products: raw.total_products ?? 0,
            unpaid_invoices_count: raw.pending_company_payables ?? raw.unpaid_invoices ?? 0,
            low_stock_count: raw.low_stock_count ?? 0,
            total_invoices: raw.total_purchase_orders ?? raw.total_invoices ?? 0,
        });

        const fetchDashboardData = async () => {
            try {
                const [kpisRes, monthlyRes, salesRes, stockRes] = await Promise.allSettled([
                    api.get('dashboard/kpis/'),
                    api.get('dashboard/sales-performance/', {
                        params: { period: 'monthly' },
                    }),
                    api.get('dashboard/recent-sales/'),
                    api.get('dashboard/low-stock-products/')
                ]);

                const monthlyPerformance = monthlyRes.status === 'fulfilled' ? monthlyRes.value.data : [];
                const monthToDisplay = selectedMonth || monthlyPerformance[monthlyPerformance.length - 1]?.period || '';

                if (!selectedMonth && monthToDisplay) {
                    setSelectedMonth(monthToDisplay);
                }

                let dailyPerformance = [];
                if (/^\d{4}-\d{2}$/.test(monthToDisplay)) {
                    const [yearStr, monthStr] = monthToDisplay.split('-');
                    const year = Number(yearStr);
                    const month = Number(monthStr);
                    const from = new Date(year, month - 1, 1).toISOString().split('T')[0];
                    const to = new Date(year, month, 0).toISOString().split('T')[0];

                    const dailyRes = await api.get('dashboard/sales-performance/', {
                        params: {
                            period: 'daily',
                            start_date: from,
                            end_date: to,
                        },
                    });
                    dailyPerformance = dailyRes.data || [];
                }

                setData({
                    kpis: {
                        ...normalizeKpis(kpisRes.status === 'fulfilled' ? kpisRes.value.data : {}),
                    },
                    monthlyPerformance,
                    dailyPerformance,
                    recentSales: salesRes.status === 'fulfilled' ? salesRes.value.data : [],
                    lowStock: stockRes.status === 'fulfilled' ? stockRes.value.data : []
                });

                if ([kpisRes, monthlyRes, salesRes, stockRes].some(r => r.status === 'rejected')) {
                    console.warn('Some dashboard endpoints failed; rendered available data only.');
                }
            } catch (error) {
                console.warn('Dashboard API calls failed, rendering empty state values.');

                setData({
                    kpis: {
                        total_revenue: 0,
                        inventory_value: 0,
                        total_products: 0,
                        unpaid_invoices_count: 0,
                        low_stock_count: 0,
                        total_invoices: 0,
                    },
                    monthlyPerformance: [],
                    dailyPerformance: [],
                    recentSales: [],
                    lowStock: []
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // Keep dashboard data in sync and recover automatically if backend starts later.
        const refreshTimer = setInterval(fetchDashboardData, 15000);
        return () => clearInterval(refreshTimer);
    }, [selectedMonth]);

    if (loading) {
        return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
    }

    const { kpis, monthlyPerformance, dailyPerformance, recentSales, lowStock } = data;

    const latestRevenue = monthlyPerformance[monthlyPerformance.length - 1]?.revenue ?? 0;
    const selectedMonthLabel = selectedMonth || monthlyPerformance[monthlyPerformance.length - 1]?.period || 'N/A';

    const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayRevenue = dailyPerformance.reduce((acc, item) => {
        const date = new Date(item.period);
        if (Number.isNaN(date.getTime())) {
            return acc;
        }
        const key = weekdayMap[date.getDay()];
        acc[key] = (acc[key] || 0) + Number(item.revenue || 0);
        return acc;
    }, {});

    const weekdayStats = weekdayOrder.map((day) => ({
        day,
        revenue: weekdayRevenue[day] || 0,
    }));
    const maxWeekdayRevenue = Math.max(...weekdayStats.map((d) => d.revenue), 1);
    // Helper: Sparkline small chart with tooltip and last-value indicator
    const Sparkline = ({ dataKey = 'value', data = [] }) => {
        const last = data.length? data[data.length-1][dataKey] : 0;
        return (
            <div className="flex items-center gap-2">
              <div style={{width:120,height:34}}>
                <ResponsiveContainer width={120} height={34}>
                    <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(10,110,209,0.95)" stopOpacity={0.95} />
                                <stop offset="100%" stopColor="rgba(10,110,209,0.12)" stopOpacity={0.12} />
                            </linearGradient>
                        </defs>
                        <Tooltip formatter={(v)=>formatPKR(v)} cursor={false} />
                        <Area type="monotone" dataKey={dataKey} stroke="#0A6ED1" strokeWidth={2} fill="url(#sparkGradient)" fillOpacity={0.2} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-sm font-semibold text-textMain">{formatPKR(last)}</div>
            </div>
        );
    };

    // Gauge will be rendered using ECharts below for smoother animation
    const Gauge = ({ value = 0, label = '', color = '#0A6ED1' }) => {
        const option = {
            series: [
                {
                    type: 'gauge',
                    startAngle: 200,
                    endAngle: -20,
                    progress: { show: true, width: 12, itemStyle: { color } },
                    axisLine: { lineStyle: { width: 12, color: [[1, '#07142733']] } },
                    axisTick: { show: false },
                    splitLine: { show: false },
                    axisLabel: { show: false },
                    detail: {
                        valueAnimation: true,
                        formatter: '{value}%',
                        color: '#fff',
                        fontSize: 16,
                    },
                    data: [{ value: Math.round(value), name: label }],
                    title: { show: true, offsetCenter: [0, '38%'], color: '#d7e6f5', fontSize: 12 },
                },
            ],
            backgroundColor: 'transparent'
        };

        return <ReactECharts option={option} style={{ width: 120, height: 120 }} />;
    };
    // Custom Tooltip for Area Chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0e2140] p-3 rounded-lg border border-[#2d4f78] shadow-lg text-sm">
                    <p className="font-bold text-slate-100 mb-1">{label}</p>
                    <p className="font-semibold text-cyan-300">
                        {formatPKR(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const handleMonthlyPointClick = (state) => {
        const monthKey = state?.activeLabel || state?.activePayload?.[0]?.payload?.period;
        if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
            return;
        }
        setSelectedMonth(monthKey);
    };

    // Prepare series for comparison: revenue vs previous revenue
    const compData = monthlyPerformance.map((row, idx) => ({
        period: row.period,
        revenue: Number(row.revenue || 0),
        prev_revenue: Number(monthlyPerformance[idx - 1]?.revenue || 0)
    }));

    // KPI sparkline sample data
    const sampleSpark = monthlyPerformance.slice(-8).map((r) => ({ value: Number(r.revenue || 0) }));

    return (
        <div className="space-y-8">
            {/* Header/Hero Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-textMain dark:text-slate-100">Business Overview</h1>
                    <p className="text-textMuted dark:text-slate-300 text-sm mt-1">Live business snapshot from your current ERP data.</p>
                </div>
                <div className="w-full md:w-56">
                  <CalendarWidget onChange={() => {}} />
                </div>
            </div>

            {/* Apps strip removed from Dashboard since it's displayed under the topbar via the Navbar */}

            {/* Insights cards (SAP-like tiles with mini charts) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-textMain">Insights</h3>
                    <button className="text-xs text-primary font-semibold">Add Tiles</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Total Revenue */}
                    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="text-xs text-textMuted">Total Revenue</div>
                                <div className="text-lg font-extrabold text-textMain mt-1">{formatPKR(kpis.total_revenue)}</div>
                            </div>
                                <div style={{ width: 110, height: 72 }}>
                                <ReactECharts option={{ xAxis:{type:'category',show:false,data:sampleSpark.map((s,i)=>i)}, yAxis:{show:false}, tooltip:{ trigger:'axis', formatter: (params)=> formatPKR(params[0].value) }, series:[{type:'line', smooth:true, data: sampleSpark.map(s=>s.value), lineStyle:{color:'#0A6ED1', width:2}, areaStyle:{color:'rgba(10,110,209,0.12)'}}], backgroundColor:'transparent'}} style={{ width: 110, height: 72 }} />
                            </div>
                        </div>
                    </div>

                    {/* Low Stock Items */}
                    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="text-xs text-textMuted">Low Stock Items</div>
                                <div className="text-lg font-extrabold text-textMain mt-1">{kpis.low_stock_count}</div>
                            </div>
                            <div style={{ width: 110, height: 72 }}>
                                <ReactECharts option={{ xAxis:{type:'category',show:false,data:lowStock.slice(0,6).map((s,i)=>s.product_name||`P${i}`)}, yAxis:{show:false}, tooltip:{ trigger:'axis', formatter: (params)=> `${params[0].name}: ${params[0].value} units` }, series:[{type:'bar', data: lowStock.slice(0,6).map(s=>s.stock_quantity||0), itemStyle:{color:'#f59e0b'}, barWidth:'60%'}], backgroundColor:'transparent'}} style={{ width: 110, height: 72 }} />
                            </div>
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="text-xs text-textMuted">Top Products (recent)</div>
                                <div className="text-lg font-extrabold text-textMain mt-1">{(recentSales.length>0)? recentSales.slice(0,1)[0].product_name : '—'}</div>
                            </div>
                            <div style={{ width: 110, height: 72 }}>
                                <ReactECharts option={{ xAxis:{type:'category',show:false,data: recentSales.slice(0,6).map(s=>s.product_name||'')}, yAxis:{show:false}, tooltip:{ trigger:'axis', formatter: (params)=> `${params[0].name}: ${params[0].value}` }, series:[{type:'bar', data: recentSales.slice(0,6).map(s=>s.quantity_sold||1), itemStyle:{color:'#7e63ff'}, barWidth:'60%'}], backgroundColor:'transparent'}} style={{ width: 110, height: 72 }} />
                            </div>
                        </div>
                    </div>

                    {/* Pending Invoices */}
                    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="text-xs text-textMuted">Pending Invoices</div>
                                <div className="text-lg font-extrabold text-textMain mt-1">{kpis.unpaid_invoices_count}</div>
                            </div>
                            <div style={{ width: 110, height: 72 }}>
                                <ReactECharts option={{ series:[{ type: 'pie', radius: ['60%','80%'], avoidLabelOverlap:false, label:{show:false}, data:[{value:kpis.unpaid_invoices_count, name:'Pending'},{value: Math.max(0, (kpis.total_invoices || 0) - (kpis.unpaid_invoices_count||0)), name:'Others'}], color:['#ef4444','#94a3b8']}], tooltip:{ trigger:'item', formatter: (params)=> `${params.name}: ${params.value}` }, backgroundColor:'transparent' }} style={{ width: 110, height: 72 }} />
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="text-xs text-textMuted">Recent Sales</div>
                                <div className="text-lg font-extrabold text-textMain mt-1">{recentSales.length}</div>
                            </div>
                            <div style={{ width: 110, height: 72 }}>
                                <ReactECharts option={{ xAxis:{type:'category',show:false,data: recentSales.slice(0,6).map((s,i)=>i)}, yAxis:{show:false}, tooltip:{ trigger:'axis', formatter: (params)=> formatPKR(params[0].value) }, series:[{type:'line', smooth:true, data: recentSales.slice(0,6).map(s=>s.total_price||0), lineStyle:{color:'#06b6d4',width:2}, areaStyle:{color:'rgba(6,182,212,0.12)'}}], backgroundColor:'transparent'}} style={{ width: 110, height: 72 }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom analytics widgets removed per user request */}

            {/* Analytics charts removed as requested */}

            {/* Bottom widgets replaced with simpler sales visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesHistory monthlyPerformance={monthlyPerformance} />
                </div>

                <div className="lg:col-span-1">
                    <SalesByProduct recentSales={recentSales} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
