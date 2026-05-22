import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import { Package, Plus, Receipt } from 'lucide-react';
import OrderSlipForm from '../ordered-slips/OrderSlipForm';
import { PRODUCT_CATEGORIES, normalizeProductCategory, getCompanyForCategory } from '../../utils/productCategories';

const InventoryManagment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [purchasesLoading, setPurchasesLoading] = useState(true);
    const [stockLoading, setStockLoading] = useState(true);
    const [stocks, setStocks] = useState([]);
    const [purchaseSummary, setPurchaseSummary] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [selectedOrderSlip, setSelectedOrderSlip] = useState(null);

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

    const fetchStocks = async () => {
        try {
            setStockLoading(true);
            const res = await api.get('products/');
            // Support DRF pagination (`results`) or custom `{data: [...]}` shape
            const products = res.data?.results || res.data?.data || res.data || [];

            setStocks(products.map((item) => ({
                id: item.id,
                product_code: item.product_code || item.sku,
                name: item.name,
                category: item.category,
                quantity: item.stock_quantity,
                low_stock_threshold: item.reorder_level,
                unit_price: item.unit_price,
                value: Number(item.stock_quantity || 0) * Number(item.unit_price || 0),
            })));
        } catch (error) {
            console.warn('Failed to fetch stock data from products API.');
            setStocks([]);
        } finally {
            setStockLoading(false);
        }
    };

    const handleCreateOrderSlip = async (orderSlipData) => {
        setSubmitting(true);
        setFormError('');
        setFormSuccess('');

        try {
            const payload = {
                ...orderSlipData,
                status: 'PENDING',
            };

            const response = await api.post('purchases/ordered-slips/', payload);
            setSelectedOrderSlip(response.data);
            setFormSuccess('Order slip generated and email sent.');
            setIsFormOpen(false);
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to generate order slip.'));
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchPurchasesSummary = async () => {
            try {
                setPurchasesLoading(true);
                const res = await api.get('purchases/');
                // Support multiple API response shapes: {results: [...]}, {data: [...]}, or [...]
                const purchases = res.data?.results || res.data?.data || res.data || [];

                const grouped = PRODUCT_CATEGORIES.map((category) => {
                    const company = getCompanyForCategory(category.value);
                    const records = purchases.filter((item) => normalizeProductCategory(item.product_category) === category.value);
                    // Calculate total based on CURRENT unit price
                    // quantity_purchased × current_unit_price (what it's worth today)
                    const totalBought = records.reduce((sum, item) => {
                        const qty = Number(item.quantity_purchased || 0);
                        const currentPrice = Number(item.current_unit_price || 0);
                        return sum + (qty * currentPrice);
                    }, 0);
                    return {
                        category: category.value,
                        company,
                        totalBought,
                        orders: records.length,
                    };
                });

                setPurchaseSummary(grouped);
            } catch (error) {
                console.warn('Inventory management purchases summary API call failed.');
                setPurchaseSummary([]);
            } finally {
                setPurchasesLoading(false);
            }
        };

        fetchPurchasesSummary();
    }, []);

    useEffect(() => {
        fetchStocks();
    }, []);

    useEffect(() => {
        if (!purchasesLoading && !stockLoading) {
            setLoading(false);
        }
    }, [purchasesLoading, stockLoading]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const stocksByCategory = PRODUCT_CATEGORIES.map((category) => {
        const items = stocks.filter((item) => normalizeProductCategory(item.category) === category.value);
        const totalValue = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
        return {
            ...category,
            items,
            totalValue,
        };
    });

    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-textMain dark:text-slate-100">Inventory Managment</h1>
                        <p className="text-textMuted dark:text-slate-300 text-sm mt-1">Track stock and generate supplier order slips from here.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primaryDark text-sm font-bold transition-all shadow-md shadow-primary/20"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Order Products
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

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-textMain">Purchases by Company</h2>
                        <p className="text-xs text-textMuted mt-1">Business logic: We buy products from these 3 companies in PKR.</p>
                    </div>
                    <button
                        onClick={() => navigate('/purchases')}
                        className="text-xs font-bold text-primary hover:text-primaryDark"
                    >
                        View Purchases
                    </button>
                </div>

                <div className="divide-y divide-gray-100">
                    {purchasesLoading && (
                        <div className="px-6 py-8 text-center text-textMuted text-sm">Loading purchases summary...</div>
                    )}

                    {!purchasesLoading && purchaseSummary.length === 0 && (
                        <div className="px-6 py-8 text-center text-textMuted text-sm">No purchase records found.</div>
                    )}

                    {!purchasesLoading && purchaseSummary.map((item) => (
                        <div key={item.category} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-50/70 transition-colors">
                            <div>
                                <p className="text-sm font-bold text-textMain">{item.company}</p>
                                <p className="text-xs text-textMuted mt-0.5">{item.category} • {item.orders} purchase order(s)</p>
                            </div>
                            <p className="text-sm font-extrabold text-emerald-700">We bought products of {formatPKR(item.totalBought)}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-5">
                <div className="px-1">
                    <h2 className="text-lg font-bold text-textMain">Stock Information</h2>
                    <p className="text-xs text-textMuted mt-1">Inventory overview moved from Customer & Stocks, now grouped by category.</p>
                </div>

                {stockLoading && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-8 text-center text-textMuted text-sm">
                        Loading stock records...
                    </div>
                )}

                {!stockLoading && stocks.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-8 text-center text-textMuted text-sm">
                        No stock records found.
                    </div>
                )}

                {!stockLoading && stocksByCategory.map((section) => (
                    <div key={section.value} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                        <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-textMain">{section.label} Section</h3>
                                <p className="text-[11px] text-textMuted mt-0.5">Direct Company: {getCompanyForCategory(section.value)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                                    {section.items.length} items
                                </span>
                                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                                    Value: {formatPKR(section.totalValue)}
                                </span>
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Product Name & Code</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">In Stock</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Unit Price</th>
                                    <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {section.items.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-textMuted text-sm">No products in this section.</td>
                                    </tr>
                                ) : section.items.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-slate-100 flex flex-shrink-0 items-center justify-center text-slate-400">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-textMain truncate">{item.name}</p>
                                                    <p className="text-[10px] text-textMuted font-bold uppercase mt-0.5">{item.product_code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${item.quantity <= item.low_stock_threshold ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {item.quantity} Units
                                            </span>
                                            {item.quantity <= item.low_stock_threshold && (
                                                <p className="text-[10px] text-rose-500 font-bold mt-1">Reorder <br/> (Below {item.low_stock_threshold})</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm text-gray-600 font-medium">{formatPKR(item.unit_price)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold text-emerald-700">{formatPKR(item.value)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            <OrderSlipForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreateOrderSlip}
                submitting={submitting}
                errorMessage={formError}
            />
        </div>
    );
};

export default InventoryManagment;
