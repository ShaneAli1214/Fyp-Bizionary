import React, { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPKR } from '../../utils/currency';

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

const CATEGORY_COLORS = {
    electronics_appliances: '#0A6ED1',
    grocery_food_items: '#06B6D4',
    clothing_textiles: '#8B5CF6',
    construction_hardware: '#F59E0B',
    pharmaceuticals_health: '#16A34A',
    stationery_office_supplies: '#F97316',
    automobiles_accessories: '#EF4444',
};

const normalizeKey = (name) => name.toLowerCase();

const SalesPerformanceChart = ({ selectedData }) => {
    const { chartData, categories } = selectedData;

    const categoryKeys = useMemo(() => categories.map((category) => ({
        key: category.key || normalizeKey(category.name),
        name: category.name,
        color: category.color || CATEGORY_COLORS[category.key || normalizeKey(category.name)] || '#0A6ED1',
    })), [categories]);

    if (!chartData || chartData.length === 0) {
        return <div className="h-64 flex items-center justify-center text-sm text-textMuted">No data available for the selected period.</div>;
    }

    const xAxisAngle = selectedData.xAxisType === 'day' && chartData.length > 7 ? -20 : 0;

    return (
        <div className="bg-surface p-5 rounded-xl border border-surface/10 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <h4 className="font-semibold text-textMain">Sales Breakdown</h4>
                    <p className="text-xs text-textMuted">{selectedData.periodLabel} • {selectedData.dateContext}</p>
                    <p className="mt-1 text-xs text-textMuted max-w-xl">Stacked bars show total quantity sold by category. Solid and dashed lines show revenue and profit trends in PKR.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-textMuted">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0A6ED1]" /> Category quantity</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Revenue (PKR)</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#dc2626]" /> Profit (PKR)</span>
                </div>
            </div>

            <div style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                        <XAxis
                            dataKey="period"
                            tick={{ fontSize: 11, fill: 'var(--color-textMain)' }}
                            angle={xAxisAngle}
                            textAnchor={xAxisAngle ? 'end' : 'middle'}
                            interval={0}
                            height={selectedData.xAxisType === 'day' && chartData.length > 7 ? 56 : 30}
                        />
                        <YAxis
                            yAxisId="quantity"
                            tick={{ fontSize: 11, fill: 'var(--color-textMain)' }}
                            label={{ value: 'Quantity sold', angle: -90, position: 'insideLeft', fill: 'var(--color-textMuted)', offset: 10 }}
                        />
                        <YAxis
                            yAxisId="money"
                            orientation="right"
                            tickFormatter={formatCompactPKR}
                            tick={{ fontSize: 11, fill: 'var(--color-textMain)' }}
                            label={{ value: 'Amount (PKR)', angle: 90, position: 'insideRight', fill: 'var(--color-textMuted)', offset: 10 }}
                        />
                        <Tooltip
                            formatter={(value, name) => {
                                if (name === 'Revenue' || name === 'Profit') {
                                    return [formatPKR(value), `${name} (PKR)`];
                                }
                                return [value, 'Quantity'];
                            }}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{ background: 'white', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 20px rgba(15,23,42,0.08)' }}
                        />
                        <Legend />
                        {categoryKeys.map((category) => (
                            <Bar
                                key={category.key}
                                dataKey={category.key}
                                stackId="quantity"
                                name={category.name}
                                fill={category.color}
                                yAxisId="quantity"
                                radius={[4, 4, 0, 0]}
                            />
                        ))}
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            yAxisId="money"
                            stroke="#16a34a"
                            strokeWidth={3}
                            dot={{ r: 3 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="profit"
                            name="Profit"
                            yAxisId="money"
                            stroke="#dc2626"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={{ r: 3 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SalesPerformanceChart;