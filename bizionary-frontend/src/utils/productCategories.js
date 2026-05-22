export const PRODUCT_CATEGORIES = [
    { value: 'Tech', label: 'Electronics & Appliances', prefix: 'EL' },
    { value: 'Grocery', label: 'Grocery & Food Items', prefix: 'GR' },
    { value: 'Construction', label: 'Construction & Hardware', prefix: 'CN' },
    { value: 'Clothing', label: 'Clothing & Textiles', prefix: 'CL' },
    { value: 'Automobiles & Accessories', label: 'Automobiles & Accessories', prefix: 'AU' },
    { value: 'Stationary', label: 'Stationery & Office Supplies', prefix: 'SA' },
    { value: 'Medicines', label: 'Pharmaceuticals & Health', prefix: 'MA' },
];

export const CATEGORY_COMPANIES = {
    Tech: [
        { name: 'TechHub Pvt Ltd', email: 'ahmed@techhub.pk', contact: 'Ahmed Khan', phone: '0300-1234567' },
        { name: 'iWorld Pakistan', email: 'sara@iworld.pk', contact: 'Sara Ali', phone: '0321-2345678' },
        { name: 'Vivo Pakistan', email: 'bilal@vivo.pk', contact: 'Bilal Malik', phone: '0333-3456789' },
        { name: 'Oppo Distributors', email: 'zain@oppo.pk', contact: 'Zain Raza', phone: '0345-4567890' },
        { name: 'Realme Pakistan', email: 'ayesha@realme.pk', contact: 'Ayesha Butt', phone: '0301-5678901' },
        { name: 'Xiaomi Pakistan', email: 'kamran@xiaomi.pk', contact: 'Kamran Iqbal', phone: '0311-6789012' },
        { name: 'Dell Pakistan', email: 'sobia@dell.pk', contact: 'Sobia Hashmi', phone: '0321-7890123' },
        { name: 'HP Distributors', email: 'asif@hp.pk', contact: 'Asif Mehmood', phone: '0333-8901234' },
        { name: 'Lenovo Pakistan', email: 'rabia@lenovo.pk', contact: 'Rabia Noor', phone: '0300-9012345' },
        { name: 'Asus Pakistan', email: 'tariq@asus.pk', contact: 'Tariq Javed', phone: '0321-0123456' },
        { name: 'Acer Pakistan', email: 'hina@acer.pk', contact: 'Hina Shah', phone: '0345-1234567' },
        { name: 'TCL Pakistan', email: 'usman@tcl.pk', contact: 'Usman Ghani', phone: '0301-2345678' },
        { name: 'LG Pakistan', email: 'shahida@lg.pk', contact: 'Shahida Pervez', phone: '0345-7890123' },
        { name: 'Sony Pakistan', email: 'hamza@sony.pk', contact: 'Hamza Tariq', phone: '0301-8901234' },
        { name: 'Casio Pakistan', email: 'tariq@casio.pk', contact: 'Tariq Bashir', phone: '0301-0123458' },
    ],
    Computers: [
        { name: 'Dell Pakistan', email: 'sales@dell.com.pk' },
        { name: 'HP Distributors', email: 'sales@hp.com.pk' },
        { name: 'Lenovo Pakistan', email: 'sales@lenovo.com.pk' },
        { name: 'Asus Pakistan', email: 'sales@asus.com.pk' },
        { name: 'Acer Pakistan', email: 'sales@acer.com.pk' },
    ],
    Grocery: [
        { name: 'Falak Foods', email: 'info@falakfoods.pk' },
        { name: 'Sunridge Foods', email: 'info@sunridgefoods.pk' },
        { name: 'National Foods', email: 'info@nationalfoods.com.pk' },
        { name: 'Shan Foods', email: 'info@shanfoods.com.pk' },
        { name: 'Dalda Foods', email: 'info@daldafoods.com.pk' },
        { name: 'Mehran Foods', email: 'info@mehranfoods.com.pk' },
    ],
    Construction: [
        { name: 'DG Khan Cement', email: 'sales@dgkcement.com.pk' },
        { name: 'Lucky Cement', email: 'sales@luckycement.com.pk' },
        { name: 'Amreli Steels', email: 'info@amreli.com.pk' },
    ],
    Clothing: [
        { name: 'Gul Ahmed', email: 'info@gulahmed.com' },
        { name: 'Khaadi', email: 'info@khaadi.com' },
        { name: 'Sana Safinaz', email: 'info@sanasafinaz.com' },
        { name: 'Nishat Linen', email: 'info@nishatlinen.com' },
        { name: 'J (Junaid Jamshed)', email: 'info@jj.com.pk' },
    ],
    'Automobiles & Accessories': [
        { name: 'Castrol Pakistan', email: 'info@castrol.com.pk' },
        { name: 'Shell Pakistan', email: 'info@shell.com.pk' },
        { name: 'General Tyre', email: 'info@generaltire.com.pk' },
        { name: 'Exide Pakistan', email: 'info@exide.com.pk' },
    ],
    Stationary: [
        { name: 'Panda Stationers', email: 'info@pandastationers.pk' },
        { name: '3M Pakistan', email: 'info@3m.com.pk' },
    ],
    Medicines: [
        { name: 'GSK Pakistan', email: 'info@gsk.com.pk' },
        { name: 'Abbott Pakistan', email: 'info@abbott.com.pk' },
    ],
    FMCG: [
        { name: 'Nestle Pakistan', email: 'info@nestle.pk' },
        { name: 'Unilever Pakistan', email: 'info@unilever.pk' },
        { name: 'P&G Pakistan', email: 'info@pg.com.pk' },
        { name: 'Reckitt Pakistan', email: 'info@reckitt.pk' },
    ],
    Beverages: [
        { name: 'Tapal Tea', email: 'info@tapal.com.pk' },
        { name: 'Hamdard', email: 'info@hamdard.com.pk' },
    ],
    Dairy: [
        { name: 'FrieslandCampina', email: 'info@frieslandcampina.pk' },
        { name: 'Haleeb Foods', email: 'info@haleebfoods.com.pk' },
    ],
    'Frozen Foods': [
        { name: 'KNs Pakistan', email: 'info@kns.com.pk' },
    ],
    Food: [
        { name: 'Dawn Foods', email: 'info@dawnfoods.pk' },
    ],
    Footwear: [
        { name: 'Bata Pakistan', email: 'info@bata.com.pk' },
        { name: 'Servis', email: 'info@servis.com.pk' },
    ],
    Paints: [
        { name: 'ICI Pakistan', email: 'info@ici.com.pk' },
        { name: 'Berger Paints', email: 'info@berger.com.pk' },
    ],
    Electrical: [
        { name: 'Pakistan Cables', email: 'info@pakistancables.com' },
        { name: 'Siemens Pakistan', email: 'info@siemens.com.pk' },
    ],
    Lighting: [
        { name: 'Philips Pakistan', email: 'info@philips.com.pk' },
    ],
    Pharma: [
        { name: 'GSK Pakistan', email: 'info@gsk.com.pk' },
        { name: 'Abbott Pakistan', email: 'info@abbott.com.pk' },
    ],
    Tools: [
        { name: 'Bosch Pakistan', email: 'info@bosch.com.pk' },
        { name: 'Stanley Tools', email: 'info@stanleytools.pk' },
    ],
};

