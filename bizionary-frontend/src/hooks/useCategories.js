/**
 * useCategories – fetches all product/supplier categories live from the backend API.
 *
 * The backend endpoint (GET /api/purchases/categories/) aggregates:
 *   - products.Product.category
 *   - purchases.SupplierCompany.category
 *   - screen_2_sales_items.items_management.Category (user-created)
 *
 * Usage:
 *   const { categories, loading, refetch } = useCategories();
 *
 * Each entry: { value: string, label: string }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const CACHE_KEY = '__categories_cache__';
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Simple in-memory cache so multiple simultaneous consumers share one fetch.
 */
let _cache = null;
let _cacheTime = 0;
const _listeners = new Set();

function notifyListeners() {
    _listeners.forEach((fn) => fn());
}

async function fetchCategoriesFromAPI() {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL_MS) {
        return _cache;
    }

    try {
        const res = await api.get('purchases/categories/');
        const data = res.data || [];
        _cache = Array.isArray(data) ? data : [];
        _cacheTime = Date.now();
        notifyListeners();
        return _cache;
    } catch (err) {
        console.warn('[useCategories] Failed to fetch categories from API:', err?.message);
        return _cache || [];
    }
}

export function invalidateCategoriesCache() {
    _cache = null;
    _cacheTime = 0;
    notifyListeners();
}

export function useCategories() {
    const [categories, setCategories] = useState(_cache || []);
    const [loading, setLoading] = useState(!_cache);
    const mounted = useRef(true);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await fetchCategoriesFromAPI();
        if (mounted.current) {
            setCategories(data);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        mounted.current = true;

        // Subscribe to cache invalidation
        _listeners.add(load);

        load();

        // Listen for category / company creation events dispatched by OrderSlipForm
        const handleCategoryCreated = () => {
            invalidateCategoriesCache();
            load();
        };
        window.addEventListener('categoryCreated', handleCategoryCreated);
        window.addEventListener('companyCreated', handleCategoryCreated);

        return () => {
            mounted.current = false;
            _listeners.delete(load);
            window.removeEventListener('categoryCreated', handleCategoryCreated);
            window.removeEventListener('companyCreated', handleCategoryCreated);
        };
    }, [load]);

    return {
        categories,
        loading,
        refetch: () => {
            invalidateCategoriesCache();
            load();
        },
        /**
         * Delete a category by value. Only works for categories with no products.
         * Returns { ok: true } on success or { ok: false, error: string } on failure.
         */
        deleteCategory: async (categoryValue) => {
            try {
                await api.delete(`purchases/categories/delete/?name=${encodeURIComponent(categoryValue)}`);
                invalidateCategoriesCache();
                load();
                return { ok: true };
            } catch (err) {
                const msg = err?.response?.data?.error || 'Failed to delete category.';
                return { ok: false, error: msg };
            }
        },
    };
}

export default useCategories;
