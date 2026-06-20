export const PRODUCT_CATEGORIES = [
    { value: 'Tech', label: 'Electronics & Appliances', prefix: 'EL' },
    { value: 'Grocery', label: 'Grocery & Food Items', prefix: 'GR' },
    { value: 'Clothing', label: 'Clothing & Textiles', prefix: 'CL' },
    { value: 'Stationary', label: 'Stationery & Office Supplies', prefix: 'SA' },
    { value: 'Medicines', label: 'Pharmaceuticals & Health', prefix: 'MA' },
];

export const CATEGORY_COMPANIES = {
    Tech: [],
    Computers: [],
    Grocery: [],
    Clothing: [],
    Stationary: [],
    Medicines: [],
    FMCG: [],
    Beverages: [],
    Dairy: [],
    'Frozen Foods': [],
    Food: [],
    Footwear: [],
    Pharma: [],
};

export const normalizeProductCategory = (category) => {
    const raw = String(category || '').trim().toLowerCase();

    if (raw === 'tech' || raw === 'electronics & appliances') {
        return 'Tech';
    }

    if (raw === 'grocery' || raw === 'grocery & food items') {
        return 'Grocery';
    }

    if (raw === 'clothing' || raw === 'clothing & textiles') {
        return 'Clothing';
    }

    if (raw === 'stationary' || raw === 'stationery & office supplies' || raw === 'stationery') {
        return 'Stationary';
    }

    if (raw === 'medicines' || raw === 'pharmaceuticals & health') {
        return 'Medicines';
    }

    if (raw.includes('electr') || raw.includes('appliance') || raw.includes('mobile') || raw.includes('tv') || raw.includes('laptop') || raw.includes('computer') || raw.includes('pc') || raw.includes('desktop') || raw.includes('notebook')) {
        return 'Tech';
    }

    if (raw.includes('grocery') || raw.includes('food') || raw.includes('rice') || raw.includes('atta') || raw.includes('oil') || raw.includes('fmcg') || raw.includes('beverage') || raw.includes('tea') || raw.includes('drink') || raw.includes('dairy') || raw.includes('milk') || raw.includes('yogurt') || raw.includes('frozen') || raw.includes('packaged food')) {
        return 'Grocery';
    }

    if (raw.includes('cloth') || raw.includes('textile') || raw.includes('garment') || raw.includes('suit') || raw.includes('jean')) {
        return 'Clothing';
    }

    if (raw.includes('footwear') || raw.includes('shoe') || raw.includes('sandal')) {
        return 'Clothing';
    }

    if (raw === 'stationary' || raw === 'stationery' || raw.includes('office')) {
        return 'Stationary';
    }

    if (raw.includes('pharma') || raw.includes('medic') || raw.includes('health')) {
        return 'Medicines';
    }

    return '';
};

export const getCategoryPrefix = (category) => {
    const normalized = normalizeProductCategory(category);
    const match = PRODUCT_CATEGORIES.find((item) => item.value === normalized);
    return match?.prefix || '';
};

export const getCategoryLabel = (category) => {
    const normalized = normalizeProductCategory(category);
    const match = PRODUCT_CATEGORIES.find((item) => item.value === normalized);
    return match?.label || category || '';
};

export const getCompanyForCategory = (category) => {
    const normalized = normalizeProductCategory(category);
    return CATEGORY_COMPANIES[normalized]?.[0]?.name || '';
};

export const getCompaniesForCategory = (category) => {
    const normalized = normalizeProductCategory(category);
    return CATEGORY_COMPANIES[normalized] || [];
};

export const getCompanyEmail = (category, companyName) => {
    const normalized = normalizeProductCategory(category);
    const company = (CATEGORY_COMPANIES[normalized] || []).find((item) => item.name === companyName);
    return company?.email || '';
};

