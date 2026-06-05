import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import { formatPKR } from '../../utils/currency';

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US');

const RecentSalesTile = ({ periodOptions = [], selectedPeriod, onPeriodChange, selectedData }) => {
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({});

    const periodLabel = useMemo(() => {
        return selectedData.periodLabel || periodOptions.find((option) => option.key === selectedPeriod)?.label || 'Last 10 Days';
    }, [periodOptions, selectedPeriod, selectedData.periodLabel]);

    const toggleCategory = (categoryName) => {
        setExpandedCategories((current) => ({
            ...current,
            [categoryName]: !current[categoryName],
        }));
    };

    return (
        <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm relative overflow-visible z-30">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="text-xs text-textMuted">Recent Sales</div>
                    <div className="text-lg font-extrabold text-textMain mt-1">{formatPKR(selectedData.totalSalesAmount)}</div>
                    <div className="text-[11px] text-textMuted mt-1">{periodLabel}</div>
                    <div className="text-[11px] text-textMuted">{selectedData.dateContext}</div>
                </div>

                <div className="relative">
                    <label className="sr-only" htmlFor="recent-sales-period">Filter recent sales period</label>
                    <select
                        id="recent-sales-period"
                        value={selectedPeriod}
                        onChange={(event) => onPeriodChange(event.target.value)}
                        className="appearance-none rounded-full border border-surface/20 bg-background/90 px-3 py-2 pr-8 text-xs font-semibold text-textMain outline-none transition hover:bg-surface"
                    >
                        {periodOptions.map((option) => (
                            <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-background/70 p-3 border border-surface/10 overflow-hidden">
                    <div className="text-[11px] text-textMuted truncate">Quantity Sold</div>
                    <div className="mt-1 font-bold text-textMain text-base md:text-lg truncate">{formatNumber(selectedData.totalQuantity)}</div>
                </div>
                <div className="rounded-lg bg-background/70 p-3 border border-surface/10 overflow-hidden">
                    <div className="text-[11px] text-textMuted truncate">Revenue</div>
                    <div className="mt-1 font-bold text-textMain text-base md:text-lg truncate">{formatPKR(selectedData.totalSalesAmount)}</div>
                </div>
                <div className="rounded-lg bg-background/70 p-3 border border-surface/10 overflow-hidden">
                    <div className="text-[11px] text-textMuted truncate">Profit</div>
                    <div className="mt-1 font-bold text-textMain text-base md:text-lg truncate">{formatPKR(selectedData.totalProfit)}</div>
                </div>
            </div>

            <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:opacity-80"
                aria-expanded={detailsOpen}
            >
                {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {detailsOpen ? 'Hide breakdown' : 'Show breakdown'}
            </button>

            {detailsOpen && (
                <div className="mt-3 rounded-xl border border-surface/20 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-surface/10 bg-surface/40">
                        <div className="grid grid-cols-[1.2fr_0.8fr_0.9fr_0.9fr] gap-3 text-xs font-semibold text-textMain whitespace-nowrap">
                            <div>Product Category Name</div>
                            <div className="text-right">Quantity Sold</div>
                            <div className="text-right">Total Revenue</div>
                            <div className="text-right">Total Profit</div>
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto overflow-x-auto divide-y divide-surface/10">
                        {selectedData.categories.map((category) => (
                            <div key={category.name} className="px-4 py-3">
                                <button
                                    type="button"
                                    onClick={() => toggleCategory(category.name)}
                                    className="grid w-full grid-cols-[1.2fr_0.8fr_0.9fr_0.9fr_auto] gap-3 text-sm items-center text-left whitespace-nowrap"
                                >
                                    <div className="font-medium text-textMain inline-flex items-center gap-2">
                                        {expandedCategories[category.name] ? <Minus className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
                                        {category.name}
                                    </div>
                                    <div className="text-right font-semibold text-textMain">{formatNumber(category.quantitySold)}</div>
                                    <div className="text-right font-semibold text-textMain">{formatPKR(category.revenue)}</div>
                                    <div className="text-right font-semibold text-textMain">{formatPKR(category.profit)}</div>
                                    <div className="text-right text-xs text-textMuted">{category.products?.length || 0} products</div>
                                </button>

                                {expandedCategories[category.name] && (
                                    <div className="mt-3 ml-6 rounded-lg border border-surface/10 bg-surface/30 overflow-hidden">
                                        <div className="px-4 py-2 text-[11px] font-semibold text-textMuted border-b border-surface/10">
                                            Subcategories and Products
                                        </div>
                                        <div className="divide-y divide-surface/10 overflow-x-auto">
                                            {(category.subcategories || []).map((subcategory) => (
                                                <div key={subcategory.name} className="px-4 py-3">
                                                    <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr_0.9fr] gap-3 text-sm items-center whitespace-nowrap">
                                                        <div className="font-medium text-textMain">{subcategory.name}</div>
                                                        <div className="text-right font-semibold text-textMain">{formatNumber(subcategory.quantitySold)}</div>
                                                        <div className="text-right font-semibold text-textMain">{formatPKR(subcategory.revenue)}</div>
                                                        <div className="text-right font-semibold text-textMain">{formatPKR(subcategory.profit)}</div>
                                                    </div>

                                                    <div className="mt-2 ml-4 rounded-md border border-surface/10 bg-white overflow-hidden">
                                                        <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr_0.9fr] gap-3 px-3 py-2 text-[11px] font-semibold text-textMuted border-b border-surface/10 whitespace-nowrap">
                                                            <div>Product</div>
                                                            <div className="text-right">Qty</div>
                                                            <div className="text-right">Revenue</div>
                                                            <div className="text-right">Profit</div>
                                                        </div>
                                                        <div className="divide-y divide-surface/10">
                                                            {subcategory.products.map((product) => (
                                                                <div key={product.name} className="grid grid-cols-[1.4fr_0.7fr_0.9fr_0.9fr] gap-3 px-3 py-2 text-sm whitespace-nowrap">
                                                                    <div className="text-textMain">{product.name}</div>
                                                                    <div className="text-right font-semibold text-textMain">{formatNumber(product.quantitySold)}</div>
                                                                    <div className="text-right font-semibold text-textMain">{formatPKR(product.revenue)}</div>
                                                                    <div className="text-right font-semibold text-textMain">{formatPKR(product.profit)}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecentSalesTile;