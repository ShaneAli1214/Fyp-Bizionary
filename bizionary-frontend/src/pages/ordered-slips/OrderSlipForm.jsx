import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import api from '../../services/api';
import { normalizeProductCategory, getCompaniesForCategory } from '../../utils/productCategories';
import { getSubcategoriesForCategory } from '../../utils/productCatalog';
import useCategories from '../../hooks/useCategories';

const CREATE_NEW_VALUE = '__create_new__';
const REGISTER_NEW_COMPANY_VALUE = '__register_new_company__';

const flattenCompanyOptions = (companiesByCategory = {}) => Object.values(companiesByCategory).flat();

const normalizeLooseCategory = (category) => String(category || '').trim().toLowerCase();

const normalizeCategoryKey = (category) => String(category || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatCategoryLabel = (category) => String(category || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const companyMatchesCategory = (companyCategory, categoryValue) => {
    const companyRaw = String(companyCategory || '').trim();
    if (!companyRaw) {
        return true;
    }

    return normalizeProductCategory(companyRaw) === categoryValue || normalizeLooseCategory(companyRaw) === normalizeLooseCategory(categoryValue);
};

const companyMatchesCategoryId = (company, categoryValue) => {
    const companyCat = company?.categoryId || company?.category || '';
    if (!companyCat) {
        return true;
    }

    const normCompany = normalizeProductCategory(companyCat);
    const normSelected = normalizeProductCategory(categoryValue);

    if (normCompany && normSelected) {
        return normCompany === normSelected;
    }

    return normalizeCategoryKey(companyCat) === normalizeCategoryKey(categoryValue);
};

const getMergedCompaniesForCategory = (categoryValue, registeredCompanies = []) => mergeUniqueCompanies(
    [...getCompaniesForCategory(categoryValue), ...flattenCompanyOptions(registeredCompanies).filter((company) => companyMatchesCategoryId(company, categoryValue))],
    []
);

const mergeUniqueCompanies = (baseCompanies, customCompanies = []) => {
    const seen = new Set();
    return [...baseCompanies, ...customCompanies].filter((company) => {
        const key = `${company.name}|${company.category || ''}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

const OrderSlipForm = ({ isOpen, onClose, onSubmit, onCompanySaved, submitting = false, errorMessage = '', title = 'Generate Order Slip', submitLabel = 'Generate Slip', initialMode = 'existing', prefill = null }) => {
    const [products, setProducts] = useState([]);
    const [registeredCompanies, setRegisteredCompanies] = useState([]);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [isSavingCompany, setIsSavingCompany] = useState(false);
    const [companyError, setCompanyError] = useState('');
    const [companyContactError, setCompanyContactError] = useState('');
    const defaultTechCompany = getCompaniesForCategory('Tech')[0]?.name || '';
    const [formData, setFormData] = useState({
        product: '',
        company_name: defaultTechCompany,
        quantity_ordered: 1,
        notes: '',
        delivery_location: 'WAREHOUSE',
    });
    const [selectedCategory, setSelectedCategory] = useState('Tech');
    const [customData, setCustomData] = useState({
        category: 'Tech',
        category_mode: 'existing',
        custom_category: '',
        subcategory: getSubcategoriesForCategory('Tech')[0]?.value || '',
        subcategory_mode: 'existing',
        custom_subcategory: '',
        product_name: '',
        company_name: defaultTechCompany,
        company_mode: 'existing',
        company_contact_number: '',
        quantity_ordered: 1,
        cost_price: '',
        sale_price: '',
        notes: '',
        delivery_location: 'WAREHOUSE',
    });

    const { categories: apiCategories } = useCategories();

    // Build category options from the live API list.
    // Merge with any categories seen on currently loaded products (belt-and-suspenders).
    const categoryOptions = useMemo(() => {
        // Start from the dynamic API list (this includes 'books', 'sports', 'skin-products', etc.)
        const apiMap = new Map(apiCategories.map((c) => [c.value.toLowerCase(), c]));

        // Also add any categories that appear on products already loaded (in case they lag)
        products.forEach((item) => {
            const raw = String(item.categoryId || item.category || '').trim();
            if (raw && !apiMap.has(raw.toLowerCase())) {
                apiMap.set(raw.toLowerCase(), { value: raw, label: raw.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) });
            }
        });

        return Array.from(apiMap.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [apiCategories, products]);

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

        const fetchCompanies = async () => {
            try {
                const res = await api.get('purchases/companies/');
                const companiesPayload = res.data?.results || res.data?.data || res.data || [];
                setRegisteredCompanies(companiesPayload.map((company) => ({
                    ...company,
                    categoryId: normalizeCategoryKey(company.categoryId || company.category || ''),
                })));
            } catch (error) {
                setRegisteredCompanies([]);
            }
        };

        // expose fetch functions for later use
        window.__orderSlipFetchProducts = fetchProducts;
        window.__orderSlipFetchCompanies = fetchCompanies;

        if (isOpen) {
            fetchProducts();
            fetchCompanies();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!prefill?.product_id || products.length === 0) return;
        const target = products.find((p) => p.id === Number(prefill.product_id));
        if (!target) return;
        const cat = normalizeProductCategory(target.category) || 'Tech';
        setSelectedCategory(cat);
        setFormData((prev) => ({
            ...prev,
            product: String(target.id),
            quantity_ordered: Number(prefill.quantity_ordered || prefill.quantity || 1),
        }));
    }, [products, prefill?.product_id, prefill?.quantity_ordered, prefill?.quantity]);

    useEffect(() => {
        const defaultCategory = 'Tech';
        const defaultCompanies = getCompaniesForCategory(defaultCategory);
        const defaultCompanyName = defaultCompanies[0]?.name || '';
        setSelectedCategory(defaultCategory);
        setIsCustomMode(initialMode === 'custom');
        setCompanyError('');
        setCompanyContactError('');
        setFormData({
            product: '',
            company_name: defaultCompanyName,
            quantity_ordered: 1,
            notes: '',
            delivery_location: 'WAREHOUSE',
        });
        setCustomData({
            category: defaultCategory,
            category_mode: 'existing',
            custom_category: '',
            subcategory: getSubcategoriesForCategory(defaultCategory)[0]?.value || '',
            subcategory_mode: 'existing',
            custom_subcategory: '',
            product_name: '',
            company_name: defaultCompanyName,
            company_mode: 'existing',
            company_contact_number: '',
            quantity_ordered: 1,
            cost_price: '',
            sale_price: '',
            notes: '',
            delivery_location: 'WAREHOUSE',
        });
    }, [isOpen, initialMode]);

    const availableProducts = useMemo(
        () => products.filter((item) => normalizeCategoryKey(item.categoryId || item.category || '') === normalizeCategoryKey(selectedCategory) || normalizeProductCategory(item.category) === selectedCategory || String(item.category || '').trim() === selectedCategory),
        [products, selectedCategory]
    );

    const selectedProduct = availableProducts.find((item) => item.id === Number(formData.product));
    const selectedUnitCost = Number(selectedProduct?.cost_price || 0);
    const totalAmount = Number(formData.quantity_ordered || 0) * selectedUnitCost;
    const customResolvedCategory = customData.category_mode === 'create' ? customData.custom_category : customData.category;
    const effectiveCustomCategory = customResolvedCategory || customData.category;
    const selectedCompanyOptions = getMergedCompaniesForCategory(selectedCategory, registeredCompanies);
    const customSubcategories = customData.category_mode === 'existing' ? getSubcategoriesForCategory(effectiveCustomCategory) : [];
    const customCompanyOptions = getMergedCompaniesForCategory(effectiveCustomCategory, registeredCompanies);
    const customQuantity = Number(customData.quantity_ordered || 0);
    const customCostPrice = Number(customData.cost_price || 0);
    const customTotalAmount = customQuantity * customCostPrice;

    useEffect(() => {
        if (!isCustomMode) return;

        if (customCompanyOptions.length === 0) {
            setCustomData((prev) => {
                if (prev.company_mode !== 'create') {
                    return {
                        ...prev,
                        company_mode: 'create',
                        company_name: '',
                    };
                }
                return prev;
            });
        } else {
            setCustomData((prev) => {
                if (prev.company_mode === 'existing') {
                    const isValidCompany = customCompanyOptions.some(c => c.name === prev.company_name);
                    if (!prev.company_name || !isValidCompany) {
                        return {
                            ...prev,
                            company_name: customCompanyOptions[0]?.name || '',
                        };
                    }
                }
                return prev;
            });
        }
    }, [isCustomMode, effectiveCustomCategory, customCompanyOptions.length]);

    // Listen for external events to refresh companies and categories when created elsewhere
    useEffect(() => {
        const handleCompanyCreated = (event) => {
            if (typeof window.__orderSlipFetchCompanies === 'function') {
                window.__orderSlipFetchCompanies();
            }
        };
        const handleCategoryCreated = (event) => {
            if (typeof window.__orderSlipFetchProducts === 'function') {
                window.__orderSlipFetchProducts();
            }
        };
        window.addEventListener('companyCreated', handleCompanyCreated);
        window.addEventListener('categoryCreated', handleCategoryCreated);
        return () => {
            window.removeEventListener('companyCreated', handleCompanyCreated);
            window.removeEventListener('categoryCreated', handleCategoryCreated);
        };
    }, []);

    const resetCustomSelectionForCategory = (categoryValue) => {
        const nextCompanies = getMergedCompaniesForCategory(categoryValue, registeredCompanies);

        setCustomData((prev) => ({
            ...prev,
            category: categoryValue,
            category_mode: 'existing',
            custom_category: '',
            subcategory: getSubcategoriesForCategory(categoryValue)[0]?.value || '',
            subcategory_mode: 'existing',
            custom_subcategory: '',
            company_name: nextCompanies[0]?.name || '',
            company_mode: 'existing',
            company_contact_number: '',
        }));
    };

    const handleChange = (event) => {
        const { name, value, type } = event.target;

        if (isCustomMode) {
            if (name === 'custom_category_select') {
                if (value === CREATE_NEW_VALUE) {
                    setCustomData((prev) => ({
                        ...prev,
                        category_mode: 'create',
                        custom_category: '',
                        subcategory_mode: 'create',
                        subcategory: '',
                        custom_subcategory: '',
                        company_name: '',
                        company_mode: 'existing',
                        company_contact_number: '',
                    }));
                    return;
                }

                resetCustomSelectionForCategory(value);
                return;
            }

            if (name === 'custom_category_name') {
                setCustomData((prev) => ({
                    ...prev,
                    custom_category: value,
                }));
                return;
            }

            if (name === 'custom_subcategory_select') {
                if (value === CREATE_NEW_VALUE) {
                    setCustomData((prev) => ({
                        ...prev,
                        subcategory_mode: 'create',
                        custom_subcategory: '',
                    }));
                    return;
                }

                setCustomData((prev) => ({
                    ...prev,
                    subcategory: value,
                    subcategory_mode: 'existing',
                    custom_subcategory: '',
                }));
                return;
            }

            if (name === 'custom_subcategory_name') {
                setCustomData((prev) => ({
                    ...prev,
                    custom_subcategory: value,
                }));
                return;
            }

            if (name === 'custom_company_select') {
                if (value === REGISTER_NEW_COMPANY_VALUE) {
                    setCustomData((prev) => ({
                        ...prev,
                        company_mode: 'create',
                        company_name: '',
                    }));
                    setCompanyError('');
                    return;
                }

                setCustomData((prev) => ({
                    ...prev,
                    company_name: value,
                    company_mode: 'existing',
                    company_contact_number: '',
                }));
                setCompanyError('');
                return;
            }

            if (name === 'custom_company_name') {
                setCustomData((prev) => ({
                    ...prev,
                    company_name: value,
                    company_mode: 'create',
                }));
                setCompanyError('');
                return;
            }

            if (name === 'company_contact_number') {
                setCustomData((prev) => ({
                    ...prev,
                    company_contact_number: value,
                }));
                setCompanyContactError('');
                return;
            }

            setCustomData((prev) => ({
                ...prev,
                [name]: type === 'number' ? Number(value) : value,
            }));
            return;
        }

        if (name === 'category') {
            const categoryCompanies = getMergedCompaniesForCategory(value, registeredCompanies);
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

    const handleRegisterCompany = async () => {
        if (!customData.company_name.trim()) {
            setCompanyError('Enter a company name before registering.');
            return;
        }

        const contactValue = String(customData.company_contact_number || '').trim();
        const normalizedContact = contactValue.replace(/[\s-]/g, '');
        const phonePattern = /^\+?[0-9\s-]+$/;

        if (!phonePattern.test(contactValue) || normalizedContact.replace(/\D/g, '').length < 10) {
            setCompanyContactError('Please enter a valid phone number');
            return;
        }

        try {
            setIsSavingCompany(true);
            setCompanyError('');
            setCompanyContactError('');

            const response = await api.post('purchases/companies/', {
                name: customData.company_name.trim(),
                category: customResolvedCategory || customData.category,
                categoryId: normalizeCategoryKey(customResolvedCategory || customData.category),
                contact_number: contactValue,
            });

            const savedCompany = {
                ...(response.data || {}),
                categoryId: normalizeCategoryKey((response.data || {})?.categoryId || (response.data || {})?.category || customResolvedCategory || customData.category),
            };
            setRegisteredCompanies((prev) => mergeUniqueCompanies(prev, [savedCompany]));
            if (typeof onCompanySaved === 'function') {
                onCompanySaved(savedCompany);
            }
            // Dispatch event so other components can update
            window.dispatchEvent(new CustomEvent('companyCreated', { detail: savedCompany }));
            // Also trigger inventory refresh
            window.dispatchEvent(new CustomEvent('inventoryRefreshRequested'));

            setCustomData((prev) => ({
                ...prev,
                company_name: savedCompany.name || prev.company_name,
                company_mode: 'existing',
                company_contact_number: '',
            }));
        } catch (error) {
            const message = error?.response?.data?.detail || error?.response?.data?.name?.[0] || 'Failed to register company.';
            setCompanyError(message);
        } finally {
            setIsSavingCompany(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // If custom mode and a new category is being created, POST it to the backend
        if (isCustomMode && customData.category_mode === 'create') {
            try {
                const newCategoryPayload = {
                    name: customResolvedCategory,
                    description: customData.custom_category || 'User created category',
                };
                const categoryResponse = await api.post('screen2/items/categories/', newCategoryPayload);
                // Notify other components to refresh category lists
                window.dispatchEvent(new CustomEvent('categoryCreated', { detail: categoryResponse.data }));
                // Also trigger inventory refresh
                window.dispatchEvent(new CustomEvent('inventoryRefreshRequested'));
                // Refresh product list to include any new category-dependent products
                if (typeof window.__orderSlipFetchProducts === 'function') {
                    window.__orderSlipFetchProducts();
                }
            } catch (error) {
                console.error('Failed to create category', error);
                // Abort submission on error
                return;
            }
        }

        if (isCustomMode) {
            onSubmit({
                mode: 'custom',
                company_name: customData.company_name,
                company_mode: customData.company_mode,
                categoryId: customResolvedCategory,
                categoryKey: normalizeCategoryKey(customResolvedCategory),
                quantity_ordered: Number(customData.quantity_ordered || 0),
                unit_cost: customCostPrice,
                notes: customData.notes,
                delivery_location: customData.delivery_location,
                custom_product: {
                    category: customResolvedCategory,
                    categoryId: normalizeCategoryKey(customResolvedCategory),
                    subcategory: customData.subcategory_mode === 'create' ? customData.custom_subcategory : customData.subcategory,
                    product_name: customData.product_name,
                    quantity_ordered: Number(customData.quantity_ordered || 0),
                    cost_price: customCostPrice,
                    sale_price: Number(customData.sale_price || 0),
                    salePrice: Number(customData.sale_price || 0),
                    company_name: customData.company_name,
                    company_mode: customData.company_mode,
                    company_contact_number: customData.company_contact_number,
                    notes: customData.notes,
                },
            });
            return;
        }

        if (!selectedProduct) {
            return;
        }

        onSubmit({
            mode: 'existing',
            product: selectedProduct.id,
            company_name: formData.company_name,
            quantity_ordered: Number(formData.quantity_ordered || 0),
            unit_cost: selectedUnitCost,
            notes: formData.notes,
            delivery_location: formData.delivery_location,
        });
    };

    return (
        <Dialog open={isOpen} onClose={submitting ? () => {} : onClose} className="relative z-50">
            <div className="fixed inset-0 bg-primary/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-3xl h-fit max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl border border-card">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-primary">{title}</Dialog.Title>
                        <button onClick={onClose} disabled={submitting} className="p-2 text-secondary hover:text-secondary rounded-full hover:bg-page disabled:opacity-50">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isCustomMode ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Product Category</label>
                                <select
                                    name="category"
                                    required
                                    value={selectedCategory}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-card"
                                >
                                    {categoryOptions.map((category) => (
                                        <option key={category.value} value={category.value}>{category.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Company</label>
                                <select
                                    name="company_name"
                                    required
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-card"
                                >
                                    {selectedCompanyOptions.map((company) => (
                                        <option key={company.name} value={company.name}>{company.name}</option>
                                    ))}
                                </select>
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
                                    {availableProducts.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.product_code || product.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-primary mb-1">Unit Price</label>
                                    <div className="w-full rounded-lg border border-card bg-page px-3 py-2.5 text-sm font-semibold text-primary">
                                        {selectedProduct ? `Rs ${selectedUnitCost.toLocaleString()}` : 'Select a product'}
                                    </div>
                                </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Quantity to Order</label>
                                <input
                                    type="number"
                                    name="quantity_ordered"
                                    min="1"
                                    required
                                    value={formData.quantity_ordered}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-primary mb-1">Delivery Destination</label>
                                <select
                                    name="delivery_location"
                                    required
                                    value={formData.delivery_location}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-card"
                                >
                                    <option value="WAREHOUSE">Warehouse</option>
                                    <option value="SHOP">Direct to Shop</option>
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-primary mb-1">Notes</label>
                                <textarea
                                    name="notes"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="w-full border border-card rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="Optional order instructions..."
                                />
                            </div>
                        </div>

                        ) : (
                        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-card bg-page p-4 md:grid-cols-2">
                            <div className="grid grid-cols-2 gap-6 md:col-span-2">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-primary mb-1">Category</label>
                                    <select
                                        name="custom_category_select"
                                        required
                                        value={customData.category_mode === 'create' ? CREATE_NEW_VALUE : customData.category}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                    >
                                        {categoryOptions.map((category) => (
                                            <option key={category.value} value={category.value}>{category.label}</option>
                                        ))}
                                        <option value={CREATE_NEW_VALUE}>+ Create New</option>
                                    </select>
                                </div>

                                {customData.category_mode === 'create' && (
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-primary mb-1">New Category Name</label>
                                        <input
                                            type="text"
                                            name="custom_category_name"
                                            required
                                            value={customData.custom_category}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                            placeholder="Type a new category"
                                        />
                                    </div>
                                )}

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-primary mb-1">Sub-category</label>
                                    <select
                                        name="custom_subcategory_select"
                                        required
                                        value={customData.subcategory_mode === 'create' ? CREATE_NEW_VALUE : customData.subcategory}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                    >
                                        {customSubcategories.length > 0 ? (
                                            customSubcategories.map((subcategory) => (
                                                <option key={subcategory.value} value={subcategory.value}>{subcategory.value}</option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No sub-categories available</option>
                                        )}
                                        <option value={CREATE_NEW_VALUE}>+ Create New</option>
                                    </select>
                                </div>

                                {customData.subcategory_mode === 'create' && (
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-primary mb-1">New Sub-category Name</label>
                                        <input
                                            type="text"
                                            name="custom_subcategory_name"
                                            required
                                            value={customData.custom_subcategory}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                            placeholder="Type a new sub-category"
                                        />
                                    </div>
                                )}

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-primary mb-1">Product Name</label>
                                    <input
                                        type="text"
                                        name="product_name"
                                        required
                                        value={customData.product_name}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                        placeholder="Enter custom product name"
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-primary mb-1">Company / Supplier</label>
                                    <select
                                        name="custom_company_select"
                                        required
                                        value={customData.company_mode === 'create' ? REGISTER_NEW_COMPANY_VALUE : customData.company_name}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="" disabled>Select a company...</option>
                                        {customCompanyOptions.map((company) => (
                                            <option key={`${company.name}-${company.category || ''}`} value={company.name}>{company.name}</option>
                                        ))}
                                        <option value={REGISTER_NEW_COMPANY_VALUE}>+ Register New Company</option>
                                    </select>
                                </div>

                                {customData.company_mode === 'create' && (
                                    <div className="col-span-2 rounded-2xl border border-dashed border-primary/20 bg-card p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-sm font-medium text-primary mb-1">Company Name</label>
                                                <input
                                                    type="text"
                                                    name="custom_company_name"
                                                    required
                                                    value={customData.company_name}
                                                    onChange={handleChange}
                                                    className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                                    placeholder="Enter company name"
                                                />
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-sm font-medium text-primary mb-1">Contact Number</label>
                                                <input
                                                    type="text"
                                                    name="company_contact_number"
                                                    value={customData.company_contact_number}
                                                    onChange={handleChange}
                                                    className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                                    placeholder="e.g. 0300-1234567"
                                                />
                                                {companyContactError && (
                                                    <div className="mt-2 text-sm text-status-info">
                                                        {companyContactError}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={handleRegisterCompany}
                                                disabled={isSavingCompany}
                                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isSavingCompany ? 'Registering...' : 'Save Company'}
                                            </button>
                                        </div>
                                        {companyError && (
                                            <div className="mt-3 rounded-lg border border-rose-100 bg-status-info/10 px-3 py-2 text-sm text-status-info">
                                                {companyError}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-primary mb-1">Quantity to Order</label>
                                    <input
                                        type="number"
                                        name="quantity_ordered"
                                        min="1"
                                        required
                                        value={customData.quantity_ordered}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-primary mb-1">Cost Price</label>
                                    <input
                                        type="number"
                                        name="cost_price"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={customData.cost_price}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                        placeholder="Enter cost price"
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-primary mb-1">Sale Price</label>
                                    <input
                                        type="number"
                                        name="sale_price"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={customData.sale_price}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                        placeholder="Enter sale price"
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-primary mb-1">Delivery Destination</label>
                                    <select
                                        name="delivery_location"
                                        required
                                        value={customData.delivery_location}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="WAREHOUSE">Warehouse</option>
                                        <option value="SHOP">Direct to Shop</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-primary mb-1">Notes</label>
                                    <textarea
                                        name="notes"
                                        rows={5}
                                        value={customData.notes}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-card bg-card p-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                                        placeholder="Optional order instructions..."
                                    />
                                </div>
                            </div>
                        </div>
                        )}

                        <div className="mt-4 p-4 bg-page rounded-xl border border-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-sm font-semibold text-primary">Total Amount:</span>
                            <span className="text-xl font-bold text-danger">Rs {(isCustomMode ? customTotalAmount : totalAmount).toLocaleString()}</span>
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
                                disabled={submitting || (!isCustomMode && !selectedProduct) || (isCustomMode && (!customData.product_name.trim() || !customData.company_name.trim()))}
                                className="px-4 py-2 text-sm font-medium bg-primary rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
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