export const normalizeProductCategory = (category) => {
    const raw = String(category || '').trim().toLowerCase();

    if (raw === 'tech' || raw === 'electronics & appliances') {
        return 'Tech';
    }

    if (raw === 'grocery' || raw === 'grocery & food items') {
        return 'Grocery';
    }

    if (raw === 'construction' || raw === 'construction & hardware') {
        return 'Construction';
    }

    if (raw === 'clothing' || raw === 'clothing & textiles') {
        return 'Clothing';
    }

    if (raw === 'automobiles & accessories') {
        return 'Automobiles & Accessories';
    }

    if (raw === 'stationary' || raw === 'stationery & office supplies' || raw === 'stationery') {
        return 'Stationary';
    }

    if (raw === 'medicines' || raw === 'pharmaceuticals & health') {
        return 'Medicines';
    }

    if (raw.includes('autom') || raw.includes('tyre') || raw.includes('battery') || raw.includes('car')) {
        return 'Automobiles & Accessories';
    }

    if (raw.includes('electr') || raw.includes('appliance') || raw.includes('mobile') || raw.includes('tv') || raw.includes('laptop') || raw.includes('computer') || raw.includes('pc') || raw.includes('desktop') || raw.includes('notebook')) {
        return 'Tech';
    }

    if (raw.includes('grocery') || raw.includes('food') || raw.includes('rice') || raw.includes('atta') || raw.includes('oil') || raw.includes('fmcg') || raw.includes('beverage') || raw.includes('tea') || raw.includes('drink') || raw.includes('dairy') || raw.includes('milk') || raw.includes('yogurt') || raw.includes('frozen') || raw.includes('packaged food')) {
        return 'Grocery';
    }

    if (raw.includes('construct') || raw.includes('cement') || raw.includes('pipe') || raw.includes('hardware')) {
        return 'Construction';
    }

    if (raw.includes('cloth') || raw.includes('textile') || raw.includes('garment') || raw.includes('suit') || raw.includes('jean')) {
        return 'Clothing';
    }

    if (raw.includes('footwear') || raw.includes('shoe') || raw.includes('sandal')) {
        return 'Clothing';
    }

    if (raw.includes('paint') || raw.includes('electrical') || raw.includes('wire') || raw.includes('cable') || raw.includes('switch') || raw.includes('lighting') || raw.includes('lamp') || raw.includes('bulb') || raw.includes('tool')) {
        return 'Construction';
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
