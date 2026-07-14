import React, { useState, useEffect, useMemo, useRef } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Skeleton from '../../components/ui/Skeleton';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { Plus, Search, Edit2, Trash2, Filter, Receipt, Upload, X, CheckCircle2, AlertCircle, FileText, ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import SaleForm from './SaleForm';
import SalesCharts from './SalesCharts';
import SaleSlipModal from './SaleSlipModal';
import { PRODUCT_CATEGORIES, normalizeProductCategory } from '../../utils/productCategories';
import { useAuth } from '../../context/AuthContext';
import { useDynamicColumns } from '../../hooks/useDynamicColumns';

const MemoizedSalesCharts = React.memo(SalesCharts);

// Magnetic Button helper for fluid pull effects
const MagneticButton = ({ children, onClick, disabled, className }) => {
    const buttonRef = useRef(null);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!buttonRef.current || disabled) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;
        
        // Define active magnetic radius
        const radius = 80;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance < radius) {
            setIsHovered(true);
            const pullFactor = 0.35;
            const maxPull = 12;
            const pullX = Math.max(-maxPull, Math.min(maxPull, distanceX * pullFactor));
            const pullY = Math.max(-maxPull, Math.min(maxPull, distanceY * pullFactor));
            setCoords({ x: pullX, y: pullY });
        } else {
            handleMouseLeave();
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setCoords({ x: 0, y: 0 });
    };

    return (
        <button
            ref={buttonRef}
            disabled={disabled}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform: `translate(${coords.x}px, ${coords.y}px) ${isHovered ? 'translateY(-4px)' : 'translateY(0px)'}`,
                transition: isHovered ? 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
            }}
            className={`${className} group relative`}
        >
            {children}
        </button>
    );
};

