import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Upload, X } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Skeleton from '../../components/ui/Skeleton';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import ProductForm from './ProductForm';
import { getCategoryPrefix, normalizeProductCategory, getCategoryLabel } from '../../utils/productCategories';
import { normalizeProductRecord, toNumber } from '../../utils/productInventoryTransforms';
import { useAuth } from '../../context/AuthContext';
import useCategories from '../../hooks/useCategories';
import { useDynamicColumns } from '../../hooks/useDynamicColumns';

const ProductList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdminOrManager = user && (
        user.role_level === 'ADMIN' || 
        user.role_level === 'MANAGER' || 
        user.role_name?.toLowerCase().includes('admin') || 
        user.role_name?.toLowerCase().includes('manager')
    ) && user.role_name !== 'Accountant';

    const { categories: dynamicCategories, loading: categoriesLoading, deleteCategory } = useCategories();
    const [deletingCategory, setDeletingCategory] = useState(null);
    const [products, setProducts] = useState([]);
    
    // Dynamic columns hook
    const {
        getCustomColumns,
        addColumn,
        removeColumn,
        setCustomCellValue,
        getCustomCellValue
    } = useDynamicColumns('products');
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const handleDeleteCategory = async (categoryValue, categoryLabel) => {
        if (!window.confirm(`Delete category "${categoryLabel}"?\n\nThis only removes the category record. If any products are assigned to it, deletion will be blocked.`)) return;
        setDeletingCategory(categoryValue);
        const result = await deleteCategory(categoryValue);
        setDeletingCategory(null);
        if (!result.ok) {
            setFormError(result.error);
        } else {
            setFormSuccess(`Category "${categoryLabel}" deleted.`);
            if (selectedSection === categoryValue) setSelectedSection('ALL');
        }
    };

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSection, setSelectedSection] = useState('ALL');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);

    useEffect(() => {
        fetchProducts();
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('purchases/companies/');
            const companies = res.data?.results || res.data?.data || res.data || [];
            setSupplierOptions(Array.isArray(companies) ? companies : []);
        } catch (error) {
            console.warn('Failed to fetch supplier options from backend.');
            setSupplierOptions([]);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await api.get('products/');
            // Support DRF pagination (`results`) or custom `{data: [...]}` shapes
            const productsPayload = res.data?.results || res.data?.data || res.data || [];
            setProducts(productsPayload.map((item) => normalizeProductRecord(item)));
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
            const normalizedCategory = normalizeProductCategory(productData.category) || productData.category || 'Books';
            const sellingPrice = Number(productData.sale_price ?? productData.unit_price ?? 0);
            const payload = {
                category: normalizedCategory,
                product_code: productData.product_code,
                name: productData.name,
                cost_price: Number(productData.cost_price || 0),
                sale_price: sellingPrice,   // serializer maps this → unit_price in DB
                unit_price: sellingPrice,   // belt-and-suspenders: also send unit_price directly
                supplier: productData.supplier || null,
                status: productData.status || 'ACTIVE',
            };

            if (!currentProduct && !payload.product_code) {
                payload.product_code = getNextProductCode(normalizedCategory);
            }

            if (currentProduct) {
                await api.patch(`products/${currentProduct.id}/`, payload);
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

    // Build category sections from the dynamic API-fetched list.
    // Match products to categories by exact string match (DB value) or normalized value.
    const productsByCategory = dynamicCategories.map((categoryItem) => ({
        ...categoryItem,
        items: filteredProducts.filter((p) => {
            const pCat = String(p.category || '').trim();
            return pCat === categoryItem.value ||
                normalizeProductCategory(pCat) === categoryItem.value ||
                pCat.toLowerCase() === categoryItem.value.toLowerCase();
        }),
    })).filter((section) => selectedSection === 'ALL' || section.value === selectedSection);

    const noResults = filteredProducts.length === 0;

    return (
        <div className="space-y-6">

            <PageHeader title="Products" subtitle="Manage your product catalog, pricing, and inventory levels." />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-secondary" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-card rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-surface shadow-sm text-textMain placeholder-textMuted"
                        placeholder="Search by product name or product code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {isAdminOrManager && (
                        <button
                            onClick={() => navigate('/products/bulk-upload')}
                            className="flex items-center justify-center px-5 py-2 bg-surface hover:bg-background text-textMain border border-card rounded-full text-sm font-bold transition-all shadow-sm w-full sm:w-auto cursor-pointer"
                        >
                            <Upload className="h-4 w-4 mr-2 text-primary" />
                            Bulk Products
                        </button>
                    )}
                    <button
                        onClick={openAddForm}
                        className="flex items-center justify-center px-5 py-2 bg-primary text-card rounded-full text-sm font-bold transition-all hover:opacity-85 active:scale-[0.98] shadow-sm w-full sm:w-auto cursor-pointer"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                    </button>
                </div>

            </div>

            {/* Section Filter — dynamically built from the backend API */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setSelectedSection('ALL')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                        selectedSection === 'ALL'
                            ? 'bg-primary text-card'
                            : 'bg-page text-secondary hover:bg-active-pill'
                    }`}
                >
                    All Sections
                </button>
                {categoriesLoading && dynamicCategories.length === 0 ? (
                    <span className="text-sm text-secondary px-3">Loading categories…</span>
                ) : (
                    dynamicCategories.map((category) => (
                        <div
                            key={category.value}
                            style={{ flexShrink: 0 }}
                            className={`flex items-center gap-0 rounded-full overflow-hidden text-sm font-semibold whitespace-nowrap transition-all ${
                                selectedSection === category.value
                                    ? 'bg-primary text-card'
                                    : 'bg-page text-secondary'
                            }`}
                        >
                            <button
                                onClick={() => setSelectedSection(category.value)}
                                className={`px-4 py-2 transition-all hover:opacity-85 ${
                                    selectedSection === category.value ? '' : 'hover:bg-active-pill'
                                }`}
                            >
                                {category.label}
                            </button>
                            {isAdminOrManager && (
                                <button
                                    title={`Delete category "${category.label}"`}
                                    disabled={deletingCategory === category.value}
                                    onClick={() => handleDeleteCategory(category.value, category.label)}
                                    className={`pr-3 pl-1 py-2 flex items-center transition-all ${
                                        selectedSection === category.value
                                            ? 'text-card/70 hover:text-card'
                                            : 'text-secondary/60 hover:text-rose-500'
                                    } disabled:opacity-40`}
                                >
                                    {deletingCategory === category.value ? (
                                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                                    ) : (
                                        <X className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {formSuccess && (
                <div className="px-4 py-3 rounded-xl border border-emerald-100 bg-status-success/10 text-status-success text-sm font-medium">
                    {formSuccess}
                </div>
            )}
            {formError && (
                <div className="px-4 py-3 rounded-xl border border-rose-100 bg-status-info/10 text-status-info text-sm font-medium">
                    {formError}
                </div>
            )}

            {loading ? (
                <div className="bg-bg-card rounded-2xl border border-border-card shadow-sm p-6">
                    <Skeleton.TableRows count={7} cols={5} />
                </div>
            ) : (
                <div className="space-y-5">
                    {productsByCategory.map((section) => {
                        const sectionCustomCols = getCustomColumns(section.value);
                        return (
                            <div key={section.value} className="bg-bg-card rounded-2xl border border-border-card shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-border-card flex items-center justify-between">
                                    <h3 className="text-base font-bold text-textMain">{section.label} Section</h3>
                                    <div className="flex items-center gap-3">
                                        {isAdminOrManager && (
                                            <button
                                                onClick={() => {
                                                    const colName = prompt(`Enter new column name for the ${section.label} section:`);
                                                    if (colName) {
                                                        const success = addColumn(section.value, colName);
                                                        if (!success) {
                                                            alert("Column already exists in this section!");
                                                        }
                                                    }
                                                }}
                                                className="flex items-center justify-center px-3 py-1 bg-surface hover:bg-background text-textMain border border-card rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer"
                                            >
                                                <Plus className="h-3 w-3 mr-1 text-primary" />
                                                + Column
                                            </button>
                                        )}
                                        <span className="text-xs font-semibold text-textMuted bg-page px-2.5 py-1 rounded-lg">
                                            {section.items.length} item(s)
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                        <thead className="text-text-secondary text-xs uppercase tracking-wider border-b border-border-card">
                                            <tr>
                                                        <th className="px-6 py-4 font-semibold">SKU</th>
                                                        <th className="px-6 py-4 font-semibold">Product Name</th>
                                                        <th className="px-6 py-4 font-semibold">Category</th>
                                                        {/* Brand and Unit columns removed */}
                                                        <th className="px-6 py-4 font-semibold text-right">Purchase Price</th>
                                                        <th className="px-6 py-4 font-semibold text-right">Selling Price</th>
                                                        <th className="px-6 py-4 font-semibold text-right">Profit Margin</th>
                                                        {/* Supplier column removed */}
                                                        <th className="px-6 py-4 font-semibold text-center">Shop Stock</th>
                                                        <th className="px-6 py-4 font-semibold text-center">Total Stock</th>
                                                        {sectionCustomCols.map(col => (
                                                            <th key={col} className="px-6 py-4 font-semibold text-center relative group">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {col}
                                                                    {isAdminOrManager && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (window.confirm(`Delete custom column "${col}" and all its cell data?`)) {
                                                                                    removeColumn(section.value, col);
                                                                                }
                                                                            }}
                                                                            className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 ml-1 transition-opacity cursor-pointer"
                                                                            title={`Remove column ${col}`}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </th>
                                                        ))}
                                                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-card">
                                        {section.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={10 + sectionCustomCols.length} className="px-6 py-8 text-center text-textMuted">
                                                    No products in this section.
                                                </td>
                                            </tr>
                                        ) : section.items.map((p) => {
                                            const profitMargin = toNumber(p.profit_margin, toNumber(p.sale_price) - toNumber(p.cost_price));
                                            return (
                                                <tr key={p.id} className="hover:bg-page transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-textMuted font-mono text-xs">{p.product_code || p.sku}</td>
                                                    <td className="px-6 py-4 font-bold text-textMain">
                                                        <div>{p.name}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-textMuted">{getCategoryLabel(p.category) || section.label}</td>
                                                    <td className="px-6 py-4 font-bold text-textMain text-right">{formatPKR(p.cost_price)}</td>
                                                    <td className="px-6 py-4 font-bold text-textMain text-right">{formatPKR(p.sale_price)}</td>
                                                    <td className={`px-6 py-4 font-bold text-right ${profitMargin >= 0 ? 'text-status-success' : 'text-status-info'}`}>{formatPKR(profitMargin)}</td>
                                                    {/* Supplier cell removed */}
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-semibold text-textMain">
                                                            {toNumber(p.shop_stock)}
                                                         </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-bold text-text-primary">
                                                            {toNumber(p.current_stock)}
                                                        </span>
                                                    </td>
                                                    {sectionCustomCols.map(col => {
                                                        const cellValue = getCustomCellValue(p.product_code || p.sku, col);
                                                        return (
                                                            <td key={col} className="px-6 py-4 text-center whitespace-nowrap">
                                                                <input
                                                                    type="text"
                                                                    value={cellValue}
                                                                    onChange={(e) => setCustomCellValue(p.product_code || p.sku, col, e.target.value)}
                                                                    className="w-24 text-center bg-transparent border-b border-border-card/30 hover:border-textMuted focus:border-primary focus:ring-0 outline-none text-xs text-textMain"
                                                                    placeholder="-"
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-xs font-bold ${p.status === 'INACTIVE' ? 'text-text-secondary' : 'text-status-success'}`}>
                                                            {p.status === 'INACTIVE' ? 'Inactive' : 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button
                                                                onClick={() => openEditForm(p)}
                                                                className="text-secondary hover:text-primary transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(p.id)}
                                                                className="text-secondary hover:text-danger hover:fill-danger/10 transition-colors"
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
                    )})}

                    {noResults && (
                        <div className="bg-bg-card rounded-2xl border border-border-card shadow-sm px-6 py-12 text-center text-textMuted">
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
                supplierOptions={supplierOptions}
            />
        </div>
    );
};

export default ProductList;
