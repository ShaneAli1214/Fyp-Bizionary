import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const COLORS = ['#0A6ED1', '#7e63ff', '#06b6d4', '#f59e0b', '#ef4444'];

const SalesByProduct = ({ recentSales = [] }) => {
  // Aggregate by product name
  const map = {};
  recentSales.forEach(s => {
    const name = s.product_name || `Product ${s.product_id || ''}`;
    map[name] = (map[name] || 0) + Number(s.quantity_sold || s.quantity || 0);
  });

  const data = Object.keys(map).map((k) => ({ name: k, value: map[k] })).sort((a,b)=>b.value-a.value).slice(0,6);

  const formatNumber = (v) => (typeof v === 'number' ? v.toLocaleString() : v);

  return (
    <div className="bg-surface p-5 rounded-xl border border-surface/10 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-textMain">Top Sold Products</h4>
        <div className="text-xs text-textMuted">Last sales</div>
      </div>

        {data.length === 0 ? (
        <div className="text-sm text-textMuted">No sales data available.</div>
      ) : (
        <div style={{height:200}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{left:10,right:10,top:5,bottom:5}}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={180} axisLine={false} tick={{fontSize:12, fill: 'var(--color-textMain)'}} />
              <Tooltip formatter={(v) => formatNumber(v)} itemStyle={{color: 'var(--color-textMain)'}} />
              <Bar dataKey="value" barSize={18} >
                {data.map((entry, idx) => (
                  <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
                <LabelList dataKey="value" position="right" formatter={(v) => formatNumber(v)} style={{ fill: 'var(--color-textMain)', fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SalesByProduct;