const SalesList = () => {

    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');

    // Dynamic columns hook
    const {
        getCustomColumns,
        addColumn: addSectionColumn,
        removeColumn: removeSectionColumn,
        setCustomCellValue,
        getCustomCellValue
    } = useDynamicColumns('sales');

    const customColumns = getCustomColumns(categoryFilter);
    const addColumn = (name) => addSectionColumn(categoryFilter, name);
    const removeColumn = (name) => removeSectionColumn(categoryFilter, name);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentSale, setCurrentSale] = useState(null);
    const [saleSlipOpen, setSaleSlipOpen] = useState(false);
    const [selectedSlipSale, setSelectedSlipSale] = useState(null);
    const [createdSale, setCreatedSale] = useState(null);
    const [createMessage, setCreateMessage] = useState('');
    // Bulk upload states
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkDragging, setBulkDragging] = useState(false);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);  // success response
    const [bulkError, setBulkError] = useState(null);    // error response
    const [bulkTab, setBulkTab] = useState('csv');       // 'csv' | 'json'
    const [bulkJson, setBulkJson] = useState('');
    const fileInputRef = useRef(null);

    // Debounce search term to prevent rapid API calls
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const categoryOptions = useMemo(() => {
        const dynamicCategories = sales
            .map((item) => String(item.product_category || '').trim())
            .filter(Boolean)
            .map((cat) => normalizeProductCategory(cat) || cat);

        const merged = [...PRODUCT_CATEGORIES.map((item) => item.value), ...dynamicCategories];
        return Array.from(new Set(merged))
            .filter((value) => {
                const lowerVal = value.toLowerCase();
                return lowerVal !== 'water' && lowerVal !== 'books' && lowerVal !== 'sports';
            })
            .map((value) => {
                const match = PRODUCT_CATEGORIES.find((item) => item.value === value);
                return match || { value, label: value };
            });
    }, [sales]);

    const getCategoryLabel = (category) => {
        if (!category) return 'N/A';
        const normalized = normalizeProductCategory(category);
        const match = PRODUCT_CATEGORIES.find((item) => item.value === (normalized || category));
        return match ? match.label : category;
    };

    const closeSaleForm = () => {
        setIsFormOpen(false);
        setCurrentSale(null);
        setCreatedSale(null);
        setCreateMessage('');
    };

    const emitInventoryRefresh = (source, action) => {
        window.dispatchEvent(new CustomEvent('inventoryRefreshRequested', {
            detail: {
                source,
                action,
                timestamp: Date.now(),
            },
        }));
    };

    const fetchSales = async (pageNumber = 1) => {
        try {
            setLoading(true);
            const res = await api.get('sales/', {
                params: {
                    page: pageNumber,
                    page_size: 10,
                    search: debouncedSearch,
                    category: categoryFilter,
                    date: dateFilter
                }
            });
            const dataPayload = res.data;
            if (dataPayload && dataPayload.success) {
                setSales(dataPayload.data || []);
                setPagination(dataPayload.pagination || null);
                setPage(dataPayload.pagination?.current_page || pageNumber);
            } else {
                setSales(Array.isArray(dataPayload) ? dataPayload : []);
                setPagination(null);
            }
        } catch (error) {
            console.warn('Failed to fetch sales from backend.');
            setSales([]);
            setPagination(null);
        } finally {
            setLoading(false);
        }
    };

    // Trigger API call when page or filters change
    useEffect(() => {
        fetchSales(page);
    }, [page, debouncedSearch, categoryFilter, dateFilter]);

    // Reset to first page on search or category filter change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, categoryFilter, dateFilter]);

    const handleCreateOrUpdate = async (saleData) => {
        let savedSale = null;

        if (currentSale) {
            const res = await api.put(`sales/${currentSale.id}/`, saleData);
            savedSale = res.data?.data || res.data || null;
            setCreateMessage('Sale updated successfully.');
            setCreatedSale(null);
            setIsFormOpen(false);
        } else {
            const res = await api.post('sales/', saleData);
            savedSale = res.data?.data || res.data || null;
            setCreatedSale(savedSale);
            setCreateMessage('Sale created successfully. You can now generate the slip.');
        }

        await fetchSales(page);
        // Dispatch event to notify all listeners (especially AI Insights Widget) of sale creation
        window.dispatchEvent(new CustomEvent('saleCreated', { detail: { timestamp: Date.now() } }));
        emitInventoryRefresh('sales', currentSale ? 'updated' : 'created');
        setCurrentSale(null);
    };

    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

    const handleDelete = async (id) => {
        try {
            await api.delete(`sales/${id}/`);
            await fetchSales(page);
            emitInventoryRefresh('sales', 'deleted');
        } catch (error) {
            alert("Failed to delete sale.");
        }
    };

    const openAddForm = () => {
        setCurrentSale(null);
        setCreatedSale(null);
        setCreateMessage('');
        setIsFormOpen(true);
    };

    // ── Bulk upload handlers ─────────────────────────────────
    const openBulkModal = () => {
        setBulkModalOpen(true);
        setBulkFile(null);
        setBulkResult(null);
        setBulkError(null);
        setBulkJson('');
        setBulkTab('csv');
    };

    const closeBulkModal = () => {
        setBulkModalOpen(false);
        setBulkFile(null);
        setBulkResult(null);
        setBulkError(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setBulkDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) setBulkFile(file);
    };

    const handleBulkUpload = async () => {
        setBulkUploading(true);
        setBulkError(null);
        setBulkResult(null);
        try {
            let res;
            if (bulkTab === 'csv') {
                if (!bulkFile) { setBulkError({ error: 'Please select a CSV file' }); return; }
                const form = new FormData();
                form.append('file', bulkFile);
                res = await api.post('sales/bulk-upload/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                let parsed;
                try { parsed = JSON.parse(bulkJson); } catch { setBulkError({ error: 'Invalid JSON. Must be an array or {"sales":[...]}' }); return; }
                const body = Array.isArray(parsed) ? { sales: parsed } : parsed;
                res = await api.post('sales/bulk-upload/', body);
            }
            setBulkResult(res.data);
            await fetchSales();
            window.dispatchEvent(new CustomEvent('saleCreated', { detail: { timestamp: Date.now() } }));
            emitInventoryRefresh('sales', 'bulk-created');
        } catch (err) {
            const errorData = err.response?.data;
            if (typeof errorData === 'string') {
                setBulkError({ error: errorData });
            } else if (errorData && typeof errorData === 'object') {
                let mainError = errorData.error || errorData.detail || errorData.message;
                if (!mainError) {
                    const keys = Object.keys(errorData).filter(k => k !== 'validation_errors');
                    if (keys.length > 0) {
                        const firstVal = errorData[keys[0]];
                        mainError = Array.isArray(firstVal) 
                            ? `${keys[0]}: ${firstVal.join(', ')}` 
                            : `${keys[0]}: ${firstVal}`;
                    } else {
                        mainError = 'Upload failed. Please try again.';
                    }
                }
                setBulkError({
                    error: mainError,
                    validation_errors: errorData.validation_errors || null
                });
            } else {
                setBulkError({ error: err.message || 'Upload failed. Please try again.' });
            }
        } finally {
            setBulkUploading(false);
        }
    };

    const openEditForm = (item) => {
        setCurrentSale(item);
        setCreatedSale(null);
        setCreateMessage('');
        setIsFormOpen(true);
    };

    const handleGenerateCreatedSaleSlip = async () => {
        if (!createdSale) {
            return;
        }

        try {
            const res = await api.get(`sales/${createdSale.id}/`);
            const salePayload = res.data?.data || res.data || createdSale;
            setSelectedSlipSale(salePayload);
            setSaleSlipOpen(true);
        } catch (error) {
            setSelectedSlipSale(createdSale);
            setSaleSlipOpen(true);
        }
    };

    const handleViewSlip = async (sale) => {
        try {
            const res = await api.get(`sales/${sale.id}/`);
            const salePayload = res.data?.data || res.data || sale;
            setSelectedSlipSale(salePayload);
            setSaleSlipOpen(true);
        } catch (error) {
            setSelectedSlipSale(sale);
            setSaleSlipOpen(true);
        }
    };

    const filteredSales = sales;

    return (
        <div className="space-y-6">

            <PageHeader title="Sales" subtitle="Track and manage all customer sales transactions." />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-secondary" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-card rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-surface shadow-sm text-textMain placeholder-textMuted"
                        placeholder="Search by product, customer, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:-translate-y-[4px] hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.08)] active:scale-[0.98] rounded-xl border border-card bg-surface flex items-center">
                        <Calendar className="h-4 w-4 absolute left-3 text-secondary pointer-events-none" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full sm:w-40 pl-9 pr-8 py-2 bg-transparent text-textMain outline-none rounded-xl cursor-pointer text-sm font-bold"
                        />
                        {dateFilter && (
                            <button
                                type="button"
                                onClick={() => setDateFilter('')}
                                className="absolute right-2 p-1 bg-page hover:bg-card-hover text-secondary hover:text-danger rounded-lg transition-colors"
                                title="Clear Date"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="relative w-full sm:w-auto transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:-translate-y-[4px] hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.08)] active:scale-[0.98] rounded-2xl border border-card bg-surface">
                        <Filter className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full sm:w-44 pl-9 pr-10 py-2 bg-transparent text-textMain outline-none rounded-xl cursor-pointer appearance-none text-sm font-bold"
                        >
                            <option value="ALL">All Categories</option>
                            {categoryOptions.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                    </div>

                    <button
                        onClick={() => {
                            const targetSectionLabel = categoryFilter === 'ALL' ? 'Global' : categoryFilter;
                            const colName = prompt(`Enter the name of the new column for ${targetSectionLabel} sales:`);
                            if (colName) {
                                const success = addColumn(colName);
                                if (!success) {
                                    alert("Column already exists or invalid name!");
                                }
                            }
                        }}
                        className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-white via-slate-50 to-white bg-[length:200%_auto] hover:bg-[100%_0] border border-card text-textMain hover:border-primary hover:text-primary rounded-full text-sm font-bold transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:-translate-y-[4px] hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.08)] active:scale-[0.98] w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2 text-primary" />
                        + Column {categoryFilter === 'ALL' ? '' : `(${categoryFilter})`}
                    </button>
                    <button
                        onClick={openBulkModal}
                        className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-white via-slate-50 to-white bg-[length:200%_auto] hover:bg-[100%_0] border border-card text-textMain hover:border-primary hover:text-primary rounded-full text-sm font-bold transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:-translate-y-[4px] hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.08)] active:scale-[0.98] w-full sm:w-auto"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Upload
                    </button>
                    <button
                        onClick={openAddForm}
                        className="flex items-center justify-center px-5 py-2.5 bg-primary rounded-full text-sm font-bold w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Sale
                    </button>
                </div>
            </div>

            {/* ── BULK UPLOAD MODAL ─────────────────────────────── */}
            {bulkModalOpen && (
                <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-card">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl"><Upload className="w-5 h-5 text-primary" /></div>
                                <div>
                                    <h2 className="text-base font-bold text-textMain">Bulk Upload Sales</h2>
                                    <p className="text-xs text-textMuted">Upload CSV or paste JSON — all KPIs update automatically</p>
                                </div>
                            </div>
                            <button onClick={closeBulkModal} className="p-2 hover:bg-page rounded-xl transition-colors"><X className="w-4 h-4 text-secondary" /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                            {/* Tab switcher */}
                            {!bulkResult && (
                                <div className="flex gap-1 bg-page p-1 rounded-xl w-fit">
                                    <button onClick={() => setBulkTab('csv')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${bulkTab === 'csv' ? 'bg-card text-primary shadow-sm' : 'text-textMuted'}`}>CSV File</button>
                                    <button onClick={() => setBulkTab('json')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${bulkTab === 'json' ? 'bg-card text-primary shadow-sm' : 'text-textMuted'}`}>JSON Paste</button>
                                </div>
                            )}

                            {/* Success result */}
                            {bulkResult && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-status-success/10 border border-card rounded-xl">
                                        <CheckCircle2 className="w-6 h-6 text-status-success shrink-0" />
                                        <div>
                                            <p className="font-bold text-status-success">{bulkResult.message}</p>
                                            <p className="text-xs text-status-success mt-0.5">
                                                Revenue added: Rs. {bulkResult.summary?.total_revenue?.toLocaleString()} &nbsp;|&nbsp;
                                                Dates: {bulkResult.summary?.date_range?.from} → {bulkResult.summary?.date_range?.to}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto border border-card rounded-xl">
                                        <table className="w-full text-xs">
                                            <thead className="bg-page sticky top-0"><tr>
                                                <th className="px-3 py-2 text-left text-textMuted font-semibold">Row</th>
                                                <th className="px-3 py-2 text-left text-textMuted font-semibold">Sale ID</th>
                                                <th className="px-3 py-2 text-left text-textMuted font-semibold">Product</th>
                                                <th className="px-3 py-2 text-center text-textMuted font-semibold">Qty</th>
                                                <th className="px-3 py-2 text-right text-textMuted font-semibold">Total</th>
                                                <th className="px-3 py-2 text-left text-textMuted font-semibold">Date</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {bulkResult.created_sales?.map(s => (
                                                    <tr key={s.sale_id} className="hover:bg-page">
                                                        <td className="px-3 py-2 text-textMuted">#{s.row}</td>
                                                        <td className="px-3 py-2 font-mono text-primary">#SL-{String(s.sale_id).padStart(4,'0')}</td>
                                                        <td className="px-3 py-2 font-medium text-textMain">{s.product}</td>
                                                        <td className="px-3 py-2 text-center">{s.qty}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-status-success">Rs. {s.total?.toLocaleString()}</td>
                                                        <td className="px-3 py-2 text-textMuted">{s.date}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Error display */}
                            {bulkError && (
                                <div className="p-4 bg-status-info/10 border border-card rounded-xl">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-5 h-5 text-status-info shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-rose-800 text-sm">{bulkError.error}</p>
                                            {bulkError.validation_errors && (
                                                <ul className="mt-2 space-y-0.5">
                                                    {bulkError.validation_errors.map((e, i) => <li key={i} className="text-xs text-status-info">• {e}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CSV upload zone */}
                            {!bulkResult && bulkTab === 'csv' && (
                                <div>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setBulkDragging(true); }}
                                        onDragLeave={() => setBulkDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                            bulkDragging ? 'border-primary bg-primary/5' : bulkFile ? 'border-emerald-400 bg-status-success/10' : 'border-card hover:border-primary/50 hover:bg-page'
                                        }`}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => setBulkFile(e.target.files[0])} />
                                        {bulkFile ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <FileText className="w-6 h-6 text-status-success" />
                                                <div className="text-left">
                                                    <p className="font-bold text-status-success text-sm">{bulkFile.name}</p>
                                                    <p className="text-xs text-status-success">{(bulkFile.size / 1024).toFixed(1)} KB — Ready to upload</p>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setBulkFile(null); }} className="ml-auto p-1 hover:bg-status-success/20 rounded-xl"><X className="w-3.5 h-3.5 text-status-success" /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="font-semibold text-textMain text-sm">Drop your CSV here or click to browse</p>
                                                <p className="text-xs text-textMuted mt-1">Required columns: <code className="bg-page px-1 rounded">product_id</code> or <code className="bg-page px-1 rounded">product_code</code>, <code className="bg-page px-1 rounded">quantity_sold</code>, <code className="bg-page px-1 rounded">unit_price</code>, <code className="bg-page px-1 rounded">sale_date</code></p>
                                            </>
                                        )}
                                    </div>

                                    {/* CSV template download hint */}
                                    <div className="mt-3 flex items-center gap-2 text-xs text-textMuted">
                                        <ChevronDown className="w-3.5 h-3.5" />
                                        <span>CSV columns: <code>product_id, quantity_sold, unit_price, sale_date, customer_name, payment_status, payment_method</code></span>
                                    </div>
                                </div>
                            )}

                            {/* JSON paste zone */}
                            {!bulkResult && bulkTab === 'json' && (
                                <div>
                                    <textarea
                                        value={bulkJson}
                                        onChange={(e) => setBulkJson(e.target.value)}
                                        rows={10}
                                        placeholder='[{"product_id": 1, "quantity_sold": 5, "unit_price": 500, "sale_date": "2026-05-01"}, ...]'
                                        className="w-full font-mono text-xs border border-card rounded-xl p-4 focus:ring-2 focus:ring-primary outline-none resize-none bg-page"
                                    />
                                    <p className="text-xs text-textMuted mt-1">Paste a JSON array of sale objects or <code>{'{ "sales": [...] }'}</code></p>
                                </div>
                            )}
                        </div>

                        {/* Modal footer */}
                        <div className="px-6 py-4 border-t border-card flex justify-between items-center">
                            {bulkResult ? (
                                <>
                                    <p className="text-xs text-textMuted">{bulkResult.summary?.total_records_created} records uploaded. KPIs refreshed.</p>
                                    <button onClick={closeBulkModal} className="px-4 py-2 bg-primary rounded-full text-sm font-bold">Done</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={closeBulkModal} className="px-4 py-2 text-textMuted text-sm font-medium hover:text-textMain">Cancel</button>
                                    <button
                                        onClick={handleBulkUpload}
                                        disabled={bulkUploading || (bulkTab === 'csv' && !bulkFile) || (bulkTab === 'json' && !bulkJson.trim())}
                                        className="flex items-center gap-2 px-5 py-2 bg-primary rounded-full text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bulkUploading ? <div className="w-4 h-4 border-2 border-card/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {bulkUploading ? 'Uploading...' : 'Upload & Save'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm">
                <MemoizedSalesCharts categoryFilter={categoryFilter} searchTerm={debouncedSearch} />
            </div>

            {/* Main Table */}
            <div className="bg-bg-card rounded-2xl border border-border-card shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="p-6">
                        <Skeleton.TableRows count={7} cols={7} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-text-secondary text-xs uppercase tracking-wider border-b border-border-card">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Ref ID</th>
                                    <th className="px-6 py-4 font-semibold">Date</th>
                                    <th className="px-6 py-4 font-semibold">Customer</th>
                                    <th className="px-6 py-4 font-semibold">Category</th>
                                    <th className="px-6 py-4 font-semibold">Product</th>
                                    <th className="px-6 py-4 font-semibold text-center">Sold Qty</th>
                                    <th className="px-6 py-4 font-semibold text-center">Current Stock</th>
                                    <th className="px-6 py-4 font-semibold text-right">Total Price</th>
                                    {customColumns.map(col => (
                                        <th key={col} className="px-6 py-4 font-semibold text-center relative group">
                                            <div className="flex items-center justify-center gap-1">
                                                {col}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`Delete custom column "${col}" and all its cell data?`)) {
                                                            removeColumn(col);
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 ml-1 transition-opacity cursor-pointer"
                                                    title={`Remove column ${col}`}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-card">
                                {filteredSales.map((s) => (
                                    <tr key={s.id} className="hover:bg-page transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-textMuted font-mono text-xs">#SL-{s.id.toString().padStart(4, '0')}</td>
                                        <td className="px-6 py-4 text-textMuted">{s.sale_date}</td>
                                        <td className="px-6 py-4 font-medium text-textMain">{s.customer_name}</td>
                                        <td className="px-6 py-4 text-textMuted">{getCategoryLabel(s.product_category)}</td>
                                        <td className="px-6 py-4 font-bold text-textMain">
                                            {Array.isArray(s.line_items) && s.line_items.length > 1
                                                ? `${s.line_items.length} Products`
                                                : (s.product_name || `Product ID: ${s.product}`)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-bold text-text-secondary">
                                                {s.quantity_sold}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs font-semibold text-textMuted">
                                            {s.remaining_stock ?? 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-status-success text-right">{formatPKR(s.total_price)}</td>
                                        {customColumns.map(col => {
                                            const cellValue = getCustomCellValue(s.id, col);
                                            return (
                                                <td key={col} className="px-6 py-4 text-center whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        value={cellValue}
                                                        onChange={(e) => setCustomCellValue(s.id, col, e.target.value)}
                                                        className="w-24 text-center bg-transparent border-b border-border-card/30 hover:border-textMuted focus:border-primary focus:ring-0 outline-none text-xs text-textMain"
                                                        placeholder="-"
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => handleViewSlip(s)}
                                                    className="inline-flex items-center justify-center p-1.5 text-secondary hover:text-amber-600 bg-page hover:bg-amber-50 rounded-xl transition-colors border border-card hover:border-amber-100"
                                                    title="View Slip"
                                                >
                                                    <Receipt className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditForm(s)}
                                                    className="text-secondary hover:text-primary transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete({ open: true, id: s.id })}
                                                    className="text-secondary hover:text-status-info transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSales.length === 0 && (
                                    <tr>
                                        <td colSpan={9 + customColumns.length} className="px-6 py-12 text-center text-textMuted">
                                            <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                            <p>No sales records found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {pagination && pagination.num_pages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-card bg-page/50">
                        <span className="text-xs text-secondary font-semibold">
                            Showing page {pagination.current_page} of {pagination.num_pages} ({pagination.count} records)
                        </span>
                        <div className="flex gap-3">
                            <MagneticButton
                                disabled={pagination.current_page <= 1}
                                onClick={() => setPage(prev => prev - 1)}
                                className="flex items-center justify-center w-10 h-10 bg-card border border-card rounded-full text-textMain hover:border-primary hover:text-primary transition-all duration-300 hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] active:scale-[0.95] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-[3px]" />
                            </MagneticButton>
                            <MagneticButton
                                disabled={pagination.current_page >= pagination.num_pages}
                                onClick={() => setPage(prev => prev + 1)}
                                className="flex items-center justify-center w-10 h-10 bg-card border border-card rounded-full text-textMain hover:border-primary hover:text-primary transition-all duration-300 hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] active:scale-[0.95] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-[3px]" />
                            </MagneticButton>
                        </div>
                    </div>
                )}
            </div>

            <SaleForm
                isOpen={isFormOpen}
                onClose={closeSaleForm}
                onSubmit={handleCreateOrUpdate}
                initialData={currentSale}
                createdSale={createdSale}
                createMessage={createMessage}
                onGenerateCreatedSaleSlip={handleGenerateCreatedSaleSlip}
            />

            <SaleSlipModal
                isOpen={saleSlipOpen}
                sale={selectedSlipSale}
                onClose={() => {
                    setSaleSlipOpen(false);
                    setSelectedSlipSale(null);
                }}
            />
            <ConfirmModal
                isOpen={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                onConfirm={() => handleDelete(confirmDelete.id)}
                title="Delete Sale?"
                message="This will permanently remove the sale record and reverse the inventory change. This cannot be undone."
                confirmLabel="Delete Sale"
            />
        </div>
    );
};

export default SalesList;
