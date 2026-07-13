import { useState, useEffect } from 'react';

export const useDynamicColumns = (tableKey, defaultColumns = []) => {
    // Keys for local storage
    const columnsStorageKey = `bizionary_custom_cols_${tableKey}`;
    const dataStorageKey = `bizionary_custom_data_${tableKey}`;

    // Load initial values from localStorage (dictionary structure: { [sectionKey]: ['colName1', ...] })
    const [customColumns, setCustomColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(columnsStorageKey);
            if (!saved) return {};
            const parsed = JSON.parse(saved);
            // Support legacy array structures
            if (Array.isArray(parsed)) {
                return { 'ALL': parsed };
            }
            return parsed;
        } catch (e) {
            console.error('Failed to load custom columns:', e);
            return {};
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

    // Get custom columns for a specific section
    const getCustomColumns = (sectionKey = 'ALL') => {
        return customColumns[sectionKey] || [];
    };

    // Add a new custom column to a specific section
    const addColumn = (sectionKey = 'ALL', name) => {
        const cleanName = name.trim();
        if (!cleanName) return false;
        
        const sectionCols = customColumns[sectionKey] || [];
        
        // Don't duplicate
        if (sectionCols.includes(cleanName) || defaultColumns.includes(cleanName)) {
            return false;
        }

        setCustomColumns(prev => ({
            ...prev,
            [sectionKey]: [...sectionCols, cleanName]
        }));
        return true;
    };

    // Remove a custom column from a specific section
    const removeColumn = (sectionKey = 'ALL', name) => {
        const sectionCols = customColumns[sectionKey] || [];
        setCustomColumns(prev => ({
            ...prev,
            [sectionKey]: sectionCols.filter(col => col !== name)
        }));
        
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

    // Auto-detect extra columns from bulk uploads and register their values per section/category
    const importCustomData = (rows, keyField = 'sku', stdFields = [], sectionField = 'category') => {
        if (!rows || rows.length === 0) return;

        const updatedCols = { ...customColumns };
        const newData = { ...customData };

        rows.forEach(row => {
            const rowKey = row[keyField];
            if (!rowKey) return;
            
            // Normalize section/category string
            const sectionKey = row[sectionField] || 'ALL';
            if (!updatedCols[sectionKey]) {
                updatedCols[sectionKey] = [];
            }

            Object.keys(row).forEach(key => {
                // If it is not standard, not keyField, and not sectionField
                if (key !== keyField && key !== sectionField && !stdFields.includes(key)) {
                    if (!updatedCols[sectionKey].includes(key)) {
                        updatedCols[sectionKey] = [...updatedCols[sectionKey], key];
                    }
                    newData[rowKey] = {
                        ...(newData[rowKey] || {}),
                        [key]: row[key]
                    };
                }
            });
        });

        setCustomColumns(updatedCols);
        setCustomData(newData);
    };

    return {
        getCustomColumns,
        addColumn,
        removeColumn,
        setCustomCellValue,
        getCustomCellValue,
        importCustomData
    };
};
