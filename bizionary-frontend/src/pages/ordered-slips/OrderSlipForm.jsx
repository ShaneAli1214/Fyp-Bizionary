import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import api from '../../services/api';
import { PRODUCT_CATEGORIES, normalizeProductCategory, getCompaniesForCategory } from '../../utils/productCategories';

const OrderSlipForm = ({ isOpen, onClose, onSubmit, submitting = false, errorMessage = '', title = 'Generate Order Slip', submitLabel = 'Generate Slip' }) => {
    const [products, setProducts] = useState([]);
    const defaultTechCompany = getCompaniesForCategory('Tech')[0]?.name || '';
    const [formData, setFormData] = useState({
        product: '',
        company_name: defaultTechCompany,
        quantity_ordered: 1,
        notes: '',
    });
    const [selectedCategory, setSelectedCategory] = useState('Tech');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await api.get('products/');
                const productsPayload = res.data?.results || res.data?.data || res.data || [];
                setProducts(productsPayload);
            } catch (error) {
                setProducts([]);
            }
        };

        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    useEffect(() => {
        const defaultCategory = 'Tech';
        const defaultCompanies = getCompaniesForCategory(defaultCategory);
        const defaultCompanyName = defaultCompanies[0]?.name || '';
        setSelectedCategory(defaultCategory);
        setFormData({
            product: '',
            company_name: defaultCompanyName,
            quantity_ordered: 1,
            notes: '',
        });
    }, [isOpen]);

    const availableProducts = useMemo(
        () => products.filter((item) => normalizeProductCategory(item.category) === selectedCategory),
        [products, selectedCategory]
    );

    const selectedProduct = availableProducts.find((item) => item.id === Number(formData.product));
    const selectedUnitCost = Number(selectedProduct?.cost_price || 0);
    const totalAmount = Number(formData.quantity_ordered || 0) * selectedUnitCost;

    const handleChange = (event) => {
        const { name, value, type } = event.target;

        if (name === 'category') {
            const categoryCompanies = getCompaniesForCategory(value);
            const firstCompany = categoryCompanies[0]?.name || '';
            setSelectedCategory(value);
            setFormData((prev) => ({
                ...prev,
                product: '',
                company_name: firstCompany,
            }));
            return;
        }

        if (name === 'product') {
            setFormData((prev) => ({
                ...prev,
                product: value,
            }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!selectedProduct) {
            return;
        }

        onSubmit({
            product: selectedProduct.id,
            company_name: formData.company_name,
            quantity_ordered: Number(formData.quantity_ordered || 0),
            unit_cost: selectedUnitCost,
            notes: formData.notes,
        });
    };

    return (
        <Dialog open={isOpen} onClose={submitting ? () => {} : onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-primary">{title}</Dialog.Title>
                        <button onClick={onClose} disabled={submitting} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 disabled:opacity-50">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                <select
                                    name="company_name"
                                    required
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                                >
                                    {getCompaniesForCategory(selectedCategory).map((company) => (
                                        <option key={company.name} value={company.name}>{company.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                <select
                                    name="product"
                                    required
                                    value={formData.product}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                                >
                                    <option value="" disabled>Select a {selectedCategory.toLowerCase()} product...</option>
                                    {availableProducts.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.product_code || product.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-800">
                                        {selectedProduct ? `Rs ${selectedUnitCost.toLocaleString()}` : 'Select a product'}
                                    </div>
                                </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Order</label>
                                <input
                                    type="number"
                                    name="quantity_ordered"
                                    min="1"
                                    required
                                    value={formData.quantity_ordered}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    name="notes"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="Optional order instructions..."
                                />
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-700">Total Amount:</span>
                            <span className="text-xl font-bold text-danger">Rs {totalAmount.toLocaleString()}</span>
                        </div>

                        {errorMessage && (
                            <div className="p-3 rounded-lg border border-rose-100 bg-rose-50 text-rose-700 text-sm">
                                {errorMessage}
                            </div>
                        )}

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !selectedProduct}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primaryDark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Generating...' : submitLabel}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default OrderSlipForm;