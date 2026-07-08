export const toNumber = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const normalizeProductRecord = (item = {}) => {
    const purchasePrice = toNumber(item.cost_price ?? item.purchase_price ?? 0);
    const sellingPrice = toNumber(item.sale_price ?? item.unit_price ?? item.selling_price ?? 0);

    return {
        ...item,
        id: item.id,
        sku: item.sku || item.product_code || '',
        product_code: item.product_code || item.sku || '',
        name: item.name || item.product_name || '',
        category: item.category || item.categoryId || '',
        brand: item.brand || '',
        unit: item.unit || '',
        cost_price: purchasePrice,
        sale_price: sellingPrice,
        unit_price: toNumber(item.unit_price ?? sellingPrice),
        profit_margin: toNumber(item.profit_margin ?? (sellingPrice - purchasePrice)),
        supplier_id: item.supplier?.id ?? item.supplier ?? null,
        supplier_name: item.supplier_name || item.supplier?.name || '',
        minimum_stock: toNumber(item.minimum_stock ?? item.min_stock ?? item.reorder_level ?? 0),
        status: item.status || 'ACTIVE',
        stock_quantity: toNumber(item.stock_quantity ?? item.current_stock ?? 0),
        current_stock: toNumber(item.current_stock ?? item.stock_quantity ?? 0),
        shop_stock: toNumber(item.shop_stock ?? 0),
        warehouse_stock: toNumber(item.warehouse_stock ?? 0),
        damaged_quantity: toNumber(item.damaged_quantity ?? 0),
        warehouse: item.warehouse || item.location || item.storage_location || 'Main Warehouse',
        total_value: toNumber(item.inventory_value ?? (Math.max(toNumber(item.stock_quantity ?? 0), 0) * purchasePrice)),
    };
};

export const buildQuantityMap = (records = [], quantityResolver) => {
    return records.reduce((map, record) => {
        const productId = Number(record?.product ?? record?.product_id ?? record?.id ?? 0);

        if (!productId) {
            return map;
        }

        const quantity = toNumber(quantityResolver(record));
        map[productId] = toNumber(map[productId]) + quantity;
        return map;
    }, {});
};

export const buildReservedQuantityMap = (sales = []) => {
    const reservedSales = sales.filter((sale) => String(sale?.payment_status || '').toUpperCase() === 'PENDING');

    return buildQuantityMap(reservedSales, (sale) => {
        if (Array.isArray(sale?.line_items) && sale.line_items.length > 0) {
            return sale.line_items.reduce((sum, lineItem) => sum + toNumber(lineItem.quantity_sold ?? lineItem.quantity ?? 0), 0);
        }

        return sale?.quantity_sold ?? sale?.quantity ?? 0;
    });
};

export const buildIncomingQuantityMap = (orderedSlips = []) => {
    const activeSlips = orderedSlips.filter((slip) => String(slip?.status || '').toUpperCase() !== 'COMPLETED');

    return buildQuantityMap(activeSlips, (slip) => {
        const ordered = toNumber(slip?.quantity_ordered ?? 0);
        const received = toNumber(slip?.quantity_received ?? 0);
        return Math.max(ordered - received, 0);
    });
};

export const buildInventoryRows = (products = [], reservedMap = {}, incomingMap = {}) => {
    return products.map((product) => {
        const normalized = normalizeProductRecord(product);
        const availableQty = toNumber(normalized.stock_quantity);
        const reservedQty = toNumber(reservedMap[normalized.id]);
        const incomingQty = toNumber(incomingMap[normalized.id]);

        return {
            ...normalized,
            available_qty: availableQty,
            reserved_qty: reservedQty,
            incoming_qty: incomingQty,
            total_value: Math.max(availableQty, 0) * toNumber(normalized.cost_price),
        };
    });
};