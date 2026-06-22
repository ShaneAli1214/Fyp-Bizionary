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
    electronics_appliances: '#A6764F',
    grocery_food_items: '#C99A4A',
    clothing_textiles: '#8A7F6E',
    pharmaceuticals_health: '#6B8E4E',
    stationery_office_supplies: '#E8E0D3',
};

const CATEGORY_GRADIENTS = {
    electronics_appliances: { start: '#A6764F', end: '#8C5F3C' },
    grocery_food_items: { start: '#C99A4A', end: '#A37B34' },
    clothing_textiles: { start: '#8A7F6E', end: '#6B5E4F' },
    pharmaceuticals_health: { start: '#6B8E4E', end: '#506B3A' },
    stationery_office_supplies: { start: '#E8E0D3', end: '#CFC5B4' },
};

const normalizeKey = (name) => name.toLowerCase();

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const moneyItems = payload.filter(item => item.name === 'Revenue' || item.name === 'Profit');
        const categoryItems = payload.filter(item => item.name !== 'Revenue' && item.name !== 'Profit');
        const totalVolume = categoryItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

        return (
            <div className="bg-surface/90 backdrop-blur-md p-4 rounded-xl border border-border shadow-xl text-xs font-sans transition-all duration-150 ease-out">
                <div className="font-bold text-text-primary border-b border-border pb-1.5 mb-2">
                    Date: {label}
                </div>
                
                {moneyItems.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Financials</div>
                        {moneyItems.map((item) => (
                            <div key={item.name} className="flex justify-between items-center gap-6">
                                <div className="flex items-center gap-1.5 text-text-secondary">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.stroke }} />
                                    <span>{item.name}</span>
                                </div>
                                <span className="font-semibold text-text-primary">
                                    {formatPKR(item.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {categoryItems.length > 0 && (
                    <div className="space-y-1.5 border-t border-border pt-2">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-1">
                            <span>Category Volume</span>
                            <span className="text-text-primary font-semibold">Total: {totalVolume}</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto pr-1 space-y-1">
                            {categoryItems.map((item) => {
                                if (Number(item.value) === 0) return null;
                                return (
                                    <div key={item.name} className="flex justify-between items-center gap-6">
                                        <div className="flex items-center gap-1.5 text-text-secondary">
                                            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color || item.fill }} />
                                            <span className="truncate max-w-[120px]">{item.name}</span>
                                        </div>
                                        <span className="font-semibold text-text-primary">
                                            {item.value} units
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const SalesPerformanceChart = ({ selectedData, isAccountant = false }) => {
    const { chartData, categories, totalSalesAmount, totalProfit, totalQuantity } = selectedData;

    const categoryKeys = useMemo(() => categories.map((category) => ({
        key: category.key || normalizeKey(category.name),
        name: category.name,
        color: category.color || CATEGORY_COLORS[category.key || normalizeKey(category.name)] || '#A6764F',
    })), [categories]);

    if (!chartData || chartData.length === 0) {
        return <div className="h-64 flex items-center justify-center text-sm text-text-secondary">No data available for the selected period.</div>;
    }

    const xAxisAngle = selectedData.xAxisType === 'day' && chartData.length > 7 ? -20 : 0;

    // Fallbacks for totals if not sent by the backend hook
    const displaySalesAmount = totalSalesAmount ?? chartData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const displayProfit = totalProfit ?? chartData.reduce((sum, d) => d.profit !== undefined ? sum + d.profit : sum, 0);
    const displayQuantity = totalQuantity ?? chartData.reduce((sum, d) => {
        return sum + categoryKeys.reduce((catSum, cat) => catSum + (Number(d[cat.key]) || 0), 0);
    }, 0);

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                        {isAccountant ? 'Revenue & Profit Trend' : 'Sales Breakdown'}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5">
                        {selectedData.periodLabel} • {selectedData.dateContext}
                    </p>
                </div>
                <p className="text-xs text-text-secondary max-w-md md:text-right">
                    {isAccountant 
                        ? 'Live revenue and profit trends in PKR for the selected timeframe.' 
                        : 'Stacked bars show category quantity. Solid and dashed lines show revenue and profit trends.'
                    }
                </p>
            </div>

            {/* Premium metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-b border-border py-3.5 mb-5">
                <div className="flex flex-col">
                    <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Total Revenue</span>
                    <span className="text-base md:text-lg font-black text-accent mt-0.5">
                        {formatPKR(displaySalesAmount)}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Total Profit</span>
                    <span className="text-base md:text-lg font-black text-success mt-0.5">
                        {formatPKR(displayProfit)}
                    </span>
                </div>
                {!isAccountant && (
                    <div className="flex flex-col col-span-2 md:col-span-1">
                        <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Total Volume Sold</span>
                        <span className="text-base md:text-lg font-black text-text-primary mt-0.5">
                            {displayQuantity.toLocaleString()} units
                        </span>
                    </div>
                )}
            </div>

            <div style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 18 }}>
                        <defs>
                            {categoryKeys.map((category) => {
                                const grad = CATEGORY_GRADIENTS[category.key] || { start: category.color, end: category.color };
                                return (
                                    <linearGradient id={`grad-${category.key}`} x1="0" y1="0" x2="0" y2="1" key={category.key}>
                                        <stop offset="0%" stopColor={grad.start} stopOpacity={1} />
                                        <stop offset="100%" stopColor={grad.end} stopOpacity={0.7} />
                                    </linearGradient>
                                );
                            })}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D3" />
                        <XAxis
                            dataKey="period"
                            tick={{ fontSize: 10, fill: '#8A7F6E' }}
                            className="text-text-secondary"
                            angle={xAxisAngle}
                            textAnchor={xAxisAngle ? 'end' : 'middle'}
                            interval={0}
                            height={selectedData.xAxisType === 'day' && chartData.length > 7 ? 56 : 30}
                        />
                        {!isAccountant && (
                            <YAxis
                                yAxisId="quantity"
                                tick={{ fontSize: 10, fill: '#8A7F6E' }}
                                className="text-text-secondary"
                                label={{ value: 'Quantity sold', angle: -90, position: 'insideLeft', fill: '#8A7F6E', offset: 10, className: 'text-text-secondary font-semibold' }}
                            />
                        )}
                        <YAxis
                            yAxisId="money"
                            orientation={isAccountant ? 'left' : 'right'}
                            tickFormatter={formatCompactPKR}
                            tick={{ fontSize: 10, fill: '#8A7F6E' }}
                            className="text-text-secondary"
                            label={{ value: 'Amount (PKR)', angle: 90, position: isAccountant ? 'outside' : 'insideRight', fill: '#8A7F6E', offset: 10, className: 'text-text-secondary font-semibold' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                                <span className="text-text-secondary font-semibold text-xs ml-1">
                                    {value}
                                </span>
                            )}
                            wrapperStyle={{
                                paddingTop: '20px'
                            }}
                        />
                        {!isAccountant && categoryKeys.map((category, index) => (
                            <Bar
                                key={category.key}
                                dataKey={category.key}
                                stackId="quantity"
                                name={category.name}
                                fill={`url(#grad-${category.key})`}
                                yAxisId="quantity"
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={true}
                                animationBegin={index * 120}
                                animationDuration={600}
                                animationEasing="ease-out"
                            />
                        ))}
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            yAxisId="money"
                            stroke="#A6764F"
                            strokeWidth={3}
                            dot={{ r: 3, strokeWidth: 1 }}
                            activeDot={{ r: 5 }}
                            isAnimationActive={true}
                            animationBegin={isAccountant ? 100 : categoryKeys.length * 120}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                        <Line
                            type="monotone"
                            dataKey="profit"
                            name="Profit"
                            yAxisId="money"
                            stroke="#6B8E4E"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={{ r: 3, strokeWidth: 1 }}
                            activeDot={{ r: 5 }}
                            isAnimationActive={true}
                            animationBegin={isAccountant ? 300 : categoryKeys.length * 120 + 200}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SalesPerformanceChart;