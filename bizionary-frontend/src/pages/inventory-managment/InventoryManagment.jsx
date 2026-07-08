import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Skeleton from '../../components/ui/Skeleton';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import { Dialog } from '@headlessui/react';
import { ArrowUpRight, AlertTriangle, CircleDollarSign, Package, Plus, Receipt, Trash2, ChevronDown, ArrowRight, X } from 'lucide-react';
import OrderSlipForm from '../ordered-slips/OrderSlipForm';
import { buildIncomingQuantityMap, buildInventoryRows, normalizeProductRecord, toNumber } from '../../utils/productInventoryTransforms';
import { getCategoryPrefix } from '../../utils/productCategories';

const InventoryManagment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [orderedSlips, setOrderedSlips] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isWarehouseBreakdownOpen, setIsWarehouseBreakdownOpen] = useState(false);
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
                    const savedCompany = await api.post('purchases/companies/', {
                        name: customProduct.company_name,
                        category: resolvedCategory,
                        contact_number: customProduct.company_contact_number || '',
                    });
                    // Notify useCategories hook to invalidate cache and refetch
                    window.dispatchEvent(new CustomEvent('companyCreated', { detail: savedCompany.data }));
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
            const shopStock = toNumber(item.shop_stock);
            const warehouseStock = toNumber(item.warehouse_stock);
            const costPrice = toNumber(item.cost_price);

            summary.totalProducts += 1;
            summary.totalShopStockValue += shopStock * costPrice;
            summary.totalWarehouseStockValue += warehouseStock * costPrice;
            summary.totalStockValue += (shopStock + warehouseStock) * costPrice;
            // outOfStock metric removed per request
            summary.incomingStock += incomingQty;
            return summary;
        }, {
            totalProducts: 0,
            totalStockValue: 0,
            totalShopStockValue: 0,
            totalWarehouseStockValue: 0,
            incomingStock: 0,
        });
    }, [inventoryRows]);

    const metricCards = [
        { title: 'Total Products', value: dashboardMetrics.totalProducts, icon: Package, sub: 'Catalog items', iconBg: 'bg-accent/10 text-accent' },
        { title: 'Total Stock Value', value: formatPKR(dashboardMetrics.totalStockValue), icon: CircleDollarSign, sub: 'Total capital value', iconBg: 'bg-status-success/15 text-status-success' },
        { title: 'Total Shop Stock Value', value: formatPKR(dashboardMetrics.totalShopStockValue), icon: CircleDollarSign, sub: 'Value at retail outlet', iconBg: 'bg-purple-500/15 text-purple-400' },
        { title: 'Total Warehouse Stock Value', value: formatPKR(dashboardMetrics.totalWarehouseStockValue), icon: CircleDollarSign, interactive: 'warehouse', sub: 'Warehouse storage value', iconBg: 'bg-blue-500/15 text-blue-400' },
        { title: 'Low Stock Items', value: lowStockRows.length, icon: AlertTriangle, interactive: 'low-stock', colSpan: 'xl:col-span-2', iconBg: 'bg-amber-500/15 text-amber-400' },
        { title: 'Incoming Stock', value: dashboardMetrics.incomingStock, icon: ArrowUpRight, colSpan: 'xl:col-span-2', sub: 'Pending deliveries', iconBg: 'bg-sky-500/15 text-sky-400' },
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
                            onClick={() => navigate('/ordered-slips')}
                            className="inline-flex items-center justify-center px-5 py-2 bg-card text-primary rounded-full text-sm font-bold transition-all hover:bg-active-pill/30 border border-card shadow-sm cursor-pointer"
                        >
                            <Receipt className="h-4 w-4 mr-2 text-accent" />
                            Ordered Slips
                        </button>
                        <button
                            onClick={() => {
                                setFormMode('custom');
                                setIsFormOpen(true);
                            }}
                            className="inline-flex items-center justify-center px-5 py-2 bg-card text-primary rounded-full text-sm font-bold transition-all hover:bg-active-pill/30 border border-card shadow-sm cursor-pointer"
                        >
                            <Plus className="h-4 w-4 mr-2 text-accent" />
                            Quick Add / Custom Order
                        </button>
                        <button
                            onClick={() => {
                                setFormMode('existing');
                                setIsFormOpen(true);
                            }}
                            className="inline-flex items-center justify-center px-5 py-2 bg-primary text-card rounded-full text-sm font-bold transition-all hover:opacity-85 active:scale-[0.98] shadow-sm cursor-pointer"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Order Products
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metricCards.map((card) => {
                        const Icon = card.icon;
                        if (card.interactive === 'low-stock') {
                            return (
                                <div key={card.title} className="bg-surface border border-border p-4.5 rounded-xl shadow-sm xl:col-span-2 flex flex-col justify-between min-h-[132px]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{card.title}</p>
                                            <p className="mt-2 text-2xl font-extrabold text-text-primary tracking-tight">{card.value}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
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
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-text-secondary hover:bg-page hover:text-text-primary transition cursor-pointer"
                                            >
                                                <ChevronDown className={`h-4 w-4 transition-transform ${lowStockOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            <div className={`p-1.5 rounded-xl ${card.iconBg || 'bg-accent/10 text-accent'}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between border-t border-border/40 pt-3">
                                        <div>
                                            <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Rule</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-text-primary">
                                                <span>Stock quantity ≤</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={stockThreshold}
                                                    onChange={(event) => setStockThreshold(Math.max(0, Number(event.target.value || 0)))}
                                                    className="w-16 rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-bold text-text-primary text-center outline-none transition hover:border-accent/40 focus:border-accent"
                                                />
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-text-secondary font-semibold uppercase">
                                            {lowStockRows.length} matching item{lowStockRows.length === 1 ? '' : 's'}
                                        </div>
                                    </div>

                                    {lowStockOpen && (
                                        <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 shadow-lg overflow-hidden">
                                            <div className="px-4 py-3 border-b border-border bg-background">
                                                <div className="grid grid-cols-[minmax(180px,220px)_1fr_auto] gap-4 items-center text-xs font-bold text-text-secondary uppercase">
                                                    <div>Category</div>
                                                    <div>Product Name</div>
                                                    <div className="text-right">Quantity</div>
                                                </div>
                                            </div>

                                            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                                                {lowStockCategoryKeys.length > 0 ? (
                                                    lowStockCategoryKeys.map((categoryKey) => {
                                                        const categoryLabel = categoryKey;
                                                        const categoryItems = lowStockGroups[categoryKey] || [];
                                                        const isOpen = openLowStockCategory === categoryKey;

                                                        return (
                                                            <div key={categoryKey} className="border-b border-border last:border-b-0">
                                                                 <button
                                                                    type="button"
                                                                    onClick={() => setOpenLowStockCategory((current) => (current === categoryKey ? '' : categoryKey))}
                                                                    className="w-full px-4 py-3 text-left hover:bg-page/40 transition grid grid-cols-[1fr_auto] items-center gap-4"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-bold text-text-primary break-words">{categoryLabel}</div>
                                                                        <div className="text-xs text-text-secondary mt-0.5">{categoryItems.length} low-stock item{categoryItems.length === 1 ? '' : 's'}</div>
                                                                    </div>
                                                                    <ChevronDown className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                                </button>

                                                                {isOpen && (
                                                                    <div className="border-t border-border bg-background divide-y divide-border/40">
                                                                        {categoryItems.map((item) => (
                                                                            <div
                                                                                key={item.id}
                                                                                className="grid grid-cols-[minmax(180px,220px)_1fr_auto] gap-4 items-center px-4 py-2.5 text-xs hover:bg-page/40"
                                                                            >
                                                                                <div className="min-w-0 text-text-secondary whitespace-normal break-words">
                                                                                    {categoryLabel}
                                                                                </div>
                                                                                <div className="min-w-0 text-text-primary font-bold whitespace-normal break-words">
                                                                                    {item.product_name}
                                                                                </div>
                                                                                <div className="shrink-0 text-right font-extrabold text-status-info">
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
                                                    <div className="px-4 py-4 text-sm text-text-secondary">No items are at or below the low-stock threshold.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        if (card.interactive === 'warehouse') {
                            return (
                                <div 
                                    key={card.title} 
                                    onClick={() => setIsWarehouseBreakdownOpen(true)}
                                    className={`bg-surface border border-border p-4.5 rounded-xl shadow-sm hover:shadow-md hover:border-accent transition-all duration-200 cursor-pointer h-[132px] flex flex-col justify-between group ${card.colSpan || ''}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{card.title}</span>
                                        <div className={`p-1.5 rounded-xl ${card.iconBg || 'bg-accent/10 text-accent'}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-text-primary tracking-tight">
                                        {card.value}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold border-t border-border/40 pt-2 group-hover:border-accent/30 transition-colors">
                                        <span>{card.sub}</span>
                                        <span className="flex items-center gap-0.5 text-accent font-bold group-hover:translate-x-1 transition-transform">
                                            View Breakdown <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={card.title} className={`bg-surface border border-border p-4.5 rounded-xl shadow-sm h-[132px] flex flex-col justify-between ${card.colSpan || ''}`}>
                                <div className="flex items-start justify-between">
                                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{card.title}</span>
                                    <div className={`p-1.5 rounded-xl ${card.iconBg || 'bg-accent/10 text-accent'}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-text-primary tracking-tight">
                                    {card.value}
                                </div>
                                <div className="text-[10px] text-text-secondary font-semibold uppercase border-t border-border/40 pt-2">
                                    {card.sub || '\u00A0'}
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

            {/* Warehouse Stock Breakdown Modal */}
            <WarehouseBreakdownModal
                isOpen={isWarehouseBreakdownOpen}
                onClose={() => setIsWarehouseBreakdownOpen(false)}
                products={products}
            />
        </div>
    );
};

// Helper Component for Warehouse Stock Breakdown Modal
const WarehouseBreakdownModal = ({ isOpen, onClose, products }) => {
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

    // Reset filter when modal is opened/closed
    useEffect(() => {
        if (isOpen) {
            setSelectedCategoryFilter('All');
        }
    }, [isOpen]);

    const categoriesList = useMemo(() => {
        const cats = new Set();
        products.forEach(p => {
            if ((p.warehouse_stock ?? 0) > 0) {
                cats.add(p.category || 'Uncategorized');
            }
        });
        return ['All', ...Array.from(cats)].sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return a.localeCompare(b);
        });
    }, [products]);

    const categoryGroups = useMemo(() => {
        const groups = {};
        products.forEach(p => {
            const qty = p.warehouse_stock ?? 0;
            if (qty > 0) {
                const cat = p.category || 'Uncategorized';
                if (selectedCategoryFilter !== 'All' && cat !== selectedCategoryFilter) {
                    return;
                }
                if (!groups[cat]) {
                    groups[cat] = [];
                }
                groups[cat].push(p);
            }
        });
        return groups;
    }, [products, selectedCategoryFilter]);

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* Backdrop overlay */}
            <div className="fixed inset-0 bg-primary/30 backdrop-blur-xs transition-opacity duration-300 ease-out" aria-hidden="true" />

            {/* Centered Panel */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl border border-card flex flex-col max-h-[80vh] transform scale-100 opacity-100 transition-all duration-300 ease-out">
                    <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
                        <div>
                            <Dialog.Title className="text-lg font-bold text-primary">
                                Warehouse Stock Breakdown
                            </Dialog.Title>
                            <p className="text-xs text-secondary mt-0.5">
                                Current products in warehouse grouped by category
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 text-secondary hover:text-primary rounded-full hover:bg-page transition-colors cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Category Filter Buttons */}
                    {categoriesList.length > 1 && (
                        <div className="flex flex-wrap gap-1.5 mb-4 border-b border-border pb-3">
                            {categoriesList.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategoryFilter(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                        selectedCategoryFilter === cat
                                            ? 'bg-accent/15 text-accent border-accent/40 shadow-xs'
                                            : 'bg-background hover:bg-page text-text-secondary border-border hover:text-text-primary'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-1">
                        {Object.keys(categoryGroups).length === 0 ? (
                            <div className="py-12 text-center text-sm text-textMuted">
                                No items matching the selected category filter.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(categoryGroups).map(([category, items]) => {
                                    const totalCatQty = items.reduce((sum, item) => sum + (item.warehouse_stock ?? 0), 0);
                                    return (
                                        <div key={category} className="border border-border rounded-xl overflow-hidden bg-background/50">
                                            {/* Category Header */}
                                            <div className="bg-background px-4 py-2.5 flex items-center justify-between border-b border-border">
                                                <span className="text-xs font-black uppercase text-primary tracking-wider">{category}</span>
                                                <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                                    {totalCatQty} units
                                                </span>
                                            </div>
                                            {/* Category Products list */}
                                            <div className="divide-y divide-border/60">
                                                {items.map((item) => (
                                                    <div key={item.id} className="px-4 py-2 flex items-center justify-between text-xs hover:bg-page/40 transition-colors">
                                                        <div className="flex flex-col min-w-0 pr-4">
                                                            <span className="font-bold text-primary truncate">{item.name}</span>
                                                            <span className="text-[10px] text-secondary font-mono mt-0.5">{item.product_code || item.sku}</span>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className="font-extrabold text-primary">{item.warehouse_stock ?? 0}</span>
                                                            <span className="text-[10px] text-secondary ml-1">units</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default InventoryManagment;
