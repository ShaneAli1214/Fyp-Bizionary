import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import { ArrowDownRight, ArrowUpRight, AlertTriangle, CircleDollarSign, Package, Plus, Receipt, Trash2, ChevronDown } from 'lucide-react';
import OrderSlipForm from '../ordered-slips/OrderSlipForm';
import { buildIncomingQuantityMap, buildInventoryRows, buildReservedQuantityMap, normalizeProductRecord, toNumber } from '../../utils/productInventoryTransforms';
import { getCategoryPrefix } from '../../utils/productCategories';

const InventoryManagment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [orderedSlips, setOrderedSlips] = useState([]);
    const [registeredCompanies, setRegisteredCompanies] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [selectedOrderSlip, setSelectedOrderSlip] = useState(null);
    const [formMode, setFormMode] = useState('existing');
    const [stockThreshold, setStockThreshold] = useState(5);
    const [lowStockOpen, setLowStockOpen] = useState(false);
    const [outOfStockOpen, setOutOfStockOpen] = useState(false);
    const [openLowStockCategory, setOpenLowStockCategory] = useState('');

    const extractList = (payload) => payload?.results || payload?.data || payload || [];

    const formatApiError = (error, fallbackMessage) => {
        const payload = error?.response?.data;
        if (!payload) {
            return fallbackMessage;
        }

        if (typeof payload === 'string') {
            return payload;
        }

        if (Array.isArray(payload)) {
            return payload.join(', ');
        }

        if (payload.detail) {
            return payload.detail;
        }

        const firstField = Object.keys(payload)[0];
        if (firstField && Array.isArray(payload[firstField])) {
            return `${firstField}: ${payload[firstField].join(', ')}`;
        }

        return fallbackMessage;
    };

    const fetchInventoryData = async () => {
        setLoading(true);
        try {
            const [productsRes, salesRes, slipsRes, companiesRes] = await Promise.allSettled([
                api.get('products/'),
                api.get('sales/'),
                api.get('purchases/ordered-slips/'),
                api.get('purchases/companies/'),
            ]);

            setProducts(productsRes.status === 'fulfilled' ? extractList(productsRes.value.data).map((item) => normalizeProductRecord(item)) : []);
            setSales(salesRes.status === 'fulfilled' ? extractList(salesRes.value.data) : []);
            setOrderedSlips(slipsRes.status === 'fulfilled' ? extractList(slipsRes.value.data) : []);
            setRegisteredCompanies(companiesRes.status === 'fulfilled' ? extractList(companiesRes.value.data) : []);
        } catch (error) {
            console.warn('Failed to fetch inventory data.', error);
            setProducts([]);
            setSales([]);
            setOrderedSlips([]);
            setRegisteredCompanies([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrderSlip = async (orderSlipData) => {
        setSubmitting(true);
        setFormError('');
        setFormSuccess('');

        try {
            let response = null;

            if (orderSlipData?.mode === 'custom' && orderSlipData.custom_product) {
                const customProduct = orderSlipData.custom_product;
                const resolvedCategory = customProduct.category || 'Tech';
                const prefix = getCategoryPrefix(resolvedCategory) || 'CU';
                const cleanName = String(customProduct.product_name || 'CUSTOM PRODUCT').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase();
                const productCode = `${prefix}-${cleanName.slice(0, 16) || 'ITEM'}-${Date.now().toString().slice(-6)}`;

                if (customProduct.company_mode === 'create' || customProduct.company_contact_number) {
                    await api.post('purchases/companies/', {
                        name: customProduct.company_name,
                        category: resolvedCategory,
                        contact_number: customProduct.company_contact_number || '',
                    });
                }

                const productPayload = {
                    product_code: productCode,
                    name: customProduct.product_name,
                    category: resolvedCategory,
                    brand: customProduct.brand || '',
                    unit: customProduct.unit || 'Piece',
                    cost_price: Number(customProduct.cost_price || 0),
                    unit_price: Number(customProduct.cost_price || 0),
                    sale_price: Number(customProduct.salePrice || customProduct.sale_price || 0),
                    stock_quantity: 0,
                    min_stock: Number(orderSlipData.quantity_ordered || 1),
                    status: 'ACTIVE',
                };

                const createdProduct = await api.post('products/', productPayload);
                const slipPayload = {
                    product: createdProduct.data.id,
                    company_name: orderSlipData.company_name,
                    company_email: customProduct.company_email || '',
                    quantity_ordered: Number(orderSlipData.quantity_ordered || 0),
                    unit_cost: Number(orderSlipData.unit_cost || customProduct.cost_price || 0),
                    notes: orderSlipData.notes || customProduct.notes || '',
                    status: 'PENDING',
                };

                response = await api.post('purchases/ordered-slips/', slipPayload);
            } else {
                const payload = {
                    ...orderSlipData,
                    status: 'PENDING',
                };

                response = await api.post('purchases/ordered-slips/', payload);
            }

            setSelectedOrderSlip(response.data);
            setFormSuccess('Order slip generated and email sent.');
            setIsFormOpen(false);
            await fetchInventoryData();
            window.dispatchEvent(new CustomEvent('orderedSlipUpdated', { detail: { action: 'created', timestamp: Date.now() } }));
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to generate order slip.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCompany = async (companyId) => {
        const confirmed = window.confirm('Delete this company? This will remove it from the dropdown lists.');
        if (!confirmed) {
            return;
        }

        try {
            setFormError('');
            await api.delete(`purchases/companies/${companyId}/`);
            await fetchInventoryData();
            setFormSuccess('Company deleted successfully.');
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to delete company.'));
        }
    };

    useEffect(() => {
        fetchInventoryData();
    }, []);

    useEffect(() => {
        const refreshInventory = () => {
            fetchInventoryData();
        };

        window.addEventListener('saleCreated', refreshInventory);
        window.addEventListener('orderedSlipUpdated', refreshInventory);
        window.addEventListener('inventoryRefreshRequested', refreshInventory);

        return () => {
            window.removeEventListener('saleCreated', refreshInventory);
            window.removeEventListener('orderedSlipUpdated', refreshInventory);
            window.removeEventListener('inventoryRefreshRequested', refreshInventory);
        };
    }, []);

    const reservedMap = useMemo(() => buildReservedQuantityMap(sales), [sales]);
    const incomingMap = useMemo(() => buildIncomingQuantityMap(orderedSlips), [orderedSlips]);
    const inventoryRows = useMemo(() => buildInventoryRows(products, reservedMap, incomingMap), [products, reservedMap, incomingMap]);

    const lowStockRows = useMemo(() => inventoryRows
        .filter((item) => Number(item?.available_qty || 0) <= Number(stockThreshold || 0)), [inventoryRows, stockThreshold]);

    const lowStockItems = useMemo(() => lowStockRows
        .map((item) => ({
            id: item.id,
            category: item.category,
            product_name: item.name || item.product_name || 'Unnamed product',
            quantity: Number(item.available_qty || item.stock_quantity || 0),
        }))
        .filter((item) => item.category)
        .sort((a, b) => a.category.localeCompare(b.category) || a.product_name.localeCompare(b.product_name)), [lowStockRows]);

    const outOfStockRows = useMemo(() => inventoryRows
        .filter((item) => Number(item?.available_qty || 0) === 0)
        .map((item) => ({
            id: item.id,
            sku: item.sku || item.product_code || '',
            product_name: item.name || item.product_name || 'Unnamed product',
        }))
        .sort((a, b) => a.sku.localeCompare(b.sku) || a.product_name.localeCompare(b.product_name)), [inventoryRows]);

    const lowStockGroups = useMemo(() => lowStockItems.reduce((accumulator, item) => {
        const categoryKey = item.category || 'Uncategorized';
        if (!accumulator[categoryKey]) {
            accumulator[categoryKey] = [];
        }
        accumulator[categoryKey].push(item);
        return accumulator;
    }, {}), [lowStockItems]);
    const lowStockCategoryKeys = Object.keys(lowStockGroups);

    const dashboardMetrics = useMemo(() => {
        return inventoryRows.reduce((summary, item) => {
            const availableQty = toNumber(item.available_qty);
            const reservedQty = toNumber(item.reserved_qty);
            const incomingQty = toNumber(item.incoming_qty);
            const damagedQty = toNumber(item.damaged_quantity);

            summary.totalProducts += 1;
            summary.totalStockValue += toNumber(item.total_value);
            summary.outOfStock += availableQty <= 0 ? 1 : 0;
            summary.incomingStock += incomingQty;
            summary.reservedStock += reservedQty;
            summary.damagedItems += damagedQty;
            return summary;
        }, {
            totalProducts: 0,
            totalStockValue: 0,
            outOfStock: 0,
            incomingStock: 0,
            reservedStock: 0,
            damagedItems: 0,
        });
    }, [inventoryRows]);

    const metricCards = [
        { title: 'Total Products', value: dashboardMetrics.totalProducts, icon: Package, tone: 'bg-slate-50 text-slate-700 border-slate-200' },
        { title: 'Total Stock Value', value: formatPKR(dashboardMetrics.totalStockValue), icon: CircleDollarSign, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        { title: 'Low Stock Items', value: lowStockRows.length, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700 border-amber-100', interactive: true },
        { title: 'Out of Stock', value: outOfStockRows.length, icon: ArrowDownRight, tone: 'bg-rose-50 text-rose-700 border-rose-100', interactive: true },
        { title: 'Incoming Stock', value: dashboardMetrics.incomingStock, icon: ArrowUpRight, tone: 'bg-sky-50 text-sky-700 border-sky-100' },
        { title: 'Reserved Stock', value: dashboardMetrics.reservedStock, icon: Package, tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        { title: 'Damaged Items', value: dashboardMetrics.damagedItems, icon: Trash2, tone: 'bg-slate-50 text-slate-700 border-slate-200' },
    ];

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-textMain dark:text-slate-100">Inventory Managment</h1>
                        <p className="text-textMuted dark:text-slate-300 text-sm mt-1">Operational view for stock availability, reservations, and incoming supply.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => {
                                setFormMode('existing');
                                setIsFormOpen(true);
                            }}
                            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primaryDark text-sm font-bold transition-all shadow-md shadow-primary/20"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Order Products
                        </button>
                        <button
                            onClick={() => {
                                setFormMode('custom');
                                setIsFormOpen(true);
                            }}
                            className="inline-flex items-center justify-center px-4 py-2 bg-white text-primary rounded-xl hover:bg-primary/5 text-sm font-bold transition-all border border-primary/20 shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Quick Add / Custom Order
                        </button>
                        <button
                            onClick={() => navigate('/ordered-slips')}
                            className="inline-flex items-center justify-center px-4 py-2 bg-white text-textMain rounded-xl hover:bg-slate-50 text-sm font-bold transition-all border border-gray-200 shadow-sm"
                        >
                            <Receipt className="h-4 w-4 mr-2" />
                            Ordered Slips
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metricCards.map((card) => {
                        const Icon = card.icon;
                        if (card.title === 'Out of Stock') {
                            return (
                                <div key={card.title} className={`rounded-2xl border bg-white p-4 shadow-sm ${card.tone} xl:col-span-2`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-textMuted">{card.title}</p>
                                            <p className="mt-2 text-2xl font-extrabold text-textMain">{card.value}</p>
                                        </div>
                                        <button
                                            type="button"
                                            aria-expanded={outOfStockOpen}
                                            aria-label="Toggle out of stock items list"
                                            onClick={() => setOutOfStockOpen((open) => !open)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface/20 bg-white/80 text-textMuted transition hover:bg-surface hover:text-textMain"
                                        >
                                            <ChevronDown className={`h-4 w-4 transition-transform ${outOfStockOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>

                                    <div className="mt-4 text-xs text-textMuted">
                                        Products with Available QTY equal to 0.
                                    </div>

                                    {outOfStockOpen && (
                                        <div className="mt-4 rounded-xl border border-surface/20 bg-white shadow-lg overflow-hidden">
                                            <div className="px-4 py-3 border-b border-surface/10 bg-white">
                                                <div className="grid grid-cols-[minmax(140px,180px)_1fr] gap-4 items-center text-sm font-semibold text-textMain">
                                                    <div>SKU</div>
                                                    <div>Product Name</div>
                                                </div>
                                            </div>

                                            <div className="max-h-56 overflow-y-auto bg-white divide-y divide-surface/10">
                                                {outOfStockRows.length > 0 ? (
                                                    outOfStockRows.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="grid grid-cols-[minmax(140px,180px)_1fr] gap-4 items-center px-4 py-3 text-sm hover:bg-surface/40"
                                                        >
                                                            <div className="min-w-0 text-textMuted font-mono text-xs whitespace-normal break-words">
                                                                {item.sku}
                                                            </div>
                                                            <div className="min-w-0 text-textMain font-medium whitespace-normal break-words">
                                                                {item.product_name}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-4 text-sm text-textMuted">No products are currently out of stock.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        if (card.interactive) {
                            return (
                                <div key={card.title} className={`rounded-2xl border bg-white p-4 shadow-sm ${card.tone} xl:col-span-2`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-textMuted">{card.title}</p>
                                            <p className="mt-2 text-2xl font-extrabold text-textMain">{card.value}</p>
                                        </div>
                                        <button
                                            type="button"
                                            aria-expanded={lowStockOpen}
                                            aria-label="Toggle low stock items list"
                                            onClick={() => setLowStockOpen((open) => {
                                                const next = !open;
                                                if (!next) {
                                                    setOpenLowStockCategory('');
                                                }
                                                return next;
                                            })}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface/20 bg-white/80 text-textMuted transition hover:bg-surface hover:text-textMain"
                                        >
                                            <ChevronDown className={`h-4 w-4 transition-transform ${lowStockOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                        <div>
                                            <div className="text-xs text-textMuted">Rule</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-textMain">
                                                <span>Stock quantity ≤</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={stockThreshold}
                                                    onChange={(event) => setStockThreshold(Math.max(0, Number(event.target.value || 0)))}
                                                    className="w-20 rounded-md border border-transparent bg-white px-2 py-1 text-sm font-semibold text-textMain text-center outline-none transition hover:border-slate-300 focus:border-primary focus:bg-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="text-xs text-textMuted lg:text-right">
                                            {lowStockRows.length} matching item{lowStockRows.length === 1 ? '' : 's'}
                                        </div>
                                    </div>

                                    {lowStockOpen && (
                                        <div className="mt-4 rounded-xl border border-surface/20 bg-white shadow-lg overflow-hidden">
                                            <div className="px-4 py-3 border-b border-surface/10 bg-white">
                                                <div className="grid grid-cols-[minmax(180px,220px)_1fr_auto] gap-4 items-center text-sm font-semibold text-textMain">
                                                    <div>Category</div>
                                                    <div>Product Name</div>
                                                    <div className="text-right">Quantity</div>
                                                </div>
                                            </div>

                                            <div className="max-h-80 overflow-y-auto bg-white">
                                                {lowStockCategoryKeys.length > 0 ? (
                                                    lowStockCategoryKeys.map((categoryKey) => {
                                                        const categoryLabel = categoryKey;
                                                        const categoryItems = lowStockGroups[categoryKey] || [];
                                                        const isOpen = openLowStockCategory === categoryKey;

                                                        return (
                                                            <div key={categoryKey} className="border-b border-surface/10 last:border-b-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setOpenLowStockCategory((current) => (current === categoryKey ? '' : categoryKey))}
                                                                    className="w-full px-4 py-3 text-left hover:bg-surface/60 transition grid grid-cols-[1fr_auto] items-center gap-4"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-semibold text-textMain break-words">{categoryLabel}</div>
                                                                        <div className="text-xs text-textMuted mt-0.5">{categoryItems.length} low-stock item{categoryItems.length === 1 ? '' : 's'}</div>
                                                                    </div>
                                                                    <ChevronDown className={`h-4 w-4 shrink-0 text-textMuted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                                </button>

                                                                {isOpen && (
                                                                    <div className="border-t border-surface/10 bg-white">
                                                                        {categoryItems.map((item) => (
                                                                            <div
                                                                                key={item.id}
                                                                                className="grid grid-cols-[minmax(180px,220px)_1fr_auto] gap-4 items-center px-4 py-3 text-sm hover:bg-surface/40"
                                                                            >
                                                                                <div className="min-w-0 text-textMuted whitespace-normal break-words">
                                                                                    {categoryLabel}
                                                                                </div>
                                                                                <div className="min-w-0 text-textMain font-medium whitespace-normal break-words">
                                                                                    {item.product_name}
                                                                                </div>
                                                                                <div className="shrink-0 text-right font-semibold text-rose-700">
                                                                                    {item.quantity} in stock
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="px-4 py-4 text-sm text-textMuted">No items are at or below the low-stock threshold.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div key={card.title} className={`rounded-2xl border bg-white p-4 shadow-sm ${card.tone}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-textMuted">{card.title}</p>
                                        <p className="mt-2 text-2xl font-extrabold text-textMain">{card.value}</p>
                                    </div>
                                    <div className="rounded-xl border p-2.5 bg-white/70">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {formSuccess && (
                <div className="px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 text-sm font-medium">
                    {formSuccess}
                    {selectedOrderSlip?.id ? (
                        <button
                            type="button"
                            onClick={() => navigate('/ordered-slips')}
                            className="ml-3 underline font-bold"
                        >
                            View slip
                        </button>
                    ) : null}
                </div>
            )}
            {formError && (
                <div className="px-4 py-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 text-sm font-medium">
                    {formError}
                </div>
            )}

            <div className="space-y-5">
                <div className="px-1">
                    <h2 className="text-lg font-bold text-textMain">Inventory Stock Table</h2>
                    <p className="text-xs text-textMuted mt-1">Focused on available stock, committed stock, incoming stock, and valuation.</p>
                </div>

                {inventoryRows.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-8 text-center text-textMuted text-sm">
                        No stock records found.
                    </div>
                ) : lowStockRows.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-8 text-center text-textMuted text-sm">
                        No items match the selected low-stock threshold.
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-textMain">Operational Inventory</h3>
                                <p className="text-[11px] text-textMuted mt-0.5">Showing items at or below the selected low-stock threshold.</p>
                            </div>
                            <div className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                                {lowStockRows.length} items
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">SKU</th>
                                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Product Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Warehouse / Location</th>
                                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Available QTY</th>
                                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Reserved QTY</th>
                                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Incoming QTY</th>
                                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Cost Price</th>
                                        <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Total Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {lowStockRows.map((item) => {
                                        const availableQty = toNumber(item.available_qty);
                                        const reservedQty = toNumber(item.reserved_qty);
                                        const incomingQty = toNumber(item.incoming_qty);
                                        const lowStock = availableQty <= Number(stockThreshold || 0);

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-textMuted font-mono text-xs">{item.sku || item.product_code}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded bg-slate-100 flex flex-shrink-0 items-center justify-center text-slate-400">
                                                            <Package className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-textMain truncate">{item.name}</p>
                                                            <p className="text-[10px] text-textMuted font-bold uppercase mt-0.5">{item.category || 'Uncategorized'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-textMuted">{item.warehouse}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${lowStock ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                        {availableQty}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-textMuted">{reservedQty}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-textMuted">{incomingQty}</td>
                                                <td className="px-6 py-4 text-right text-sm text-gray-600 font-medium">{formatPKR(item.cost_price)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-bold text-emerald-700">{formatPKR(item.total_value)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-textMain">Registered Companies</h2>
                        <p className="text-xs text-textMuted mt-1">Delete saved company records from the dropdown source.</p>
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {registeredCompanies.length === 0 && (
                        <div className="px-6 py-8 text-center text-textMuted text-sm">No saved companies found.</div>
                    )}

                    {registeredCompanies.map((company) => (
                        <div key={company.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                            <div>
                                <p className="text-sm font-bold text-textMain">{company.name}</p>
                                <p className="text-xs text-textMuted mt-0.5">{company.categoryId || company.category || 'Uncategorized'}</p>
                            </div>
                            <button
                                onClick={() => handleDeleteCompany(company.id)}
                                className="inline-flex items-center px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <OrderSlipForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreateOrderSlip}
                onCompanySaved={fetchInventoryData}
                submitting={submitting}
                errorMessage={formError}
                initialMode={formMode}
            />
        </div>
    );
};

export default InventoryManagment;
