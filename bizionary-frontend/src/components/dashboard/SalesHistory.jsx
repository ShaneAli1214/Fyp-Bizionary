import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatPKR } from '../../utils/currency';

const SalesHistory = ({ monthlyPerformance = [] }) => {
  const data = monthlyPerformance.slice(-12).map(m => ({ period: m.period, revenue: Number(m.revenue || 0) }));

  return (
    <div className="bg-surface p-5 rounded-xl border border-surface/10 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-textMain">Sales History (12 months)</h4>
        <div className="text-xs text-textMuted">Revenue</div>
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-textMuted">No monthly data available.</div>
      ) : (
        <div style={{height:220}}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="period" tick={{fontSize:12, fill: 'var(--color-textMain)'}} />
              <YAxis tickFormatter={(v)=>v>=1000? (v/1000)+'k' : v} tick={{fill: 'var(--color-textMain)'}} />
              <Tooltip formatter={(v)=>formatPKR(v)} contentStyle={{ background: 'white', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }} cursor={{ stroke: 'rgba(10,110,209,0.08)' }} />
              <Area type="monotone" dataKey="revenue" stroke="#0A6ED1" strokeWidth={2} fillOpacity={0.18} fill="#0A6ED1" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
