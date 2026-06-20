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
      <circle cx={cx} cy={cy} r={8} fill="#4f46e5" opacity={0.3} className="animate-ping" />
      {/* Inner solid white-bordered dot */}
      <circle cx={cx} cy={cy} r={4.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />
    </g>
  );
};

const SalesTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-md p-3.5 shadow-2xl text-white min-w-[200px] animate-in fade-in zoom-in-95 duration-100">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</div>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || '#4f46e5' }} />
              <span>{item.name}</span>
            </div>
            <span className="font-mono text-sm font-bold text-white">{formatPKR(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SalesCharts = ({ className }) => {
  const [dailyPerformance, setDailyPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('dashboard/sales-performance/', {
          params: {
            period: 'daily',
            timeframe: '30days',
          },
        });
        if (!cancelled) {
          setDailyPerformance(Array.isArray(res.data) ? res.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setDailyPerformance([]);
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
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center text-sm text-textMuted">Loading charts...</div>;
  if (!dailyPerformance || dailyPerformance.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-textMuted">No last 30 days sales data</div>;

  const compData = dailyPerformance.map((row, idx) => {
    return {
      period: row.period,
      label: formatDayLabel(row.period),
      revenue: Number(row.revenue || 0),
      previousRevenue: Number(dailyPerformance[idx - 1]?.revenue || 0),
    };
  });

  return (
    <div className={className}>
      <div className="mb-4 text-sm font-bold text-textMain tracking-tight">Sales Performance — Last 30 Days</div>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={compData} margin={{ top: 10, right: 12, left: -10, bottom: 10 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            interval={4}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
            tickMargin={10}
            height={30}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
            tickFormatter={formatCompactPKR} 
          />
          <Tooltip content={<SalesTooltip />} cursor={{ stroke: '#f1f5f9', strokeWidth: 1 }} />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            name="Revenue" 
            stroke="#4f46e5" 
            strokeWidth={2.5} 
            fill="url(#colorRevenue)" 
            activeDot={<CustomActiveDot />} 
          />
          <Line 
            type="monotone" 
            dataKey="previousRevenue" 
            name="Previous Day Revenue" 
            stroke="#cbd5e1" 
            strokeWidth={1.5} 
            strokeDasharray="4 4" 
            dot={false} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesCharts;
