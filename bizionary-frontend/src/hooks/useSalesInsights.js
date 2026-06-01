import { useMemo, useState } from 'react';

const PERIOD_OPTIONS = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'last10Days', label: 'Last 10 Days' },
    { key: 'monthly', label: 'Monthly' },
];

const SALES_TAXONOMY = [
    {
        name: 'Electronics & Appliances',
        key: 'electronics_appliances',
        color: '#0A6ED1',
        subcategories: [
            {
                name: 'Mobile Phones',
                basePrice: 82000,
                margin: 0.16,
                products: [
                    'Samsung Galaxy A54', 'Samsung Galaxy A34', 'iPhone 14', 'iPhone 13', 'Vivo Y36',
                    'Vivo V27', 'Oppo A78', 'Oppo Reno10', 'Realme 11 Pro', 'Xiaomi Redmi 12',
                ],
            },
            {
                name: 'Laptops & Computers',
                basePrice: 155000,
                margin: 0.14,
                products: [
                    'Dell Inspiron 15', 'HP Pavilion 14', 'Lenovo IdeaPad 3', 'Asus VivoBook 15',
                    'Dell Latitude 5520', 'HP ProBook 450', 'Apple MacBook Air M2', 'Acer Aspire 7',
                ],
            },
            {
                name: 'Televisions',
                basePrice: 98000,
                margin: 0.15,
                products: [
                    'Samsung 43" 4K Smart TV', 'Samsung 55" QLED', 'TCL 40" Smart TV', 'TCL 50" 4K TV',
                    'Haier 32" LED', 'Haier 43" Smart TV', 'LG 55" OLED', 'Sony Bravia 50"',
                ],
            },
            {
                name: 'Home Appliances',
                basePrice: 66000,
                margin: 0.17,
                products: [
                    'Dawlance Inverter AC 1.5T', 'Haier Inverter AC 1T', 'Orient AC 1.5T',
                    'Dawlance Refrigerator 12CF', 'Haier Fridge 14CF', 'PEL Refrigerator 16CF',
                    'Dawlance Washing Machine', 'Haier Front Load 8kg', 'National Microwave 30L', 'Kenwood Blender',
                ],
            },
        ],
    },
    {
        name: 'Grocery & Food Items',
        key: 'grocery_food_items',
        color: '#06B6D4',
        subcategories: [
            {
                name: 'Staple Foods',
                basePrice: 6400,
                margin: 0.11,
                products: [
                    'Basmati Rice 25kg', 'Basmati Rice 5kg', 'Wheat Flour Atta 10kg', 'Wheat Flour Atta 5kg',
                    'Sugar 5kg', 'Sugar 1kg', 'Dalda Cooking Oil 5L', 'Dalda Cooking Oil 1L', 'Sufi Cooking Oil 5L', 'Canola Oil 3L',
                ],
            },
            {
                name: 'Spices & Condiments',
                basePrice: 1200,
                margin: 0.18,
                products: [
                    'National Biryani Masala 50g', 'Shan Biryani Mix 60g', 'Shan Karahi Masala 100g', 'Mehran Nihari Masala',
                    'Turmeric Powder 200g', 'Red Chilli Powder 200g', 'Garam Masala 100g', 'Cumin Seeds 100g',
                    'Black Pepper 50g', 'Coriander Powder 200g',
                ],
            },
            {
                name: 'Beverages',
                basePrice: 1800,
                margin: 0.15,
                products: [
                    'Nescafé Classic 200g', 'Tapal Danedar 500g', 'Lipton Yellow Label 200g', 'Tang Mango 500g',
                    'Rooh Afza 800ml', 'Pepsi 1.5L', 'Coca-Cola 1.5L', 'Minute Maid 1L', 'Olper Milk 1L', 'Nurpur Butter 200g',
                ],
            },
            {
                name: 'Dairy & Frozen',
                basePrice: 2400,
                margin: 0.13,
                products: [
                    'Olpers Full Cream Milk 1L', 'Nestle Everyday Milk Powder 1kg', 'Haleeb Milk 1L', 'Sapphire Yogurt 1kg',
                    'Yummy Cheddar Slice 200g', 'K&N\'s Chicken Nuggets 500g', 'K&N\'s Chicken Strips 400g', 'Dawn Croissant 6pcs',
                ],
            },
        ],
    },
    {
        name: 'Clothing & Textiles',
        key: 'clothing_textiles',
        color: '#8B5CF6',
        subcategories: [
            {
                name: "Men's Wear",
                basePrice: 9200,
                margin: 0.22,
                products: [
                    'Gul Ahmed Lawn Suit 3pc', 'Almirah Men Kurta', 'Khaadi Men Shalwar Kameez', 'J. Men Shirt',
                    'Bonanza Men Sweater', 'Men Denim Jeans 32', 'Men Denim Jeans 34', 'Men Formal Trouser',
                    'Men Polo T-Shirt', 'Men Sports Shorts',
                ],
            },
            {
                name: "Women's Wear",
                basePrice: 10800,
                margin: 0.24,
                products: [
                    'Gul Ahmed Summer Collection 3pc', 'Sana Safinaz Ready-to-Wear', 'Khaadi Pret Kurta', 'Maria B Lawn 3pc',
                    'Nishat Linen Suit', 'Zellbury Kurta Set', 'Women Capri Pants', 'Women Cardigan',
                    'Women Abaya Plain', 'Women Dupatta Lawn',
                ],
            },
            {
                name: 'Footwear',
                basePrice: 7400,
                margin: 0.2,
                products: [
                    'Bata Men Leather Shoes', 'Bata Women Pumps', 'Servis Men Sandals', 'Servis School Shoes',
                    'Nike Air Max (Replica)', 'Stylo Women Heels', 'Metro Men Casual', 'Hush Puppies Loafers',
                ],
            },
            {
                name: 'Fabric & Accessories',
                basePrice: 3600,
                margin: 0.18,
                products: [
                    'Lawn Fabric per meter', 'Chiffon Fabric per meter', 'Cotton Fabric per meter', 'Silk Fabric per meter',
                    'Ladies Handbag', 'Men Leather Belt', 'Ladies Scarf', 'Men Necktie',
                ],
            },
        ],
    },
    {
        name: 'Construction & Hardware',
        key: 'construction_hardware',
        color: '#F59E0B',
        subcategories: [
            {
                name: 'Cement & Building Materials',
                basePrice: 2200,
                margin: 0.12,
                products: [
                    'DG Khan Cement 50kg', 'Lucky Cement 50kg', 'Maple Leaf Cement 50kg', 'Red Brick (per 1000)',
                    'Block 6 inch (per piece)', 'River Sand per cubic ft', 'Crush Stone per cubic ft', 'Steel Rod 10mm per kg',
                ],
            },
            {
                name: 'Paints & Finishes',
                basePrice: 5600,
                margin: 0.17,
                products: [
                    'ICI Dulux Weathershield 4L', 'ICI Dulux Interior 4L', 'Berger WeatherCoat 4L', 'Nippon Paint 4L',
                    'Wall Putty 20kg', 'Primer 4L', 'Enamel Paint 1L',
                ],
            },
            {
                name: 'Plumbing & Electrical',
                basePrice: 3100,
                margin: 0.15,
                products: [
                    'CPVC Pipe 1/2 inch', 'CPVC Pipe 3/4 inch', 'Ball Valve 1/2 inch', 'Water Pump 0.5HP',
                    'Electric Wire 2.5mm (per m)', 'Electric Wire 4mm (per m)', 'MCB 20A Single', 'LED Downlight 7W',
                    'LED Bulb 12W', 'Fan Ceiling 56"',
                ],
            },
            {
                name: 'Tools & Hardware',
                basePrice: 1800,
                margin: 0.2,
                products: [
                    'Stanley Hammer', 'Drill Machine 13mm', 'Measuring Tape 5m', 'Screw Set 100pcs',
                    'Wrench Set 8pcs', 'Paint Brush Set 5pcs', 'Safety Gloves', 'Safety Helmet',
                ],
            },
        ],
    },
    {
        name: 'Pharmaceuticals & Health',
        key: 'pharmaceuticals_health',
        color: '#16A34A',
        subcategories: [
            {
                name: 'OTC Medicines',
                basePrice: 780,
                margin: 0.19,
                products: [
                    'Panadol Extra 20tabs', 'Panadol CF 10tabs', 'Brufen 400mg 10tabs', 'Disprin 10tabs',
                    'ORS Sachets x10', 'Vitamin C 500mg x30', 'Omeprazole 20mg x14', 'Antacid 100ml Syrup',
                    'Cough Syrup 100ml', 'Eye Drops 10ml',
                ],
            },
            {
                name: 'Surgical & Medical Supplies',
                basePrice: 1450,
                margin: 0.16,
                products: [
                    'Surgical Mask Box 50pcs', 'Latex Gloves M Box 100', 'Bandage Roll 5cm', 'Antiseptic Dettol 500ml',
                    'Cotton 100g', 'BP Apparatus Digital', 'Thermometer Digital', 'Glucometer',
                ],
            },
            {
                name: 'Personal Care',
                basePrice: 900,
                margin: 0.18,
                products: [
                    'Head & Shoulders 400ml', 'Pantene Shampoo 400ml', 'Safeguard Soap 175g', 'Dove Body Wash 400ml',
                    'Colgate Toothpaste 150g', 'Close-Up Toothpaste 150g', 'Gillette Mach3 Blades 4pk',
                    'Vaseline Petroleum Jelly 250ml', 'Dettol Liquid Soap 250ml', 'Garnier Face Wash 100ml',
                ],
            },
        ],
    },
    {
        name: 'Stationery & Office Supplies',
        key: 'stationery_office_supplies',
        color: '#F97316',
        subcategories: [
            {
                name: 'Paper & Notebooks',
                basePrice: 650,
                margin: 0.21,
                products: [
                    'A4 Paper Ream 500 sheets', 'Spiral Notebook A4', 'Register 200 pages', 'Carbon Copy Book',
                    'Graph Paper 100 sheets', 'Sticky Notes Pad 100', 'Envelopes A4 Box 50',
                ],
            },
            {
                name: 'Writing Instruments',
                basePrice: 420,
                margin: 0.23,
                products: [
                    'Camlin Ballpen Box 10', 'Pilot Ballpen 0.7mm', 'Parker Pen Set', 'Marker Set 10 colors',
                    'Highlighter Set 5pcs', 'Pencil HB Box 12', 'Eraser Staedtler x2',
                ],
            },
            {
                name: 'Office Equipment',
                basePrice: 2200,
                margin: 0.2,
                products: [
                    'Stapler Full Strip', 'Staples Box 1000', 'Hole Punch 2-Hole', 'Scissors Large',
                    'Tape Dispenser', 'File Folder A4', 'Binder Clip 25mm Box', 'Whiteboard Marker Set 4', 'Calculator Scientific',
                ],
            },
        ],
    },
    {
        name: 'Automobiles & Accessories',
        key: 'automobiles_accessories',
        color: '#EF4444',
        subcategories: [
            {
                name: 'Engine & Maintenance',
                basePrice: 5200,
                margin: 0.14,
                products: [
                    'Castrol GTX 5W-30 4L', 'Shell Helix 10W-40 4L', 'Total Quartz 5W-40 4L', 'NGK Spark Plug Set 4',
                    'Bosch Oil Filter', 'Air Filter Toyota Corolla', 'Coolant 1L', 'Brake Fluid DOT4 500ml',
                ],
            },
            {
                name: 'Tyres & Batteries',
                basePrice: 13500,
                margin: 0.12,
                products: [
                    'General Tyre 175/70 R13', 'Bridgestone 195/65 R15', 'Volta Battery 55Ah', 'Exide Battery 65Ah', 'AGS Battery 40Ah',
                ],
            },
            {
                name: 'Car Accessories',
                basePrice: 2600,
                margin: 0.19,
                products: [
                    'Car Floor Mat Set 5pc', 'Car Seat Cover Full Set', 'Car Charger USB Dual', 'Air Freshener',
                    'Windshield Wipers Set', 'Parking Sensor Kit', 'Dashcam 1080p',
                ],
            },
        ],
    },
];

const formatDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatShortDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
};

const slugify = (value) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const getPeriodContext = (periodKey) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);

    if (periodKey === 'daily') {
        return {
            periodLabel: 'Daily',
            dateContext: formatDate(todayStart),
            startDate: todayStart,
            endDate: todayEnd,
            xAxisType: 'hour',
            xAxisLabel: 'Hours of the day',
        };
    }

    if (periodKey === 'weekly') {
        const endDate = new Date(todayStart);
        endDate.setDate(endDate.getDate() - 1);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        return {
            periodLabel: 'Weekly',
            dateContext: `${formatShortDate(startDate)} - ${formatDate(endDate)}`,
            startDate,
            endDate,
            xAxisType: 'day',
            xAxisLabel: 'Days of the week',
        };
    }

    if (periodKey === 'last10Days') {
        const endDate = new Date(todayStart);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 9);
        return {
            periodLabel: 'Last 10 Days',
            dateContext: `${formatShortDate(startDate)} - ${formatDate(endDate)}`,
            startDate,
            endDate,
            xAxisType: 'day',
            xAxisLabel: 'Days',
        };
    }

    const startDate = startOfMonth(todayStart);
    const endDate = endOfMonth(todayStart);
    return {
        periodLabel: 'Monthly',
        dateContext: `${formatDate(startDate)} - ${formatDate(endDate)}`,
        startDate,
        endDate,
        xAxisType: 'week',
        xAxisLabel: 'Weeks of the month',
    };
};

