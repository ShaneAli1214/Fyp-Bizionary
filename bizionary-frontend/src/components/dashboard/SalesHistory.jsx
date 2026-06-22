import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatPKR } from '../../utils/currency';
import { formatDayLabel } from '../../utils/chartDates';

const SalesHistory = ({ dailyPerformance = [] }) => {
  const data = dailyPerformance.slice(-30).map((point) => {
    return {
      period: point.period,
      label: formatDayLabel(point.period),
      revenue: Number(point.revenue || 0),
    };
  });

  return (
    <div className="bg-bg-card p-5 rounded-2xl border border-border-card shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-text-primary">Last 30 Days Sales Data</h4>
        <div className="text-xs text-text-secondary">Revenue</div>
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-text-secondary">No last 30 days data available.</div>
      ) : (
        <div style={{height:220}}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 26 }}>
              <defs>
                <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-accent)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--chart-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
              <XAxis
                dataKey="label"
                interval={0}
                angle={-45}
                textAnchor="end"
                tickMargin={10}
                height={56}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              />
              <YAxis
                tickFormatter={(v) => v >= 1000 ? (v / 1000) + 'k' : v}
                tick={{ fill: 'var(--text-secondary)' }}
              />
              <Tooltip
                formatter={(v) => formatPKR(v)}
                contentStyle={{ background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-card)' }}
                cursor={{ stroke: 'var(--border-card)' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--chart-accent)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#salesAreaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
