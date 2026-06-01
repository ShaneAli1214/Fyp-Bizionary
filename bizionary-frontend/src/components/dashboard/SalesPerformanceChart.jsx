import React, { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPKR } from '../../utils/currency';

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
                </div>
                <div className="flex items-center gap-3 text-xs text-textMuted">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0A6ED1]" /> Quantity stacks</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Revenue</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#dc2626]" /> Profit</span>
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
                            label={{ value: 'Qty Sold', angle: -90, position: 'insideLeft', fill: 'var(--color-textMuted)' }}
                        />
                        <YAxis
                            yAxisId="money"
                            orientation="right"
                            tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : value)}
                            tick={{ fontSize: 11, fill: 'var(--color-textMain)' }}
                            label={{ value: 'PKR', angle: 90, position: 'insideRight', fill: 'var(--color-textMuted)' }}
                        />
                        <Tooltip
                            formatter={(value, name) => {
                                if (name === 'Revenue' || name === 'Profit') {
                                    return formatPKR(value);
                                }
                                return value;
                            }}
                            labelFormatter={(label) => label}
                            contentStyle={{ background: 'white', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}
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