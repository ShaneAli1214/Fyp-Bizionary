import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import ProductForm from './ProductForm';
import { PRODUCT_CATEGORIES, getCategoryPrefix, normalizeProductCategory } from '../../utils/productCategories';

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await api.get('products/');
            // Support DRF pagination (`results`) or custom `{data: [...]}` shapes
            const productsPayload = res.data?.results || res.data?.data || res.data || [];
            setProducts(productsPayload);
        } catch (error) {
            console.warn('Failed to fetch products from backend.');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

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

    const handleCreateOrUpdate = async (productData) => {
        setSubmitting(true);
        setFormError('');
        setFormSuccess('');
        try {
            const normalizedCategory = normalizeProductCategory(productData.category) || 'Tech';
            const payload = {
                ...productData,
                category: normalizedCategory,
                product_code: productData.product_code,
            };

            if (!currentProduct && !payload.product_code) {
                payload.product_code = getNextProductCode(normalizedCategory);
            }

            if (currentProduct) {
                await api.put(`products/${currentProduct.id}/`, payload);
                setFormSuccess('Product updated successfully.');
            } else {
                await api.post('products/', payload);
                setFormSuccess('Product created successfully.');
            }
            await fetchProducts();
            setIsFormOpen(false);
            setCurrentProduct(null);
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to save product.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`products/${id}/`);
            await fetchProducts();
            setFormSuccess('Product deleted successfully.');
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to delete product.'));
        }
    };

    const openEditForm = (item) => {
        setFormError('');
        setCurrentProduct(item);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setFormError('');
        setCurrentProduct(null);
        setIsFormOpen(true);
    };

    const getNextProductCode = (category) => {
        const normalizedCategory = normalizeProductCategory(category);
        const prefix = getCategoryPrefix(normalizedCategory);
        if (!prefix) {
            return '';
        }

        const maxNumber = products.reduce((max, item) => {
            const itemCategory = normalizeProductCategory(item.category);
            if (itemCategory !== normalizedCategory) {
                return max;
            }

            const code = item.product_code || '';
            const match = code.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
            if (!match) {
                return max;
            }

            return Math.max(max, Number(match[1]));
        }, 0);

        return `${prefix}${maxNumber + 1}`;
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.product_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const productsByCategory = PRODUCT_CATEGORIES.map((categoryItem) => ({
        ...categoryItem,
        items: filteredProducts.filter((p) => normalizeProductCategory(p.category) === categoryItem.value),
    }));

    const noResults = filteredProducts.length === 0;

    return (
        <div className="space-y-6">

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-surface shadow-sm text-textMain placeholder-textMuted"
                        placeholder="Search by product name or product code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={openAddForm}
                        className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primaryDark text-sm font-bold transition-all shadow-md shadow-primary/20 w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                    </button>
                </div>

            </div>

            {formSuccess && (
                <div className="px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 text-sm font-medium">
                    {formSuccess}
                </div>
            )}
            {formError && (
                <div className="px-4 py-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 text-sm font-medium">
                    {formError}
                </div>
            )}

            {loading ? (
                <div className="bg-surface rounded-3xl border border-gray-100 shadow-sm h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="space-y-5">
                    {productsByCategory.map((section) => (
                        <div key={section.value} className="bg-surface rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                                <h3 className="text-base font-bold text-textMain">{section.label} Section</h3>
                                <span className="text-xs font-semibold text-textMuted bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {section.items.length} item(s)
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white text-textMuted text-xs uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Product Code</th>
                                            <th className="px-6 py-4 font-semibold">Product Name</th>
                                            <th className="px-6 py-4 font-semibold text-right">Unit Price</th>
                                            <th className="px-6 py-4 font-semibold text-center">Stock</th>
                                            <th className="px-6 py-4 font-semibold text-center">Reorder Lvl</th>
                                            <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {section.items.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-textMuted">
                                                    No products in this section.
                                                </td>
                                            </tr>
                                        ) : section.items.map((p) => {
                                            const isLowStock = p.stock_quantity <= p.reorder_level;
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-textMuted font-mono text-xs">{p.product_code}</td>
                                                    <td className="px-6 py-4 font-bold text-textMain">
                                                        <div>{p.name}</div>
                                                        <div className="text-[11px] font-medium text-textMuted mt-0.5">{p.subcategory || section.label}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-textMain text-right">{formatPKR(p.unit_price)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${isLowStock ? 'bg-red-50 text-danger border border-red-100' : 'bg-green-50 text-success border border-green-100'}`}>
                                                            {p.stock_quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-textMuted font-medium">{p.reorder_level}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button
                                                                onClick={() => openEditForm(p)}
                                                                className="text-gray-400 hover:text-primary transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(p.id)}
                                                                className="text-gray-400 hover:text-danger hover:fill-danger/10 transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {noResults && (
                        <div className="bg-surface rounded-3xl border border-gray-100 shadow-sm px-6 py-12 text-center text-textMuted">
                            <Search className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <p>No products found matching your search.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Slide-over or Modal for Form */}
            <ProductForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreateOrUpdate}
                initialData={currentProduct}
                submitting={submitting}
                errorMessage={formError}
                getNextProductCode={getNextProductCode}
            />
        </div>
    );
};

export default ProductList;