const buildProductStats = (productName, categoryName, subcategoryName, basePrice, margin, seed, index, scale) => {
    const quantitySeed = basePrice / 1000 + seed + index * 3;
    const quantitySold = Math.max(1, Math.round((quantitySeed % 12 + 4) * scale));
    const unitPrice = Math.round(basePrice * (0.92 + ((seed + index) % 5) * 0.03));
    const revenue = quantitySold * unitPrice;
    const profit = Math.round(revenue * margin);

    return {
        name: productName,
        category: categoryName,
        subcategory: subcategoryName,
        quantitySold,
        revenue,
        profit,
    };
};

const buildCatalogCategory = (category, seed, scale) => {
    const subcategories = category.subcategories.map((subcategory, subIndex) => {
        const subScale = scale + (subIndex * 0.05);
        const products = subcategory.products.map((productName, productIndex) => {
            return buildProductStats(
                productName,
                category.name,
                subcategory.name,
                subcategory.basePrice,
                subcategory.margin,
                seed + subIndex,
                productIndex,
                subScale
            );
        });

        const quantitySold = products.reduce((sum, product) => sum + product.quantitySold, 0);
        const revenue = products.reduce((sum, product) => sum + product.revenue, 0);
        const profit = products.reduce((sum, product) => sum + product.profit, 0);

        return {
            name: subcategory.name,
            quantitySold,
            revenue,
            profit,
            products,
        };
    });

    const products = subcategories.flatMap((sub) => sub.products);
    const quantitySold = subcategories.reduce((sum, sub) => sum + sub.quantitySold, 0);
    const revenue = subcategories.reduce((sum, sub) => sum + sub.revenue, 0);
    const profit = subcategories.reduce((sum, sub) => sum + sub.profit, 0);

    return {
        name: category.name,
        key: category.key,
        color: category.color,
        quantitySold,
        revenue,
        profit,
        subcategories,
        products,
    };
};

