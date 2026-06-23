import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Skeleton from '../../components/ui/Skeleton';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import { ArrowUpRight, AlertTriangle, CircleDollarSign, Package, Plus, Receipt, Trash2, ChevronDown } from 'lucide-react';
import OrderSlipForm from '../ordered-slips/OrderSlipForm';
import { buildIncomingQuantityMap, buildInventoryRows, normalizeProductRecord, toNumber } from '../../utils/productInventoryTransforms';
import { getCategoryPrefix } from '../../utils/productCategories';

const InventoryManagment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [orderedSlips, setOrderedSlips] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [selectedOrderSlip, setSelectedOrderSlip] = useState(null);
    const [formMode, setFormMode] = useState('existing');
    const [stockThreshold, setStockThreshold] = useState(5);
    const [lowStockOpen, setLowStockOpen] = useState(false);
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
            const [productsRes, slipsRes] = await Promise.allSettled([
                api.get('products/'),
                api.get('purchases/ordered-slips/'),
            ]);

            setProducts(productsRes.status === 'fulfilled' ? extractList(productsRes.value.data).map((item) => normalizeProductRecord(item)) : []);
            setOrderedSlips(slipsRes.status === 'fulfilled' ? extractList(slipsRes.value.data) : []);
        } catch (error) {
            console.warn('Failed to fetch inventory data.', error);
            setProducts([]);
            setOrderedSlips([]);
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



    useEffect(() => {
        fetchInventoryData();
    }, []);

    useEffect(() => {
        const refreshInventory = () => {
            console.log('Inventory refresh triggered by event');
            fetchInventoryData();
        };

        window.addEventListener('saleCreated', refreshInventory);
        window.addEventListener('orderedSlipUpdated', refreshInventory);
        window.addEventListener('inventoryRefreshRequested', refreshInventory);
        // New listeners for company and category creation
        window.addEventListener('companyCreated', refreshInventory);
        window.addEventListener('categoryCreated', refreshInventory);

        return () => {
            window.removeEventListener('saleCreated', refreshInventory);
            window.removeEventListener('orderedSlipUpdated', refreshInventory);
            window.removeEventListener('inventoryRefreshRequested', refreshInventory);
            window.removeEventListener('companyCreated', refreshInventory);
            window.removeEventListener('categoryCreated', refreshInventory);
        };
    }, []);

    const incomingMap = useMemo(() => buildIncomingQuantityMap(orderedSlips), [orderedSlips]);
    const inventoryRows = useMemo(() => buildInventoryRows(products, {}, incomingMap), [products, incomingMap]);

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
            const incomingQty = toNumber(item.incoming_qty);

            summary.totalProducts += 1;
            summary.totalStockValue += toNumber(item.total_value);
            // outOfStock metric removed per request
            summary.incomingStock += incomingQty;
            return summary;
        }, {
            totalProducts: 0,
            totalStockValue: 0,
            
            incomingStock: 0,
        });
    }, [inventoryRows]);

    const metricCards = [
        { title: 'Total Products', value: dashboardMetrics.totalProducts, icon: Package, tone: 'bg-page text-primary border-card' },
        { title: 'Total Stock Value', value: formatPKR(dashboardMetrics.totalStockValue), icon: CircleDollarSign, tone: 'bg-status-success/10 text-status-success border-emerald-100' },
        { title: 'Low Stock Items', value: lowStockRows.length, icon: AlertTriangle, tone: 'bg-amber-50 text-status-info border-amber-100', interactive: true },
        { title: 'Incoming Stock', value: dashboardMetrics.incomingStock, icon: ArrowUpRight, tone: 'bg-sky-50 text-sky-700 border-sky-100' },
    ];

    if (loading) {
        return (
            <div className="space-y-6 p-1">
                <Skeleton.KPICard />
                <div className="bg-surface rounded-2xl border border-card shadow-sm p-6">
                    <Skeleton.TableRows count={8} cols={5} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <PageHeader
                        title="Stock Management"
                        subtitle="Operational view for stock availability and incoming supply."
                    />

                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => {
                                setFormMode('existing');
                                setIsFormOpen(true);
                            }}
                            className="inline-flex items-center justify-center px-5 py-2 bg-primary text-card rounded-full text-sm font-bold transition-all hover:opacity-85 active:scale-[0.98] shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Order Products
                        </button>
                        <button
                            onClick={() => {
                                setFormMode('custom');
                                setIsFormOpen(true);
                            }}
                            className="inline-flex items-center justify-center px-5 py-2 bg-card text-primary rounded-full text-sm font-bold transition-all hover:bg-active-pill/30 border border-card shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Quick Add / Custom Order
                        </button>
                        <button
                            onClick={() => navigate('/ordered-slips')}
                            className="inline-flex items-center justify-center px-5 py-2 bg-card text-primary rounded-full text-sm font-bold transition-all hover:bg-active-pill/30 border border-card shadow-sm"
                        >
                            <Receipt className="h-4 w-4 mr-2" />
                            Ordered Slips
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metricCards.map((card) => {
                        const Icon = card.icon;
                        if (card.interactive) {
                            return (
                                <div key={card.title} className={`rounded-2xl border bg-card p-4 shadow-sm ${card.tone} xl:col-span-2`}>
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
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface/20 bg-card/80 text-textMuted transition hover:bg-surface hover:text-textMain"
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
                                                    className="w-20 rounded-md border border-transparent bg-card px-2 py-1 text-sm font-semibold text-textMain text-center outline-none transition hover:border-card focus:border-primary focus:bg-card"
                                                />
                                            </div>
                                        </div>
                                        <div className="text-xs text-textMuted lg:text-right">
                                            {lowStockRows.length} matching item{lowStockRows.length === 1 ? '' : 's'}
                                        </div>
                                    </div>

                                    {lowStockOpen && (
                                        <div className="mt-4 rounded-2xl border border-surface/20 bg-card shadow-lg overflow-hidden">
                                            <div className="px-4 py-3 border-b border-surface/10 bg-card">
                                                <div className="grid grid-cols-[minmax(180px,220px)_1fr_auto] gap-4 items-center text-sm font-semibold text-textMain">
                                                    <div>Category</div>
                                                    <div>Product Name</div>
                                                    <div className="text-right">Quantity</div>
                                                </div>
                                            </div>

                                            <div className="max-h-80 overflow-y-auto bg-card">
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
                                                                    <div className="border-t border-surface/10 bg-card">
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
                                                                                <div className="shrink-0 text-right font-semibold text-status-info">
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
                            <div key={card.title} className={`rounded-2xl border bg-card p-4 shadow-sm ${card.tone}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-textMuted">{card.title}</p>
                                        <p className="mt-2 text-2xl font-extrabold text-textMain">{card.value}</p>
                                    </div>
                                    <div className="rounded-2xl border p-2.5 bg-card/70">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {formSuccess && (
                <div className="px-4 py-3 rounded-xl border border-emerald-100 bg-status-success/10 text-status-success text-sm font-medium">
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
                <div className="px-4 py-3 rounded-xl border border-rose-100 bg-status-info/10 text-status-info text-sm font-medium">
                    {formError}
                </div>
            )}

            {/* Inventory Stock Table removed */}

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
