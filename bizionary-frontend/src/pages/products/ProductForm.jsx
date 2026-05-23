import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { PRODUCT_CATEGORIES, normalizeProductCategory } from '../../utils/productCategories';
import { getSubcategoriesForCategory, getProductsForCategoryAndSubcategory } from '../../utils/productCatalog';

const ProductForm = ({ isOpen, onClose, onSubmit, initialData, submitting = false, errorMessage = '', getNextProductCode }) => {
    const isEditing = !!initialData;
    const [formData, setFormData] = useState({
        name: '',
        product_code: '',
        description: '',
        subcategory: '',
        stock_quantity: 0,
        reorder_level: 10,
        cost_price: 0,
        sale_price: 0,
        category: 'Tech',
    });

    useEffect(() => {
        if (initialData) {
            const normalizedCategory = normalizeProductCategory(initialData.category) || 'Tech';
            const subcategories = getSubcategoriesForCategory(normalizedCategory);
            setFormData({
                ...initialData,
                category: normalizedCategory,
                subcategory: initialData.subcategory || subcategories[0]?.value || '',
                cost_price: initialData.cost_price ?? 0,
                sale_price: initialData.sale_price ?? initialData.unit_price ?? 0,
            });
        } else {
            const defaultCategory = 'Tech';
            const defaultSubcategory = getSubcategoriesForCategory(defaultCategory)[0]?.value || '';
            const defaultProduct = getProductsForCategoryAndSubcategory(defaultCategory, defaultSubcategory)[0] || '';
            setFormData({
                name: defaultProduct,
                product_code: getNextProductCode ? getNextProductCode(defaultCategory) : '',
                description: '',
                subcategory: defaultSubcategory,
                stock_quantity: 0,
                reorder_level: 10,
                cost_price: 0,
                sale_price: 0,
                category: defaultCategory,
            });
        }
    }, [initialData, isOpen, getNextProductCode]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;

        if (name === 'category' && !isEditing) {
            const normalizedCategory = normalizeProductCategory(value) || 'Tech';
            const firstSubcategory = getSubcategoriesForCategory(normalizedCategory)[0]?.value || '';
            const firstProduct = getProductsForCategoryAndSubcategory(normalizedCategory, firstSubcategory)[0] || '';
            setFormData((prev) => ({
                ...prev,
                name: firstProduct || prev.name,
                category: normalizedCategory,
                subcategory: firstSubcategory,
                product_code: getNextProductCode ? getNextProductCode(normalizedCategory) : prev.product_code,
            }));
            return;
        }

        if (name === 'subcategory' && !isEditing) {
            const currentCategory = formData.category || 'Tech';
            const firstProduct = getProductsForCategoryAndSubcategory(currentCategory, value)[0] || '';
            setFormData((prev) => ({
                ...prev,
                subcategory: value,
                name: firstProduct || prev.name,
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
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-primary">
                            {isEditing ? 'Edit Product' : 'Add New Product'}
                        </Dialog.Title>
                        <button onClick={onClose} disabled={submitting} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 disabled:opacity-50">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    list="catalog-product-names"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="Choose an exact product name"
                                />
                                <datalist id="catalog-product-names">
                                    {getProductsForCategoryAndSubcategory(formData.category, formData.subcategory).map((productName) => (
                                        <option key={productName} value={productName} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Code</label>
                                <input
                                    type="text"
                                    name="product_code"
                                    required
                                    value={formData.product_code}
                                    onChange={handleChange}
                                    readOnly={!isEditing}
                                    className={`w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${!isEditing ? 'bg-gray-50 text-gray-600' : ''}`}
                                    placeholder="Auto-generated from category"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="Brief product description..."
                                ></textarea>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Rs)</label>
                                <input
                                    type="number"
                                    name="cost_price"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.cost_price}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (Rs)</label>
                                <input
                                    type="number"
                                    name="sale_price"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.sale_price}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                                >
                                    {PRODUCT_CATEGORIES.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
                                <select
                                    name="subcategory"
                                    value={formData.subcategory}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                                >
                                    <option value="" disabled>Select a sub category...</option>
                                    {getSubcategoriesForCategory(formData.category).map((option) => (
                                        <option key={option.value} value={option.value}>{option.value}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                                <input
                                    type="number"
                                    name="stock_quantity"
                                    min="0"
                                    required
                                    value={formData.stock_quantity}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                                <input
                                    type="number"
                                    name="reorder_level"
                                    min="0"
                                    required
                                    value={formData.reorder_level}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

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
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