const buildSeries = (periodKey, labels, seed) => {
    const context = getPeriodContext(periodKey);
    const scale = 0.85 + ((seed % 5) * 0.08);
    const categories = SALES_TAXONOMY.map((category, categoryIndex) => {
        const categoryScale = scale + (categoryIndex * 0.03);
        return buildCatalogCategory(category, seed + categoryIndex, categoryScale);
    });

    const chartData = labels.map((label, index) => {
        const labelScale = 0.7 + (((seed + index) % 6) * 0.09);
        const point = { period: label };

        categories.forEach((category, categoryIndex) => {
            const averagePrice = category.quantitySold > 0 ? category.revenue / category.quantitySold : 1;
            const categoryQuantity = Math.max(1, Math.round((category.quantitySold / labels.length) * labelScale));
            const categoryRevenue = Math.round(categoryQuantity * averagePrice);

            point[category.key] = categoryQuantity;
            point[`${category.key}_revenue`] = categoryRevenue;
        });

        point.revenue = categories.reduce((sum, category) => sum + Number(point[`${category.key}_revenue`] || 0), 0);
        point.profit = Math.round(point.revenue * 0.28);
        return point;
    });

    const categoryTotals = categories.map((category, index) => ({
        name: category.name,
        key: category.key,
        color: category.color,
        quantitySold: chartData.reduce((sum, point) => sum + Number(point[category.key] || 0), 0),
        revenue: chartData.reduce((sum, point) => sum + Number(point[`${category.key}_revenue`] || 0), 0),
        profit: Math.round(chartData.reduce((sum, point) => sum + Number(point[`${category.key}_revenue`] || 0), 0) * 0.28),
        subcategories: category.subcategories,
        products: category.products,
    }));

    return {
        period: periodKey,
        periodLabel: context.periodLabel,
        dateContext: context.dateContext,
        xAxisType: context.xAxisType,
        xAxisLabel: context.xAxisLabel,
        totalSalesAmount: chartData.reduce((sum, point) => sum + point.revenue, 0),
        totalProfit: chartData.reduce((sum, point) => sum + point.profit, 0),
        totalQuantity: chartData.reduce(
            (sum, point) => sum + categories.reduce((categorySum, category) => categorySum + Number(point[category.key] || 0), 0),
            0
        ),
        categories: categoryTotals,
        chartData,
    };
};

const SALES_INSIGHTS_DATA = {
    daily: buildSeries('daily', ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM', '11 PM'], 11),
    weekly: buildSeries('weekly', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 23),
    last10Days: (() => {
        const context = getPeriodContext('last10Days');
        const labels = Array.from({ length: 10 }, (_, index) => {
            const currentDate = new Date(context.startDate);
            currentDate.setDate(currentDate.getDate() + index);
            return formatShortDate(currentDate);
        });
        return buildSeries('last10Days', labels, 37);
    })(),
    monthly: buildSeries('monthly', ['Week 1', 'Week 2', 'Week 3', 'Week 4'], 51),
};

const DEFAULT_PERIOD = 'last10Days';

const useSalesInsights = () => {
    const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_PERIOD);

    const selectedData = useMemo(
        () => SALES_INSIGHTS_DATA[selectedPeriod] || SALES_INSIGHTS_DATA[DEFAULT_PERIOD],
        [selectedPeriod]
    );

    return {
        periodOptions: PERIOD_OPTIONS,
        selectedPeriod,
        setSelectedPeriod,
        selectedData,
        mockResponse: selectedData,
    };
};

export default useSalesInsights;