import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { normalizeProductCategory } from '../../utils/productCategories';
import useCategories from '../../hooks/useCategories';

const ProductForm = ({ isOpen, onClose, onSubmit, initialData, submitting = false, errorMessage = '', getNextProductCode, supplierOptions = [] }) => {
    const { categories: dynamicCategories, loading: categoriesLoading } = useCategories();
    const isEditing = !!initialData;
    const [formData, setFormData] = useState({
        name: '',
        product_code: '',
        category: '',
        cost_price: 0,
        sale_price: 0,
        supplier: '',
        status: 'ACTIVE',
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    category: initialData.category || '',
                    cost_price: initialData.cost_price ?? 0,
                    sale_price: initialData.sale_price ?? initialData.unit_price ?? 0,
                    supplier: initialData.supplier_id || initialData.supplier || '',
                    status: initialData.status || 'ACTIVE',
                });
            } else {
                setFormData({
                    name: '',
                    product_code: '',
                    category: '',
                    cost_price: 0,
                    sale_price: 0,
                    supplier: '',
                    status: 'ACTIVE',
                });
            }
        }
    }, [initialData, isOpen]);

    useEffect(() => {
        if (isOpen && !isEditing && !formData.category && dynamicCategories.length > 0) {
            const defaultCategory = dynamicCategories[0].value;
            setFormData((prev) => ({
                ...prev,
                category: defaultCategory,
                product_code: getNextProductCode ? getNextProductCode(defaultCategory) : prev.product_code,
            }));
        }
    }, [dynamicCategories, isOpen, isEditing, getNextProductCode, formData.category]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;

        if (name === 'category' && !isEditing) {
            setFormData((prev) => ({
                ...prev,
                category: value,
                product_code: getNextProductCode ? getNextProductCode(value) : prev.product_code,
            }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Dialog open={isOpen} onClose={submitting ? () => {} : onClose} className="relative z-50">
            <div className="fixed inset-0 bg-primary/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-card">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-primary">
                            {isEditing ? 'Edit Product' : 'Add New Product'}
                        </Dialog.Title>
                        <button onClick={onClose} disabled={submitting} className="p-2 text-secondary hover:text-secondary rounded-full hover:bg-page disabled:opacity-50">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Product Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="Enter the master product name"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Product ID / SKU</label>
                                <input
                                    type="text"
                                    name="product_code"
                                    required
                                    value={formData.product_code}
                                    onChange={handleChange}
                                    readOnly={!isEditing}
                                    className={`w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${!isEditing ? 'bg-page text-secondary' : ''}`}
                                    placeholder="Auto-generated from category"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-primary mb-1">Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-card"
                                >
                                    {dynamicCategories.length > 0 ? (
                                        dynamicCategories.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))
                                    ) : (
                                        // Fallback while loading
                                        <option value={formData.category}>{formData.category || 'Loading…'}</option>
                                    )}
                                </select>
                            </div>

                            {/* Brand and Unit fields removed */}

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Purchase Price (Rs)</label>
                                <input
                                    type="number"
                                    name="cost_price"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.cost_price}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Selling Price (Rs)</label>
                                <input
                                    type="number"
                                    name="sale_price"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.sale_price}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Supplier</label>
                                <select
                                    name="supplier"
                                    value={formData.supplier || ''}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-card"
                                >
                                    <option value="">No supplier linked</option>
                                    {supplierOptions.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-card"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>

                        </div>

                        {errorMessage && (
                            <div className="p-3 rounded-lg border border-rose-100 bg-status-info/10 text-status-info text-sm">
                                {errorMessage}
                            </div>
                        )}

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-primary bg-card border border-card rounded-xl hover:bg-page transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-card bg-primary rounded-xl hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Product')}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default ProductForm;
