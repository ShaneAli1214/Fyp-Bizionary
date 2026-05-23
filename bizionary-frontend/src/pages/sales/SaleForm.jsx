import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../../services/api';
import { PRODUCT_CATEGORIES, normalizeProductCategory } from '../../utils/productCategories';

const buildEmptyLineItem = (category = 'Tech') => ({
    category,
    product: '',
    quantity: 1,
    unitPrice: 0,
});

const SaleForm = ({ isOpen, onClose, onSubmit, initialData, createdSale, createMessage, onGenerateCreatedSaleSlip }) => {
    const isEditing = !!initialData;
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [lineItems, setLineItems] = useState([buildEmptyLineItem()]);
    const [orderData, setOrderData] = useState({
        customer_name: '',
        sale_date: new Date().toISOString().split('T')[0],
        payment_method: 'CARD',
    });

    const paymentMethodOptions = [
        { value: 'CARD', label: 'Card' },
        { value: 'EASYPAY_JAZZCASH', label: 'Easypaisa/Jazz Cash' },
    ];

    const buildDefaultOrderData = () => ({
        customer_name: '',
        sale_date: new Date().toISOString().split('T')[0],
        payment_method: 'CARD',
    });

    useEffect(() => {
        // Fetch products for the dropdown
        const fetchProducts = async () => {
            try {
                setProductsLoading(true);
                const res = await api.get('products/');
                const productsPayload = res.data?.results || res.data?.data || res.data || [];
                setProducts(productsPayload);
            } catch (error) {
                console.warn('Failed to load products for sale form.');
                setProducts([]);
            } finally {
                setProductsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        if (initialData) {
            setOrderData({
                ...buildDefaultOrderData(),
                customer_name: initialData.customer_name || '',
                sale_date: initialData.sale_date || new Date().toISOString().split('T')[0],
                payment_method: initialData.payment_method || 'CARD',
            });

            if (Array.isArray(initialData.line_items) && initialData.line_items.length > 0) {
                setLineItems(initialData.line_items.map((item) => ({
                    category: normalizeProductCategory(item.product_category) || 'Tech',
                    product: Number(item.product || item.product_id || ''),
                    quantity: Number(item.quantity_sold || item.quantity || 1),
                    unitPrice: Number(item.unit_price || 0),
                })));
            } else {
                setLineItems([{
                    category: normalizeProductCategory(initialData.product_category) || 'Tech',
                    product: initialData.product ? Number(initialData.product) : '',
                    quantity: Number(initialData.quantity_sold || 1),
                    unitPrice: Number(initialData.unit_price || 0),
                }]);
            }
        } else {
            setOrderData(buildDefaultOrderData());
            setLineItems([buildEmptyLineItem()]);
        }
        setErrorMessage('');
    }, [initialData, isOpen]);

    const totalPrice = useMemo(() => lineItems.reduce(
        (sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)),
        0
    ), [lineItems]);

    const formatApiError = (error) => {
        const payload = error?.response?.data;
        if (!payload) return 'Failed to save sale.';
        if (typeof payload === 'string') return payload;
        if (payload.detail) return payload.detail;
        const firstField = Object.keys(payload)[0];
        if (firstField && Array.isArray(payload[firstField])) {
            return `${firstField}: ${payload[firstField].join(', ')}`;
        }
        return 'Failed to save sale.';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setOrderData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const getAvailableProducts = (category) => products.filter((product) => normalizeProductCategory(product.category) === category);

    const handleLineItemChange = (index, field, value) => {
        setLineItems((previous) => previous.map((item, itemIndex) => {
            if (itemIndex !== index) {
                return item;
            }

            if (field === 'category') {
                const normalizedCategory = normalizeProductCategory(value) || 'Tech';
                return {
                    ...item,
                    category: normalizedCategory,
                    product: '',
                    unitPrice: 0,
                };
            }

            if (field === 'product') {
                const selectedProduct = products.find((product) => product.id === Number(value));
                return {
                    ...item,
                    product: Number(value),
                    unitPrice: Number(selectedProduct?.unit_price || 0),
                };
            }

            return {
                ...item,
                [field]: field === 'quantity' || field === 'unitPrice' ? Number(value) : value,
            };
        }));
    };

    const handleAddLineItem = () => {
        setLineItems((previous) => [...previous, buildEmptyLineItem(previous[previous.length - 1]?.category || 'Tech')]);
    };

    const handleRemoveLineItem = (index) => {
        setLineItems((previous) => {
            if (previous.length === 1) {
                return [buildEmptyLineItem(previous[0]?.category || 'Tech')];
            }

            return previous.filter((_, itemIndex) => itemIndex !== index);
        });
    };

    const buildPayload = () => ({
        ...orderData,
        line_items: lineItems.map((item) => ({
            category: item.category,
            product: item.product,
            quantity_sold: Number(item.quantity || 0),
            unit_price: Number(item.unitPrice || 0),
        })),
        quantity_sold: lineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        unit_price: lineItems[0]?.unitPrice || 0,
        total_price: totalPrice,
    });

    const submitForm = async (options = {}) => {
        if (!orderData.customer_name.trim()) {
            setErrorMessage('Please enter a customer name before saving the sale.');
            return;
        }

        if (!lineItems.length) {
            setErrorMessage('Please add at least one product.');
            return;
        }

        const hasMissingProduct = lineItems.some((item) => !item.product);
        if (hasMissingProduct) {
            setErrorMessage('Please select a product for every line item.');
            return;
        }

        const hasInvalidQuantity = lineItems.some((item) => Number(item.quantity || 0) < 1);
        if (hasInvalidQuantity) {
            setErrorMessage('Quantity must be at least 1 for every line item.');
            return;
        }

        const hasInvalidUnitPrice = lineItems.some((item) => Number(item.unitPrice || 0) <= 0);
        if (hasInvalidUnitPrice) {
            setErrorMessage('Unit price must be greater than zero for every line item.');
            return;
        }

        setSubmitting(true);
        setErrorMessage('');
        try {
            await onSubmit(buildPayload(), options);
        } catch (error) {
            setErrorMessage(formatApiError(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await submitForm();
    };

    return (
        <Dialog open={isOpen} onClose={submitting ? () => {} : onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
                <Dialog.Panel className="flex h-[90vh] w-11/12 max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
                        <Dialog.Title className="text-xl font-bold text-textMain">
                            {isEditing ? 'Edit Sale' : 'Create New Sale'}
                        </Dialog.Title>
                        <button onClick={onClose} disabled={submitting} className="rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Customer Name</label>
                                    <input
                                        type="text"
                                        name="customer_name"
                                        required
                                        value={orderData.customer_name}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Sale Date</label>
                                    <input
                                        type="date"
                                        name="sale_date"
                                        required
                                        value={orderData.sale_date}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-amber-100 bg-amber-50/80 p-2.5">
                                        {paymentMethodOptions.map((option) => {
                                            const isSelected = orderData.payment_method === option.value;

                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setOrderData((prev) => ({ ...prev, payment_method: option.value }))}
                                                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${isSelected
                                                        ? 'border-amber-400 bg-amber-300 text-amber-950 shadow-sm'
                                                        : 'border-amber-100 bg-white text-gray-700 hover:bg-amber-50'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 space-y-4 rounded-2xl border border-gray-100 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-textMain">Line Items</h3>
                                        <p className="text-xs text-textMuted">Add one or more products for the same sale.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {lineItems.map((item, index) => {
                                        const rowProducts = getAvailableProducts(item.category);

                                        return (
                                            <div key={`${index}-${item.category}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-textMain">Line Item {index + 1}</p>
                                                        <p className="text-xs text-textMuted">Category, product, quantity, and unit price</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveLineItem(index)}
                                                        className="inline-flex items-center justify-center rounded-lg border border-rose-100 bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100"
                                                        title="Remove line item"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(8rem,9rem)_minmax(0,1.9fr)_minmax(6rem,7rem)_minmax(7rem,8rem)_auto] lg:items-end">
                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                                                        <select
                                                            value={item.category}
                                                            onChange={(event) => handleLineItemChange(index, 'category', event.target.value)}
                                                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        >
                                                            {PRODUCT_CATEGORIES.map((category) => (
                                                                <option key={category.value} value={category.value}>{category.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="min-w-0">
                                                        <label className="mb-1 block text-sm font-medium text-gray-700">Product</label>
                                                        <select
                                                            value={item.product}
                                                            onChange={(event) => handleLineItemChange(index, 'product', event.target.value)}
                                                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        >
                                                            <option value="" disabled>
                                                                {productsLoading ? 'Loading products...' : `Select a ${item.category.toLowerCase()} product...`}
                                                            </option>
                                                            {rowProducts.map((product) => (
                                                                <option key={product.id} value={product.id}>
                                                                    {product.name} ({product.product_code || product.sku})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {!productsLoading && rowProducts.length === 0 && (
                                                            <p className="mt-1 text-xs text-amber-600">No products found in {item.category}. Try another category.</p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(event) => handleLineItemChange(index, 'quantity', event.target.value)}
                                                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium text-gray-700">Unit Price (Rs)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unitPrice}
                                                            onChange={(event) => handleLineItemChange(index, 'unitPrice', event.target.value)}
                                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        />
                                                    </div>

                                                    <div className="lg:justify-self-end">
                                                        <label className="mb-1 block text-sm font-medium text-transparent">Remove</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveLineItem(index)}
                                                            className="inline-flex w-full items-center justify-center rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-rose-600 transition-colors hover:bg-rose-100 lg:w-auto"
                                                            title="Remove line item"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
                                                    Line Total: Rs {(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddLineItem}
                                    className="inline-flex items-center justify-center rounded-xl border border-dashed border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Another Product
                                </button>

                                {!errorMessage && createMessage && createdSale && !isEditing && (
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                        <span>{createMessage}</span>
                                    </div>
                                )}

                                {errorMessage && (
                                    <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                                        {errorMessage}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-5 py-4 shadow-[0_-10px_25px_rgba(15,23,42,0.06)] sm:px-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 lg:min-w-[18rem]">
                                    <span className="text-sm font-semibold text-sky-800">Total Price:</span>
                                    <span className="text-xl font-bold text-primary">Rs {totalPrice.toLocaleString()}</span>
                                </div>

                                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={submitting}
                                        className="rounded-xl border border-gray-200 bg-slate-50 px-4 py-2 text-sm font-medium text-textMain transition-colors hover:bg-slate-50/80"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Sale')}
                                    </button>
                                    {!isEditing && createdSale && (
                                        <button
                                            type="button"
                                            onClick={onGenerateCreatedSaleSlip}
                                            className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-400"
                                        >
                                            Generate Slip
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default SaleForm;
