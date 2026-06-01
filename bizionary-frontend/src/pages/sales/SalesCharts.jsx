import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';
import { formatDayLabel } from '../../utils/chartDates';

const SALES_START_DATE = '2026-01-01';
const SALES_END_DATE = '2026-01-30';

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
            start_date: SALES_START_DATE,
            end_date: SALES_END_DATE,
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
      prev_revenue: Number(dailyPerformance[idx - 1]?.revenue || 0)
    };
  });

  return (
    <div className={className}>
      <div className="mb-3 text-sm font-semibold text-textMain">Last 30 Days Sales Data</div>
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
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `Rs ${v / 1000}k`} />
          <Tooltip formatter={(val) => formatPKR(val)} />
          <Bar dataKey="revenue" barSize={18} radius={[8,8,0,0]} fill="#0A6ED1" />
          <Line type="monotone" dataKey="prev_revenue" stroke="#7e63ff" strokeWidth={3} dot={false} />
          <Area type="monotone" dataKey="prev_revenue" strokeWidth={0} fill="rgba(126,99,255,0.12)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesCharts;
