import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';

const SalesCharts = ({ className }) => {
  const [monthlyPerformance, setMonthlyPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await api.get('dashboard/sales-performance/', { params: { period: 'monthly' } });
        if (!cancelled) setMonthlyPerformance(res.data || []);
      } catch (e) {
        console.warn('Failed to load sales charts data', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading charts...</div>;
  if (!monthlyPerformance || monthlyPerformance.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-textMuted">No monthly sales data</div>;

  const compData = monthlyPerformance.map((row, idx) => ({
    period: row.period,
    revenue: Number(row.revenue || 0),
    prev_revenue: Number(monthlyPerformance[idx - 1]?.revenue || 0)
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={compData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e6eef8" />
          <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
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
