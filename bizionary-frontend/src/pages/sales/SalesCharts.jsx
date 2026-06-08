import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
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

const SalesTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="mb-3 text-sm font-semibold text-slate-900">{label}</div>
      <div className="space-y-2">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-slate-700">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || '#0A6ED1' }} />
              <span>{item.name}</span>
            </div>
            <span className="font-semibold text-slate-900">{formatPKR(item.value)}</span>
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

  if (loading) return <div className="h-64 flex items-center justify-center">Loading charts...</div>;
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
      <div className="mb-3 text-sm font-semibold text-textMain">Sales Performance — Last 30 Days</div>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={compData} margin={{ top: 10, right: 12, left: 0, bottom: 28 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e6eef8" />
          <XAxis
            dataKey="label"
            interval={0}
            angle={-45}
            textAnchor="end"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickMargin={10}
            height={58}
            dy={10}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={formatCompactPKR} />
          <Tooltip content={<SalesTooltip />} />
          <Bar dataKey="revenue" name="Revenue" barSize={18} radius={[8,8,0,0]} fill="#0A6ED1" />
          <Line type="monotone" dataKey="previousRevenue" name="Previous Day Revenue" stroke="#7e63ff" strokeWidth={3} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesCharts;
