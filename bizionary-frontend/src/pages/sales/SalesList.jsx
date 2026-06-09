import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, Receipt, Upload, X, CheckCircle2, AlertCircle, FileText, ChevronDown } from 'lucide-react';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import SaleForm from './SaleForm';
import SalesCharts from './SalesCharts';
import SaleSlipModal from './SaleSlipModal';
import { PRODUCT_CATEGORIES, normalizeProductCategory } from '../../utils/productCategories';

const SalesList = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
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

    const categoryOptions = useMemo(() => {
        const dynamicCategories = sales
            .map((item) => String(item.product_category || '').trim())
            .filter(Boolean)
            .map((cat) => normalizeProductCategory(cat) || cat);

        const merged = [...PRODUCT_CATEGORIES.map((item) => item.value), ...dynamicCategories];
        return Array.from(new Set(merged)).map((value) => {
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

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const res = await api.get('sales/');
            let data = res.data.data || res.data;
            // Ensure date sorting or transformations if needed
            setSales(data);
        } catch (error) {
            console.warn('Failed to fetch sales from backend.');
            setSales([]);
        } finally {
            setLoading(false);
        }
    };

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

        await fetchSales();
        // Dispatch event to notify all listeners (especially AI Insights Widget) of sale creation
        window.dispatchEvent(new CustomEvent('saleCreated', { detail: { timestamp: Date.now() } }));
        emitInventoryRefresh('sales', currentSale ? 'updated' : 'created');
        setCurrentSale(null);
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`sales/${id}/`);
            await fetchSales();
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
            setBulkError(err.response?.data || { error: 'Upload failed. Please try again.' });
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

    const filteredSales = sales.filter(s =>
        (
            (s.product_name && s.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.customer_name && s.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            s.id.toString().includes(searchTerm)
        ) &&
        (
            categoryFilter === 'ALL' || 
            (normalizeProductCategory(s.product_category) || s.product_category) === categoryFilter
        )
    );

    return (
        <div className="space-y-6">

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-surface shadow-sm text-textMain placeholder-textMuted"
                        placeholder="Search by product, customer, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <Filter className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full sm:w-44 pl-9 pr-3 py-2 border border-gray-100 rounded-xl text-sm bg-surface text-textMain outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="ALL">All Categories</option>
                            {categoryOptions.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={openBulkModal}
                        className="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-textMain rounded-xl hover:border-primary hover:text-primary text-sm font-bold transition-all shadow-sm w-full sm:w-auto"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Upload
                    </button>
                    <button
                        onClick={openAddForm}
                        className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primaryDark text-sm font-bold transition-all shadow-md shadow-primary/20 w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Sale
                    </button>
                </div>
            </div>

            {/* ── BULK UPLOAD MODAL ─────────────────────────────── */}
            {bulkModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl"><Upload className="w-5 h-5 text-primary" /></div>
                                <div>
                                    <h2 className="text-base font-bold text-textMain">Bulk Upload Sales</h2>
                                    <p className="text-xs text-textMuted">Upload CSV or paste JSON — all KPIs update automatically</p>
                                </div>
                            </div>
                            <button onClick={closeBulkModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                            {/* Tab switcher */}
                            {!bulkResult && (
                                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                                    <button onClick={() => setBulkTab('csv')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${bulkTab === 'csv' ? 'bg-white text-primary shadow-sm' : 'text-textMuted'}`}>CSV File</button>
                                    <button onClick={() => setBulkTab('json')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${bulkTab === 'json' ? 'bg-white text-primary shadow-sm' : 'text-textMuted'}`}>JSON Paste</button>
                                </div>
                            )}

                            {/* Success result */}
                            {bulkResult && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="font-bold text-emerald-800">{bulkResult.message}</p>
                                            <p className="text-xs text-emerald-700 mt-0.5">
                                                Revenue added: Rs. {bulkResult.summary?.total_revenue?.toLocaleString()} &nbsp;|&nbsp;
                                                Dates: {bulkResult.summary?.date_range?.from} → {bulkResult.summary?.date_range?.to}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 sticky top-0"><tr>
                                                <th className="px-3 py-2 text-left text-textMuted font-semibold">Row</th>
                                                <th className="px-3 py-2 text-left text-textMuted font-semibold">Sale ID</th>
                                                <th className="px-3 py-2 text-left text-textMuted font-semibold">Product</th>
                                                <th className="px-3 py-2 text-center text-textMuted font-semibold">Qty</th>
                                                <th className="px-3 py-2 text-right text-textMuted font-semibold">Total</th>
                                                <th className="px-3 py-2 text-left text-textMuted font-semibold">Date</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {bulkResult.created_sales?.map(s => (
                                                    <tr key={s.sale_id} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 text-textMuted">#{s.row}</td>
                                                        <td className="px-3 py-2 font-mono text-primary">#SL-{String(s.sale_id).padStart(4,'0')}</td>
                                                        <td className="px-3 py-2 font-medium text-textMain">{s.product}</td>
                                                        <td className="px-3 py-2 text-center">{s.qty}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-emerald-700">Rs. {s.total?.toLocaleString()}</td>
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
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-rose-800 text-sm">{bulkError.error}</p>
                                            {bulkError.validation_errors && (
                                                <ul className="mt-2 space-y-0.5">
                                                    {bulkError.validation_errors.map((e, i) => <li key={i} className="text-xs text-rose-700">• {e}</li>)}
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
                                            bulkDragging ? 'border-primary bg-primary/5' : bulkFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => setBulkFile(e.target.files[0])} />
                                        {bulkFile ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <FileText className="w-6 h-6 text-emerald-600" />
                                                <div className="text-left">
                                                    <p className="font-bold text-emerald-800 text-sm">{bulkFile.name}</p>
                                                    <p className="text-xs text-emerald-600">{(bulkFile.size / 1024).toFixed(1)} KB — Ready to upload</p>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setBulkFile(null); }} className="ml-auto p-1 hover:bg-emerald-100 rounded-lg"><X className="w-3.5 h-3.5 text-emerald-600" /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="font-semibold text-textMain text-sm">Drop your CSV here or click to browse</p>
                                                <p className="text-xs text-textMuted mt-1">Required columns: <code className="bg-gray-100 px-1 rounded">product_id</code> or <code className="bg-gray-100 px-1 rounded">product_code</code>, <code className="bg-gray-100 px-1 rounded">quantity_sold</code>, <code className="bg-gray-100 px-1 rounded">unit_price</code>, <code className="bg-gray-100 px-1 rounded">sale_date</code></p>
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
                                        className="w-full font-mono text-xs border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-primary outline-none resize-none bg-gray-50"
                                    />
                                    <p className="text-xs text-textMuted mt-1">Paste a JSON array of sale objects or <code>{'{ "sales": [...] }'}</code></p>
                                </div>
                            )}
                        </div>

                        {/* Modal footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                            {bulkResult ? (
                                <>
                                    <p className="text-xs text-textMuted">{bulkResult.summary?.total_records_created} records uploaded. KPIs refreshed.</p>
                                    <button onClick={closeBulkModal} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryDark">Done</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={closeBulkModal} className="px-4 py-2 text-textMuted text-sm font-medium hover:text-textMain">Cancel</button>
                                    <button
                                        onClick={handleBulkUpload}
                                        disabled={bulkUploading || (bulkTab === 'csv' && !bulkFile) || (bulkTab === 'json' && !bulkJson.trim())}
                                        className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primaryDark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {bulkUploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {bulkUploading ? 'Uploading...' : 'Upload & Save'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="bg-surface p-4 rounded-2xl border border-gray-100 shadow-sm">
                <SalesCharts />
            </div>

            {/* Main Table */}
            <div className="bg-surface rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-textMuted text-xs uppercase tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Ref ID</th>
                                    <th className="px-6 py-4 font-semibold">Date</th>
                                    <th className="px-6 py-4 font-semibold">Customer</th>
                                    <th className="px-6 py-4 font-semibold">Category</th>
                                    <th className="px-6 py-4 font-semibold">Product</th>
                                    <th className="px-6 py-4 font-semibold text-center">Sold Qty</th>
                                    <th className="px-6 py-4 font-semibold text-center">Current Stock</th>
                                    <th className="px-6 py-4 font-semibold text-right">Total Price</th>
                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSales.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
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
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-100">
                                                {s.quantity_sold}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs font-semibold text-textMuted">
                                            {s.remaining_stock ?? 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-success text-right">{formatPKR(s.total_price)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => handleViewSlip(s)}
                                                    className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-amber-600 bg-gray-50 hover:bg-amber-50 rounded-lg transition-colors border border-gray-100 hover:border-amber-100"
                                                    title="View Slip"
                                                >
                                                    <Receipt className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditForm(s)}
                                                    className="text-gray-400 hover:text-primary transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(s.id)}
                                                    className="text-gray-400 hover:text-danger hover:fill-danger/10 transition-colors"
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
                                        <td colSpan="9" className="px-6 py-12 text-center text-textMuted">
                                            <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                            <p>No sales records found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
        </div>
    );
};

export default SalesList;
