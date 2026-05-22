import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import api from '../../services/api';
import { PRODUCT_CATEGORIES, normalizeProductCategory } from '../../utils/productCategories';

const SaleForm = ({ isOpen, onClose, onSubmit, initialData }) => {
    const isEditing = !!initialData;
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('Tech');

    const [formData, setFormData] = useState({
        product: '',
        customer_name: '',
        quantity_sold: 1,
        unit_price: 0,
        sale_date: new Date().toISOString().split('T')[0],
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
            setFormData(initialData);
        } else {
            setFormData({
                product: '',
                customer_name: '',
                quantity_sold: 1,
                unit_price: 0,
                sale_date: new Date().toISOString().split('T')[0],
            });
            setSelectedCategory('Tech');
        }
        setErrorMessage('');
    }, [initialData, isOpen]);

    useEffect(() => {
        if (!isOpen || !products.length) {
            return;
        }

        if (initialData?.product) {
            const matched = products.find((p) => p.id === Number(initialData.product));
            if (matched) {
                setSelectedCategory(normalizeProductCategory(matched.category) || 'Tech');
                return;
            }
        }

        // If selected category has no products, fallback to first available category.
        const activeCategoryHasProducts = products.some(
            (p) => normalizeProductCategory(p.category) === selectedCategory
        );

        if (!activeCategoryHasProducts) {
            const firstAvailable = PRODUCT_CATEGORIES.find((category) =>
                products.some((p) => normalizeProductCategory(p.category) === category.value)
            );
            setSelectedCategory(firstAvailable?.value || 'Tech');
        }
    }, [products, initialData, isOpen, selectedCategory]);

    const availableProducts = useMemo(
        () => products.filter((p) => normalizeProductCategory(p.category) === selectedCategory),
        [products, selectedCategory]
    );

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === Number(formData.product)),
        [products, formData.product]
    );

    const remainingAfterSale = useMemo(() => {
        if (!selectedProduct) {
            return null;
        }
        return Number(selectedProduct.stock_quantity) - Number(formData.quantity_sold || 0);
    }, [selectedProduct, formData.quantity_sold]);

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
        const { name, value, type } = e.target;

        if (name === 'category') {
            const normalizedCategory = normalizeProductCategory(value) || 'Tech';
            setSelectedCategory(normalizedCategory);
            setFormData((prev) => ({
                ...prev,
                product: '',
                unit_price: 0,
            }));
            return;
        }

        let newFormData = {
            ...formData,
            [name]: (name === 'product' || type === 'number') ? Number(value) : value,
        };

        // If product is selected, auto-fill unit_price and product_name for convenience
        if (name === 'product') {
            const selectedProduct = products.find(p => p.id === Number(value));
            if (selectedProduct) {
                newFormData.unit_price = selectedProduct.unit_price;
            }
        }

        setFormData(newFormData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage('');
        try {
            await onSubmit(formData);
        } catch (error) {
            setErrorMessage(formatApiError(error));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={submitting ? () => {} : onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-textMain">
                            {isEditing ? 'Edit Sale' : 'Create New Sale'}
                        </Dialog.Title>
                        <button onClick={onClose} disabled={submitting} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 disabled:opacity-50">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                <input
                                    type="text"
                                    name="customer_name"
                                    required
                                    value={formData.customer_name}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    name="category"
                                    required
                                    value={selectedCategory}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                                >
                                    {PRODUCT_CATEGORIES.map((category) => (
                                        <option key={category.value} value={category.value}>{category.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                <select
                                    name="product"
                                    required
                                    value={formData.product}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                                >
                                    <option value="" disabled>
                                        {productsLoading ? 'Loading products...' : `Select a ${selectedCategory.toLowerCase()} product...`}
                                    </option>
                                    {availableProducts.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.product_code || p.sku})</option>
                                    ))}
                                </select>
                                {!productsLoading && availableProducts.length === 0 && (
                                    <p className="text-xs mt-1 text-amber-600">
                                        No products found in {selectedCategory}. Try another category.
                                    </p>
                                )}
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
                                <input
                                    type="date"
                                    name="sale_date"
                                    required
                                    value={formData.sale_date}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    name="quantity_sold"
                                    min="1"
                                    required
                                    value={formData.quantity_sold}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                                {selectedProduct && (
                                    <p className={`text-xs mt-1 ${remainingAfterSale < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                        Remaining after sale: {remainingAfterSale}
                                    </p>
                                )}
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (Rs)</label>
                                <input
                                    type="number"
                                    name="unit_price"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.unit_price}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-gray-50"
                                />
                            </div>

                        </div>

                        {errorMessage && (
                            <div className="p-3 rounded-lg border border-rose-100 bg-rose-50 text-rose-700 text-sm">
                                {errorMessage}
                            </div>
                        )}

                        {/* Calculated Total */}
                        <div className="mt-4 p-4 bg-sky-50 rounded-xl border border-sky-100 flex justify-between items-center">
                            <span className="text-sm font-semibold text-sky-800">Total Price:</span>
                            <span className="text-xl font-bold text-primary">
                                Rs {(formData.quantity_sold * formData.unit_price).toLocaleString()}
                            </span>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-textMain bg-slate-50 border border-gray-200 rounded-xl hover:bg-slate-50/80 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primaryDark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Sale')}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default SaleForm;
