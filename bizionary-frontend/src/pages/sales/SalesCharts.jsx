import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';
import { formatDayLabel } from '../../utils/chartDates';

const formatCompactPKR = (value) => {
  const amount = Number(value) || 0;
  const absValue = Math.abs(amount);

  if (absValue >= 1_000_000) {
    return `Rs ${Number(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (absValue >= 1_000) {
    return `Rs ${Number(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }

  return `Rs ${amount}`;
};

const CustomActiveDot = (props) => {
  const { cx, cy } = props;
  return (
    <g>
      {/* Outer pulsing ring */}
      <circle cx={cx} cy={cy} r={8} fill="#A6764F" opacity={0.3} className="animate-ping" />
      {/* Inner solid white-bordered dot */}
      <circle cx={cx} cy={cy} r={4.5} fill="#A6764F" stroke="#ffffff" strokeWidth={1.5} />
    </g>
  );
};

const SalesTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface/95 backdrop-blur-md p-3.5 shadow-2xl text-text-primary min-w-[200px] animate-in fade-in zoom-in-95 duration-100">
      <div className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">{label}</div>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || '#A6764F' }} />
              <span>{item.name}</span>
            </div>
            <span className="font-mono text-sm font-bold text-text-primary">{formatPKR(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Elastic out spring animation easing function
const springEasing = (t) => {
  if (t === 0 || t === 1) return t;
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
};

const formatPeriodLabel = (periodStr, mode) => {
  if (!periodStr || periodStr === 'N/A') return periodStr;
  if (mode === 'daily') {
    return formatDayLabel(periodStr);
  }
  if (mode === 'weekly') {
    return `Wk of ${formatDayLabel(periodStr)}`;
  }
  if (mode === 'monthly') {
    const parts = periodStr.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]} ${year}`;
      }
    }
  }
  return periodStr;
};

const SalesCharts = ({ className, categoryFilter, searchTerm }) => {
  const [chartData, setChartData] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          period: selectedPeriod,
          category: categoryFilter,
          search: searchTerm,
        };

        if (selectedPeriod !== 'monthly' && selectedMonth) {
          params.month = selectedMonth;
        }

        const res = await api.get('dashboard/sales-performance/', { params });
        
        if (!cancelled && res.data) {
          const fetchedChartData = Array.isArray(res.data.chartData) ? res.data.chartData : [];
          const fetchedMonths = Array.isArray(res.data.availableMonths) ? res.data.availableMonths : [];
          
          setChartData(fetchedChartData);
          setAvailableMonths(fetchedMonths);

          // If no month is selected, default to the most recent month in availableMonths
          if (fetchedMonths.length > 0 && !selectedMonth) {
            setSelectedMonth(fetchedMonths[0].key);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setChartData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [categoryFilter, searchTerm, selectedPeriod, selectedMonth]);

  const amplitudeFactor = React.useMemo(() => {
    if (chartData.length === 0) return 0.2;
    const maxVal = Math.max(...chartData.map(d => Number(d.revenue || 0)));
    const factor = Math.min(1, maxVal / 100000);
    return 0.3 + factor * 0.6; // beautiful normalized breathing amplitude range [0.3, 0.9]
  }, [chartData]);

  const compData = chartData.map((row, idx) => {
    return {
      period: row.period,
      label: formatPeriodLabel(row.period, selectedPeriod),
      revenue: Number(row.revenue || 0),
      previousRevenue: Number(chartData[idx - 1]?.revenue || 0),
    };
  });

  return (
    <div className={className}>
      {/* Premium Chart Filter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-border gap-4">
        <div>
          <div className="text-sm font-bold text-text-primary tracking-tight">Sales Performance</div>
          <p className="text-xs text-text-secondary mt-0.5">Track revenue and growth dynamics over custom periods.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector dropdown */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
            <span>Month:</span>
            <select
              value={selectedMonth}
              disabled={selectedPeriod === 'monthly'}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-surface border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs text-text-primary"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
              {availableMonths.length === 0 && (
                <option value="">No months available</option>
              )}
            </select>
          </div>

          {/* Period Toggle Tabs */}
          <div className="flex bg-background p-1 rounded-xl">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                  selectedPeriod === p
                    ? 'bg-surface text-accent shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-sm text-text-secondary">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent mr-2" />
          Loading chart data...
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-text-secondary">
          No sales data found for the selected filter combination.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={compData} margin={{ top: 10, right: 12, left: -10, bottom: 10 }}>
            <defs>
              <style>{`
                @keyframes chartBreathe {
                  0%, 100% { opacity: 0.7; }
                  50% { opacity: 1.0; }
                }
                .chart-area-breathe {
                  animation: chartBreathe 6s ease-in-out infinite;
                }
              `}</style>
              <linearGradient id="strokeRevenueGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#A6764F" />
                <stop offset="50%" stopColor="#966945" />
                <stop offset="100%" stopColor="#8C5F3C" />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A6764F" stopOpacity={0.45 * amplitudeFactor} />
                <stop offset="50%" stopColor="#966945" stopOpacity={0.2 * amplitudeFactor} />
                <stop offset="100%" stopColor="#8C5F3C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E0D3" />
            <XAxis
              dataKey="label"
              interval={selectedPeriod === 'daily' ? 4 : 0}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8A7F6E', fontSize: 10, fontWeight: 500 }}
              tickMargin={10}
              height={30}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#8A7F6E', fontSize: 10, fontWeight: 500 }} 
              tickFormatter={formatCompactPKR} 
            />
            <Tooltip content={<SalesTooltip />} cursor={{ stroke: '#E8E0D3', strokeWidth: 1 }} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue" 
              stroke="url(#strokeRevenueGradient)" 
              strokeWidth={3} 
              fill="url(#colorRevenue)" 
              activeDot={<CustomActiveDot />} 
              isAnimationActive={true}
              animationDuration={800}
              animationEasing={springEasing}
              className="chart-area-breathe"
            />
            <Line 
              type="monotone" 
              dataKey="previousRevenue" 
              name={selectedPeriod === 'daily' ? "Previous Day Revenue" : selectedPeriod === 'weekly' ? "Previous Week Revenue" : "Previous Month Revenue"} 
              stroke="#6B8E4E" 
              strokeWidth={1.5} 
              strokeDasharray="4 4" 
              dot={false} 
              isAnimationActive={true}
              animationDuration={800}
              animationEasing={springEasing}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SalesCharts;
