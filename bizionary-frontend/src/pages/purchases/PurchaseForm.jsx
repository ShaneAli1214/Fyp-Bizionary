import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import api from '../../services/api';
import { PRODUCT_CATEGORIES, normalizeProductCategory, getCompanyForCategory } from '../../utils/productCategories';

const PurchaseForm = ({ isOpen, onClose, onSubmit, initialData }) => {
    const isEditing = !!initialData;
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('Tech');

    const [formData, setFormData] = useState({
        product: '',
        company_name: getCompanyForCategory('Tech'),
        quantity_purchased: 1,
        unit_cost: 0,
        purchase_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        // Fetch products for the dropdown
        const fetchProducts = async () => {
            try {
                const res = await api.get('products/');
                const productsPayload = res.data?.results || res.data?.data || res.data || [];
                setProducts(productsPayload);
            } catch (error) {
                setProducts([]);
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        if (initialData) {
            const normalizedCategory = normalizeProductCategory(initialData.product_category) || 'Tech';
            setSelectedCategory(normalizedCategory);
            setFormData({
                ...initialData,
                company_name: getCompanyForCategory(normalizedCategory),
            });
        } else {
            const defaultCategory = 'Tech';
            setFormData({
                product: '',
                company_name: getCompanyForCategory(defaultCategory),
                quantity_purchased: 1,
                unit_cost: 0,
                purchase_date: new Date().toISOString().split('T')[0],
            });
            setSelectedCategory(defaultCategory);
        }
    }, [initialData, isOpen]);

    const availableProducts = products.filter(
        (p) => normalizeProductCategory(p.category) === selectedCategory
    );

    const handleChange = (e) => {
        const { name, value, type } = e.target;

        if (name === 'category') {
            const normalizedCategory = normalizeProductCategory(value) || 'Tech';
            setSelectedCategory(normalizedCategory);
            setFormData((prev) => ({
                ...prev,
                product: '',
                unit_cost: 0,
                company_name: getCompanyForCategory(normalizedCategory),
            }));
            return;
        }

        let newFormData = {
            ...formData,
            [name]: (name === 'product' || type === 'number') ? Number(value) : value,
        };

        if (name === 'product') {
            const selectedProduct = products.find((p) => p.id === Number(value));
            if (selectedProduct) {
                const normalizedCategory = normalizeProductCategory(selectedProduct.category) || selectedCategory;
                setSelectedCategory(normalizedCategory);
                newFormData.unit_cost = Number(selectedProduct.unit_price || 0);
                newFormData.company_name = getCompanyForCategory(normalizedCategory);
            }
        }

        setFormData(newFormData);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-primary/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-card">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-textMain">
                            {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
                        </Dialog.Title>
                        <button onClick={onClose} className="p-2 text-secondary hover:text-secondary rounded-full hover:bg-page">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Category</label>
                                <select
                                    name="category"
                                    required
                                    value={selectedCategory}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-card"
                                >
                                    {PRODUCT_CATEGORIES.map((category) => (
                                        <option key={category.value} value={category.value}>{category.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Company (Auto Assigned)</label>
                                <input
                                    type="text"
                                    name="company_name"
                                    required
                                    value={formData.company_name}
                                    readOnly
                                    className="w-full border border-card rounded-lg p-2.5 text-sm bg-page text-primary"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-primary mb-1">Product</label>
                                <select
                                    name="product"
                                    required
                                    value={formData.product}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-card"
                                >
                                    <option value="" disabled>Select a {selectedCategory.toLowerCase()} product...</option>
                                    {availableProducts.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.product_code || p.sku})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Purchase Date</label>
                                <input
                                    type="date"
                                    name="purchase_date"
                                    required
                                    value={formData.purchase_date}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Quantity</label>
                                <input
                                    type="number"
                                    name="quantity_purchased"
                                    min="1"
                                    required
                                    value={formData.quantity_purchased}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Unit Cost (Rs)</label>
                                <input
                                    type="number"
                                    name="unit_cost"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.unit_cost}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                        </div>

                        {/* Calculated Total Cost */}
                        <div className="mt-4 p-4 bg-page rounded-xl border border-card flex justify-between items-center">
                            <span className="text-sm font-semibold text-primary">Total Estimated Cost:</span>
                            <span className="text-xl font-bold text-danger">
                                Rs {(formData.quantity_purchased * formData.unit_cost).toLocaleString()}
                            </span>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-primary bg-card border border-card rounded-full hover:bg-page transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium bg-primary rounded-full"
                            >
                                {isEditing ? 'Save Changes' : 'Create Purchase'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default PurchaseForm;
