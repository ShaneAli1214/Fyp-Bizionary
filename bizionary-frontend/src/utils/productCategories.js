/**
 * productCategories.js
 *
 * IMPORTANT: This file is a STATIC FALLBACK only.
 * All UI components now fetch categories dynamically from:
 *   GET /api/purchases/categories/
 * via the `useCategories` hook (src/hooks/useCategories.js).
 *
 * The values here must match what is actually stored in the database
 * (products.Product.category, purchases.SupplierCompany.category).
 * Do NOT add entries here that don't exist in the database.
 *
 * Current real DB product category values (as of audit):
 *   'Books', 'Clothing & Textiles', 'Electronics & Appliances',
 *   'Grocery & Food Items', 'Pharmaceuticals & Health',
 *   'Skin Products', 'Sports', 'Stationery & Office Supplies'
 */

export const PRODUCT_CATEGORIES = [
    { value: 'Grocery & Food Items', label: 'Grocery & Food Items', prefix: 'GR' },
    { value: 'Clothing & Textiles', label: 'Clothing & Textiles', prefix: 'CL' },
    { value: 'Stationery & Office Supplies', label: 'Stationery & Office Supplies', prefix: 'SA' },
    { value: 'Pharmaceuticals & Health', label: 'Pharmaceuticals & Health', prefix: 'MA' },
    { value: 'Books', label: 'Books', prefix: 'BK' },
    { value: 'Sports', label: 'Sports', prefix: 'SP' },
    { value: 'Skin Products', label: 'Skin Products', prefix: 'SK' },
];

export const CATEGORY_COMPANIES = {};

export const normalizeProductCategory = (category) => {
    if (!category) return '';
    const raw = String(category).trim();
    const rawLower = raw.toLowerCase();

    // Exact match first (case-insensitive)
    const exactMatch = PRODUCT_CATEGORIES.find((item) => item.value.toLowerCase() === rawLower);
    if (exactMatch) return exactMatch.value;

    // Legacy key mappings (for backward compat with old code that used 'Tech', 'Clothing', etc.)
    const LEGACY_MAP = {
        'tech': 'Electronics & Appliances',
        'electronics': 'Electronics & Appliances',
        'grocery': 'Grocery & Food Items',
        'clothing': 'Clothing & Textiles',
        'stationary': 'Stationery & Office Supplies',
        'stationery': 'Stationery & Office Supplies',
        'medicines': 'Pharmaceuticals & Health',
        'pharma': 'Pharmaceuticals & Health',
        'books': 'Books',
        'sports': 'Sports',
        'skin-products': 'Skin Products',
        'skin products': 'Skin Products',
        'skinproducts': 'Skin Products',
    };
    if (LEGACY_MAP[rawLower]) return LEGACY_MAP[rawLower];

    // Keyword heuristics as last resort
    if (rawLower.includes('electronic') || rawLower.includes('appliance') || rawLower.includes('mobile') || rawLower.includes('laptop') || rawLower.includes('tv') || rawLower.includes('computer')) return 'Electronics & Appliances';
    if (rawLower.includes('grocery') || rawLower.includes('food') || rawLower.includes('rice') || rawLower.includes('atta') || rawLower.includes('fmcg') || rawLower.includes('dairy') || rawLower.includes('frozen')) return 'Grocery & Food Items';
    if (rawLower.includes('cloth') || rawLower.includes('textile') || rawLower.includes('garment') || rawLower.includes('fashion')) return 'Clothing & Textiles';
    if (rawLower.includes('station') || rawLower.includes('office') || rawLower.includes('paper')) return 'Stationery & Office Supplies';
    if (rawLower.includes('pharma') || rawLower.includes('medic') || rawLower.includes('health')) return 'Pharmaceuticals & Health';
    if (rawLower.includes('book') || rawLower.includes('novel') || rawLower.includes('textbook')) return 'Books';
    if (rawLower.includes('sport') || rawLower.includes('cricket') || rawLower.includes('gym')) return 'Sports';
    if (rawLower.includes('skin') || rawLower.includes('cosmet') || rawLower.includes('beauty')) return 'Skin Products';

    // If nothing matches, return the raw value so new categories from DB pass through cleanly
    return raw;
};

export const getCategoryPrefix = (category) => {
    const normalized = normalizeProductCategory(category);
    const match = PRODUCT_CATEGORIES.find((item) => item.value === normalized);
    if (match) return match.prefix;
    // Generate a prefix from the first 2 uppercase letters for unknown categories
    return String(normalized || category || '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'XX';
};

export const getCategoryLabel = (category) => {
    if (!category) return '';
    const normalized = normalizeProductCategory(category);
    const match = PRODUCT_CATEGORIES.find((item) => item.value === normalized);
    return match?.label || normalized || category;
};

export const getCompanyForCategory = (category) => '';
export const getCompaniesForCategory = (category) => [];
export const getCompanyEmail = (category, companyName) => '';
