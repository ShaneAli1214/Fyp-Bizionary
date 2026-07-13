import { useState, useEffect } from 'react';

export const useDynamicColumns = (tableKey, defaultColumns = []) => {
    // Keys for local storage
    const columnsStorageKey = `bizionary_custom_cols_${tableKey}`;
    const dataStorageKey = `bizionary_custom_data_${tableKey}`;

    // Load initial values from localStorage
    const [customColumns, setCustomColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(columnsStorageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load custom columns:', e);
            return [];
        }
    });

    const [customData, setCustomData] = useState(() => {
        try {
            const saved = localStorage.getItem(dataStorageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Failed to load custom data:', e);
            return {};
        }
    });

    // Save to localStorage when states change
    useEffect(() => {
        localStorage.setItem(columnsStorageKey, JSON.stringify(customColumns));
    }, [customColumns, columnsStorageKey]);

    useEffect(() => {
        localStorage.setItem(dataStorageKey, JSON.stringify(customData));
    }, [customData, dataStorageKey]);

    // Add a new custom column
    const addColumn = (name) => {
        const cleanName = name.trim();
        if (!cleanName) return false;
        
        // Don't duplicate
        if (customColumns.includes(cleanName) || defaultColumns.includes(cleanName)) {
            return false;
        }

        setCustomColumns([...customColumns, cleanName]);
        return true;
    };

    // Remove a custom column
    const removeColumn = (name) => {
        setCustomColumns(customColumns.filter(col => col !== name));
        
        // Clean up data for this column
        setCustomData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(rowKey => {
                if (updated[rowKey]) {
                    const { [name]: deleted, ...rest } = updated[rowKey];
                    updated[rowKey] = rest;
                }
            });
            return updated;
        });
    };

    // Set custom cell value
    const setCustomCellValue = (rowKey, columnName, value) => {
        if (!rowKey) return;
        setCustomData(prev => ({
            ...prev,
            [rowKey]: {
                ...(prev[rowKey] || {}),
                [columnName]: value
            }
        }));
    };

    // Get custom cell value
    const getCustomCellValue = (rowKey, columnName) => {
        if (!rowKey || !customData[rowKey]) return '';
        return customData[rowKey][columnName] || '';
    };

    // Auto-detect extra columns from bulk uploads and register their values
    const importCustomData = (rows, keyField = 'sku', stdFields = []) => {
        if (!rows || rows.length === 0) return;

        const newCols = new Set(customColumns);
        const newData = { ...customData };

        rows.forEach(row => {
            const rowKey = row[keyField];
            if (!rowKey) return;

            Object.keys(row).forEach(key => {
                // If it is not a standard field and not a keyField
                if (key !== keyField && !stdFields.includes(key)) {
                    newCols.add(key);
                    newData[rowKey] = {
                        ...(newData[rowKey] || {}),
                        [key]: row[key]
                    };
                }
            });
        });

        setCustomColumns(Array.from(newCols));
        setCustomData(newData);
    };

    return {
        customColumns,
        addColumn,
        removeColumn,
        setCustomCellValue,
        getCustomCellValue,
        importCustomData,
        allColumns: [...defaultColumns, ...customColumns]
    };
};
